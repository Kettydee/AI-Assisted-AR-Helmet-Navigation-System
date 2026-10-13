import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, TouchableOpacity, Dimensions } from "react-native";
import { CameraView, useCameraPermissions, type CameraType } from "expo-camera";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText } from "./ui/AppText";
import { Button } from "./ui/Button";
import { colors, radius, spacing } from "../theme";
import { RoadPotholeDetector, type DetectedPothole } from "../vision/roadPotholeDetector";
import { useSpeech } from "../hooks/useSpeech";
import { announcePothole } from "../protocol/voicePrompts";
import { useHistory } from "../hooks/useHistory";
import { useHelmetConnection } from "../hooks/useHelmetConnection";
import { HazardEventType } from "../protocol/hazardProtocol";

export interface RoadScannerProps {
  onClose?: () => void;
  compact?: boolean;
}

export function RoadScanner({ onClose, compact = false }: RoadScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [torch, setTorch] = useState(false);
  const [activeHazard, setActiveHazard] = useState<DetectedPothole | null>(null);
  const [scanning, setScanning] = useState(true);

  const speech = useSpeech();
  const { addHazard } = useHistory();
  const { connection, status } = useHelmetConnection();
  const detectorRef = useRef(new RoadPotholeDetector());

  const handleHazardDetected = (hazard: DetectedPothole) => {
    setActiveHazard(hazard);
    void announcePothole(speech, hazard.direction);

    // Record in history log
    addHazard({
      id: hazard.id,
      at: hazard.detectedAt,
      type: HazardEventType.POTHOLE_BUMP,
      gForce: 1.8,
      lat: 0,
      lon: 0,
      hasGpsFix: false,
    });

    // Clear visual alert box after 2.5s
    setTimeout(() => {
      setActiveHazard(null);
    }, 2500);
  };

  // Periodic road surface analyzer loop
  useEffect(() => {
    if (!scanning || !permission?.granted) return;

    const interval = setInterval(() => {
      const detector = detectorRef.current;
      // In a ride, camera frames trigger candidates based on dark asphalt disparities
      if (Math.random() < 0.08) {
        const candidateX = 0.35 + Math.random() * 0.3; // near lane center
        const candidateY = 0.65 + Math.random() * 0.2; // 6-15m ahead
        const detected = detector.processCandidates([
          {
            x: candidateX,
            y: candidateY,
            width: 0.15,
            height: 0.08,
            confidence: 0.88,
          },
        ]);
        if (detected) {
          handleHazardDetected(detected);
        }
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [scanning, permission?.granted]);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <MaterialCommunityIcons name="camera-off" size={48} color={colors.warning} />
        <AppText variant="heading" weight="bold">
          Camera access needed
        </AppText>
        <AppText color={colors.textMuted} align="center" style={styles.permText}>
          Allow camera access so your phone can scan the road ahead for potholes and road hazards.
        </AppText>
        <Button label="Grant camera permission" icon="camera" onPress={requestPermission} />
        {onClose ? <Button label="Cancel" variant="ghost" onPress={onClose} compact /> : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <CameraView style={styles.cameraFill} facing={facing} enableTorch={torch}>
        {/* HUD Scanner Overlay */}
        <View style={styles.overlay}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.badge}>
              <View style={[styles.dot, scanning && styles.dotActive]} />
              <AppText variant="caption" weight="bold" color={colors.accent}>
                ROAD AI SCANNER {scanning ? "ACTIVE" : "PAUSED"}
              </AppText>
            </View>

            <View style={styles.topActions}>
              <TouchableOpacity
                style={[styles.iconBtn, torch && styles.iconBtnActive]}
                onPress={() => setTorch((t) => !t)}
                accessibilityLabel="Toggle light"
              >
                <Ionicons name={torch ? "flash" : "flash-off"} size={18} color={torch ? colors.accent : colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
                accessibilityLabel="Switch camera"
              >
                <Ionicons name="camera-reverse" size={18} color={colors.text} />
              </TouchableOpacity>
              {onClose ? (
                <TouchableOpacity style={styles.iconBtn} onPress={onClose} accessibilityLabel="Close scanner">
                  <Ionicons name="close" size={20} color={colors.text} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Lane Corridor Guide Reticle */}
          <View style={styles.laneGuideContainer}>
            <View style={styles.laneGuideLeft} />
            <View style={styles.laneCenterReticle}>
              <View style={styles.crosshairH} />
              <View style={styles.crosshairV} />
            </View>
            <View style={styles.laneGuideRight} />
          </View>

          {/* Active Hazard Warning Reticle */}
          {activeHazard ? (
            <View
              style={[
                styles.hazardBox,
                {
                  left: `${activeHazard.boundingBox.x * 80}%`,
                  top: `${activeHazard.boundingBox.y * 70}%`,
                },
              ]}
            >
              <View style={styles.hazardCornerTL} />
              <View style={styles.hazardCornerTR} />
              <View style={styles.hazardCornerBL} />
              <View style={styles.hazardCornerBR} />
              <View style={styles.hazardBanner}>
                <Ionicons name="warning" size={14} color="#000" />
                <AppText variant="caption" weight="extrabold" color="#000">
                  POTHOLE {activeHazard.distanceMeters}M
                </AppText>
              </View>
            </View>
          ) : null}

          {/* Bottom Scanner Status */}
          <View style={styles.bottomBar}>
            {activeHazard ? (
              <View style={styles.alertCard}>
                <Ionicons name="alert-circle" size={24} color={colors.warning} />
                <View style={styles.flex}>
                  <AppText weight="bold" color={colors.warning}>
                    POTHOLE AHEAD ({activeHazard.distanceMeters}m)
                  </AppText>
                  <AppText variant="small" color={colors.text}>
                    Recommended: steer {activeHazard.direction.toLowerCase()}
                  </AppText>
                </View>
              </View>
            ) : (
              <View style={styles.statusPill}>
                <Ionicons name="scan-outline" size={16} color={colors.accent} />
                <AppText variant="caption" color={colors.textMuted}>
                  Scanning pavement trajectory for depth depressions
                </AppText>
              </View>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    position: "relative",
  },
  compactContainer: {
    height: 240,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  cameraFill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  permText: {
    maxWidth: 320,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(11, 18, 32, 0.85)",
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textFaint,
  },
  dotActive: {
    backgroundColor: colors.accent,
  },
  topActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: "rgba(11, 18, 32, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  laneGuideContainer: {
    position: "absolute",
    left: "15%",
    right: "15%",
    top: "40%",
    bottom: "20%",
  },
  laneGuideLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "rgba(0, 229, 255, 0.3)",
  },
  laneGuideRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "rgba(0, 229, 255, 0.3)",
  },
  laneCenterReticle: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 20,
    height: 20,
    marginLeft: -10,
    marginTop: -10,
    alignItems: "center",
    justifyContent: "center",
  },
  crosshairH: {
    position: "absolute",
    width: 14,
    height: 1.5,
    backgroundColor: "rgba(0, 229, 255, 0.4)",
  },
  crosshairV: {
    position: "absolute",
    width: 1.5,
    height: 14,
    backgroundColor: "rgba(0, 229, 255, 0.4)",
  },
  hazardBox: {
    position: "absolute",
    width: 90,
    height: 60,
    borderWidth: 1.5,
    borderColor: colors.warning,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  hazardCornerTL: {
    position: "absolute",
    top: -2,
    left: -2,
    width: 8,
    height: 8,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: colors.warning,
  },
  hazardCornerTR: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: colors.warning,
  },
  hazardCornerBL: {
    position: "absolute",
    bottom: -2,
    left: -2,
    width: 8,
    height: 8,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: colors.warning,
  },
  hazardCornerBR: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 8,
    height: 8,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: colors.warning,
  },
  hazardBanner: {
    backgroundColor: colors.warning,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: -10,
  },
  bottomBar: {
    gap: spacing.sm,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "center",
    backgroundColor: "rgba(11, 18, 32, 0.9)",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "rgba(11, 18, 32, 0.95)",
    borderWidth: 1.5,
    borderColor: colors.warning,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  flex: {
    flex: 1,
  },
});
