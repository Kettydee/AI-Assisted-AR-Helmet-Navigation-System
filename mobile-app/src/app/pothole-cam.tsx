import React, { useState } from "react";
import { Linking, StyleSheet, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useKeepAwake } from "expo-keep-awake";
import { useCameraDevice, useCameraPermission } from "react-native-vision-camera";
import { AppText, Banner, Button, EmptyState, Screen, SectionTitle } from "../components/ui";
import { useSettings } from "../hooks/useSettings";
import { PotholeDetector } from "../pothole/PotholeDetector";
import { usePotholeModel } from "../pothole/usePotholeModel";
import { colors, fonts, radius, spacing } from "../theme";

/**
 * Pothole Cam: point the phone's back camera at the road (handlebar mount)
 * and get spoken/haptic warnings plus a hazard-log entry for each pothole.
 * Detection runs fully on the phone - no helmet or Banana Pi needed.
 */
export default function PotholeCamScreen() {
  useKeepAwake();
  const camera = useCameraPermission();
  const device = useCameraDevice("back");
  const { state, url, download } = usePotholeModel();

  if (!camera.hasPermission) {
    return (
      <Screen>
        <EmptyState
          icon="camera"
          title="Camera access needed"
          message="Pothole Cam watches the road through your phone's back camera. Video never leaves your phone."
        />
        {camera.canRequestPermission ? (
          <Button label="Allow camera" icon="camera" onPress={() => void camera.requestPermission()} />
        ) : (
          <Button label="Open settings" icon="settings" onPress={() => void Linking.openSettings()} />
        )}
      </Screen>
    );
  }

  if (state.status !== "ready") {
    return <ModelSetup status={state.status} message={state.status === "error" ? state.message : null} url={url} onDownload={download} />;
  }

  if (!device) {
    return (
      <Screen>
        <EmptyState icon="camera-reverse" title="No back camera" message="This phone doesn't report a back camera." />
      </Screen>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <PotholeDetector
        device={device}
        model={state.model}
        layout={state.layout}
        confThreshold={state.confThreshold}
        accelerated={state.accelerated}
      />
      <AppText variant="caption" color={colors.textFaint} style={styles.disclaimer}>
        The suggested side only reflects potholes the camera can see - always check traffic before moving over.
      </AppText>
    </SafeAreaView>
  );
}

function ModelSetup({
  status,
  message,
  url,
  onDownload,
}: {
  status: "loading" | "missing" | "downloading" | "error";
  message: string | null;
  url: string;
  onDownload: () => Promise<void>;
}) {
  const { settings, update } = useSettings();
  const [draft, setDraft] = useState(settings.potholeModelUrl ?? "");
  const busy = status === "loading" || status === "downloading";

  const saveUrl = () => {
    const trimmed = draft.trim();
    update({ potholeModelUrl: /^https?:\/\/\S+$/i.test(trimmed) ? trimmed : null });
  };

  return (
    <Screen>
      <EmptyState
        icon="cloud-download"
        title={status === "downloading" ? "Downloading model…" : status === "loading" ? "Loading model…" : "Get the pothole model"}
        message="Pothole Cam runs a YOLOv8 model on your phone. It's downloaded once (a few MB) and then works offline."
      />
      {message ? <Banner tone="danger" title="Model problem" message={message} /> : null}
      <Button label={status === "error" ? "Try again" : "Download model"} icon="download" loading={busy} disabled={busy} onPress={() => void onDownload()} />

      <SectionTitle>Model URL</SectionTitle>
      <AppText variant="small" color={colors.textMuted}>
        Leave empty to use the pothole.tflite attached to this project's "pothole-model" GitHub release.
      </AppText>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onEndEditing={saveUrl}
        placeholder={url}
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        style={styles.input}
        accessibilityLabel="Model URL"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  disclaimer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 14,
  },
});
