import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { Camera, useFrameOutput, type CameraDevice, type Frame } from "react-native-vision-camera";
import { useResizer } from "react-native-vision-camera-resizer";
import type { TfliteModel } from "react-native-fast-tflite";
import { scheduleOnRN } from "react-native-worklets";
import { AppText } from "../components/ui";
import { useHistory } from "../hooks/useHistory";
import { useSettings } from "../hooks/useSettings";
import { useSpeech } from "../hooks/useSpeech";
import { announcePothole, type AvoidanceDirection } from "../protocol/voicePrompts";
import { HazardEventType } from "../protocol/hazardProtocol";
import { colors, radius, spacing } from "../theme";
import { DEFAULT_POTHOLE_CONFIG, evaluateFrame, shouldAlert } from "./hazardLogic";
import type { ModelLayout } from "./modelSource";
import { decodeYoloOutput, nonMaxSuppression, unletterbox, type Detection } from "./yolo";

const IOU_THRESHOLD = 0.7; // bpi_inference.py --iou
const MAX_DETECTIONS = 20;
const BYTES_PER_VALUE: Record<ModelLayout["inputDataType"], number> = { float32: 4, float16: 2, uint8: 1, int8: 1 };
/** How long the "POTHOLE" banner stays up after the last confirmed frame. */
const BANNER_HOLD_MS = 1500;

const ARROW: Record<AvoidanceDirection, keyof typeof Ionicons.glyphMap> = {
  LEFT: "arrow-back",
  CENTER: "arrow-up",
  RIGHT: "arrow-forward",
};

interface Props {
  device: CameraDevice;
  model: TfliteModel;
  layout: ModelLayout;
  confThreshold: number;
  accelerated: boolean;
}

/**
 * Live camera + on-device YOLOv8 pothole detection.
 *
 * Camera thread (worklet): GPU-resize each frame to the model input
 * ('contain' = letterboxed, like Ultralytics), run TFLite, decode + NMS, and
 * post only the final boxes back. JS thread: lane/area gating, 2-of-3 frame
 * consensus and LEFT/CENTER/RIGHT avoidance (same rules as the Banana Pi
 * runner), then voice + haptic alert and a hazard-log entry with GPS.
 */
export function PotholeDetector({ device, model, layout, confThreshold, accelerated }: Props) {
  // Opt out of the React Compiler: onFrame is a worklet that runs on the camera
  // thread, and its closure must stay exactly what the worklets plugin captured.
  "use no memo";
  const { settings } = useSettings();
  const { addHazard } = useHistory();
  const speech = useSpeech();

  const { resizer, error: resizerError } = useResizer({
    width: layout.inputWidth,
    height: layout.inputHeight,
    channelOrder: "rgb",
    dataType: layout.inputDataType,
    scaleMode: "contain",
    pixelLayout: layout.pixelLayout,
  });

  const [detections, setDetections] = useState<Detection[]>([]);
  const [hazards, setHazards] = useState<Detection[]>([]);
  const [frameAspect, setFrameAspect] = useState(9 / 16);
  const [inferenceMs, setInferenceMs] = useState<number | null>(null);
  const [alert, setAlert] = useState<{ direction: AvoidanceDirection; at: number } | null>(null);
  const [loggedCount, setLoggedCount] = useState(0);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  const windowRef = useRef<boolean[]>([]);
  const lastAlertAt = useRef<number | null>(null);
  const position = useRef<Location.LocationObject | null>(null);
  const voiceRef = useRef(settings.voicePrompts);
  voiceRef.current = settings.voicePrompts;

  // Potholes are logged with where they were seen; keep a fix while the camera is open.
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    void (async () => {
      const perm = await Location.requestForegroundPermissionsAsync().catch(() => null);
      if (!perm?.granted || cancelled) return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5 },
        (loc) => {
          position.current = loc;
        },
      ).catch(() => null);
      if (cancelled) sub?.remove();
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  const onFrameResult = useCallback(
    (frameDetections: Detection[], aspect: number, ms: number) => {
      setDetections(frameDetections);
      setFrameAspect(aspect);
      setInferenceMs(ms);

      const verdict = evaluateFrame(frameDetections, windowRef.current, DEFAULT_POTHOLE_CONFIG);
      windowRef.current = verdict.window;
      setHazards(verdict.hazards);
      if (!verdict.confirmed) return;

      const now = Date.now();
      setAlert({ direction: verdict.confirmed.direction, at: now });
      if (!shouldAlert(now, lastAlertAt.current, DEFAULT_POTHOLE_CONFIG.alertCooldownMs)) return;
      lastAlertAt.current = now;

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      if (voiceRef.current) void announcePothole(speech, verdict.confirmed.direction);
      const fix = position.current;
      const fresh = fix !== null && now - fix.timestamp < 30_000;
      addHazard(
        {
          type: HazardEventType.POTHOLE_BUMP,
          gForce: 0,
          lat: fresh ? fix.coords.latitude : 0,
          lon: fresh ? fix.coords.longitude : 0,
          hasGpsFix: fresh,
        },
        "camera",
      );
      setLoggedCount((c) => c + 1);
    },
    [addHazard, speech],
  );

  // Drop the "POTHOLE AHEAD" banner once no frame has confirmed one for a moment.
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), BANNER_HOLD_MS);
    return () => clearTimeout(t);
  }, [alert]);

  const onPipelineError = useCallback((message: string) => setPipelineError(message), []);

  const { inputWidth, inputHeight, inputDataType, numAnchors } = layout;
  const expectedBytes = inputWidth * inputHeight * 3 * BYTES_PER_VALUE[inputDataType];

  const onFrame = useCallback(
    (frame: Frame) => {
      "worklet";
      if (resizer == null) {
        frame.dispose();
        return;
      }
      const started = Date.now();
      // The resizer applies the frame's orientation, so the model sees an upright image.
      const sideways = frame.orientation === "left" || frame.orientation === "right";
      const frameWidth = sideways ? frame.height : frame.width;
      const frameHeight = sideways ? frame.width : frame.height;
      try {
        const resized = resizer.resize(frame);
        try {
          const input = resized.getPixelBuffer();
          if (input.byteLength !== expectedBytes) {
            scheduleOnRN(
              onPipelineError,
              `Camera produced ${input.byteLength} bytes but the model wants ${expectedBytes}.`,
            );
            return;
          }
          const outputs = model.runSync([input]);
          const raw = new Float32Array(outputs[0]);
          const boxes = nonMaxSuppression(
            decodeYoloOutput(raw, numAnchors, confThreshold, inputWidth),
            IOU_THRESHOLD,
            MAX_DETECTIONS,
          ).map((d) => unletterbox(d, frameWidth, frameHeight));
          scheduleOnRN(onFrameResult, boxes, frameWidth / frameHeight, Date.now() - started);
        } finally {
          resized.dispose();
        }
      } catch (e) {
        scheduleOnRN(onPipelineError, `Detection failed: ${(e as Error).message}`);
      } finally {
        frame.dispose();
      }
    },
    [resizer, model, numAnchors, confThreshold, inputWidth, expectedBytes, onFrameResult, onPipelineError],
  );

  const frameOutput = useFrameOutput({
    // The GPU resizer needs YUV input on iOS; on Android it reads any format.
    pixelFormat: Platform.OS === "ios" ? "yuv" : "native",
    onFrame,
    onFrameDropped: () => undefined,
  });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox({ width, height });
  };

  // Fit the camera view to the frame's exact aspect so overlay boxes line up.
  const viewWidth = Math.min(box.width, box.height * frameAspect);
  const viewHeight = viewWidth / frameAspect;
  const laneMargin = DEFAULT_POTHOLE_CONFIG.laneMargin;
  const error = pipelineError ?? (resizerError ? `GPU resizer unavailable on this phone: ${resizerError.message}` : null);

  return (
    <View style={styles.fill}>
      <View style={styles.fill} onLayout={onLayout}>
        {viewWidth > 0 ? (
          <View style={{ width: viewWidth, height: viewHeight, alignSelf: "center" }}>
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive
              outputs={[frameOutput]}
              orientationSource="interface"
              resizeMode="cover"
            />
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <View style={[styles.laneLine, { left: `${laneMargin * 100}%` }]} />
              <View style={[styles.laneLine, { left: `${(1 - laneMargin) * 100}%` }]} />
              {detections.map((d, i) => {
                const isHazard = hazards.includes(d);
                return (
                  <View
                    key={i}
                    style={[
                      styles.box,
                      {
                        left: d.x1 * viewWidth,
                        top: d.y1 * viewHeight,
                        width: (d.x2 - d.x1) * viewWidth,
                        height: (d.y2 - d.y1) * viewHeight,
                        borderColor: isHazard ? colors.danger : colors.warning,
                      },
                    ]}
                  >
                    <AppText variant="caption" weight="bold" color={isHazard ? colors.danger : colors.warning}>
                      {Math.round(d.score * 100)}%
                    </AppText>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>

      <View style={[styles.status, alert ? styles.statusAlert : styles.statusClear]} accessibilityLiveRegion="polite">
        {alert ? (
          <>
            <Ionicons name={ARROW[alert.direction]} size={36} color={colors.text} />
            <View style={styles.flex}>
              <AppText variant="heading" weight="extrabold">
                POTHOLE AHEAD
              </AppText>
              <AppText variant="small">
                {alert.direction === "CENTER" ? "Hold your line" : `Clearest path: ${alert.direction.toLowerCase()}`}
              </AppText>
            </View>
          </>
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={32} color={colors.success} />
            <AppText variant="heading" weight="bold" style={styles.flex}>
              Path clear
            </AppText>
          </>
        )}
      </View>

      {error ? (
        <AppText variant="small" color={colors.danger} style={styles.footer}>
          {error}
        </AppText>
      ) : null}
      <AppText variant="caption" color={colors.textMuted} style={styles.footer}>
        {resizer == null && !resizerError ? "Starting camera…" : `${accelerated ? "GPU" : "CPU"}`}
        {inferenceMs !== null ? ` · ${inferenceMs} ms/frame` : ""} · threshold {Math.round(confThreshold * 100)}% · {loggedCount}{" "}
        logged this session
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    justifyContent: "center",
  },
  flex: {
    flex: 1,
  },
  laneLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.success + "88",
  },
  box: {
    position: "absolute",
    borderWidth: 3,
    borderRadius: radius.sm,
    padding: 2,
  },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    margin: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  statusAlert: {
    backgroundColor: colors.dangerStrong,
    borderColor: colors.danger,
  },
  statusClear: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  footer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
});
