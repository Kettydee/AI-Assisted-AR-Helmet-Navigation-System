import React, { useCallback, useState } from "react";
import { Linking, Pressable, StyleSheet, Switch, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as Speech from "expo-speech";
import { AppText, Banner, Card, ListRow, Screen, SectionTitle } from "../../components/ui";
import { useSettings } from "../../hooks/useSettings";
import { loadContacts } from "../../sos/contactsStore";
import { checkForUpdate, currentAppVersion, presentUpdate } from "../../update/UpdateGate";
import { kmhToMph } from "../../nav/geo";
import { colors, radius, spacing } from "../../theme";

const SPEED_STEPS_KMH = [0, 40, 50, 60, 70, 80, 90, 100, 120];
const REPO_URL = "https://github.com/Kettydee/AI-Assisted-AR-Helmet-Navigation-System";

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, update } = useSettings();
  const [contactCount, setContactCount] = useState(0);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadContacts()
        .then((c) => setContactCount(c.length))
        .catch(() => undefined);
    }, []),
  );

  const speedLabel = (kmh: number) =>
    kmh === 0 ? "Off" : settings.units === "imperial" ? `${Math.round(kmhToMph(kmh))} mph` : `${kmh} km/h`;

  const runUpdateCheck = async () => {
    setUpdateStatus("Checking…");
    const found = await checkForUpdate();
    if (found) {
      setUpdateStatus(null);
      presentUpdate(found);
    } else {
      setUpdateStatus("You're on the latest version (or you're offline).");
    }
  };

  return (
    <Screen edges={["top"]}>
      <AppText variant="title" weight="extrabold" style={styles.title}>
        Settings
      </AppText>

      <SectionTitle>Safety</SectionTitle>
      <ListRow
        icon="people"
        iconColor={contactCount ? colors.accent : colors.warning}
        title="Emergency contacts"
        subtitle={contactCount ? `${contactCount} saved` : "None saved - add one now"}
        onPress={() => router.push("/contacts")}
      />

      <SectionTitle>Riding</SectionTitle>
      <Card>
        <AppText weight="semibold">Units</AppText>
        <Segmented
          options={[
            { key: "metric", label: "Kilometres" },
            { key: "imperial", label: "Miles" },
          ]}
          value={settings.units}
          onChange={(units) => update({ units })}
        />
        <AppText weight="semibold">Speed warning</AppText>
        <AppText variant="small" color={colors.textMuted}>
          Voice + vibration when you go faster than this during a ride.
        </AppText>
        <View style={styles.speedGrid}>
          {SPEED_STEPS_KMH.map((kmh) => (
            <Pressable
              key={kmh}
              accessibilityRole="button"
              accessibilityState={{ selected: settings.speedLimitKmh === kmh }}
              onPress={() => update({ speedLimitKmh: kmh })}
              style={[styles.speedChip, settings.speedLimitKmh === kmh && styles.chipActive]}
            >
              <AppText
                variant="small"
                weight="semibold"
                color={settings.speedLimitKmh === kmh ? colors.onAccent : colors.text}
              >
                {speedLabel(kmh)}
              </AppText>
            </Pressable>
          ))}
        </View>
      </Card>

      <ListRow
        icon="volume-high"
        title="Voice prompts"
        subtitle="Spoken turns, hazards and alerts"
        showChevron={false}
        right={
          <Switch
            value={settings.voicePrompts}
            onValueChange={(voicePrompts) => {
              update({ voicePrompts });
              if (voicePrompts) Speech.speak("Voice prompts on.");
            }}
            trackColor={{ true: colors.accent, false: colors.border }}
            thumbColor="#ffffff"
          />
        }
      />

      <SectionTitle>Helmet</SectionTitle>
      <ListRow
        icon="refresh"
        title="Auto-reconnect"
        subtitle="Reconnect to your last helmet at launch"
        showChevron={false}
        right={
          <Switch
            value={settings.autoReconnect}
            onValueChange={(autoReconnect) => update({ autoReconnect })}
            trackColor={{ true: colors.accent, false: colors.border }}
            thumbColor="#ffffff"
          />
        }
      />
      <ListRow icon="code-slash" title="Developer tools" subtitle="Test arrows and raw BLE packets" onPress={() => router.push("/developer")} />
      <ListRow
        icon="call"
        iconColor={colors.textFaint}
        title="Incoming call alerts"
        subtitle="Coming soon - needs native phone integration"
        showChevron={false}
      />

      <SectionTitle>About</SectionTitle>
      <ListRow icon="cloud-download" title="Check for updates" subtitle={`Installed version ${currentAppVersion()}`} onPress={() => void runUpdateCheck()} />
      {updateStatus ? <Banner tone="info" title={updateStatus} /> : null}
      <ListRow icon="logo-github" title="Project on GitHub" onPress={() => void Linking.openURL(REPO_URL)} />
      <ListRow icon="play-circle" title="Replay setup guide" onPress={() => router.push("/onboarding")} />
    </Screen>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => (
        <Pressable
          key={o.key}
          accessibilityRole="button"
          accessibilityState={{ selected: value === o.key }}
          onPress={() => onChange(o.key)}
          style={[styles.segment, value === o.key && styles.chipActive]}
        >
          <AppText weight="semibold" color={value === o.key ? colors.onAccent : colors.text}>
            {o.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.sm,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  speedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  speedChip: {
    minHeight: 44,
    minWidth: 72,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
});
