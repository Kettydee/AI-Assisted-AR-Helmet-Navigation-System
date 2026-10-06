import React, { useEffect, useRef, useState } from "react";
import { Alert, BackHandler, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText, Banner, Button, StatusBadge } from "../components/ui";
import { DIRECTION_ICON } from "../components/HudPreview";
import { STATUS_META } from "../components/statusMeta";
import { useRide } from "../hooks/useRide";
import { useSettings } from "../hooks/useSettings";
import { useHelmetConnection } from "../hooks/useHelmetConnection";
import { formatDistance, formatDuration, speedValue } from "../nav/geo";
import { colors, fonts, radius, spacing } from "../theme";

/** Full-screen riding dashboard: next turn, speed, trip stats. Glanceable, big type. */
export default function RideScreen() {
  const router = useRouter();
  const ride = useRide();
  const { settings } = useSettings();
  const { status } = useHelmetConnection();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (ride.phase === "idle") {
      if (router.canGoBack()) router.back();
      else router.replace("/");
    }
  }, [ride.phase, router]);

  const confirmEnd = () => {
    Alert.alert("End ride?", "Your ride will be saved to history.", [
      { text: "Keep riding", style: "cancel" },
      { text: "End ride", style: "destructive", onPress: ride.endRide },
    ]);
    return true;
  };
  const confirmEndRef = useRef(confirmEnd);
  confirmEndRef.current = confirmEnd;

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => confirmEndRef.current());
    return () => sub.remove();
  }, []);

  const step = ride.route && ride.progress ? ride.route.steps[ride.progress.nextStepIndex] : null;
  const elapsed = ride.startedAt ? (now - ride.startedAt) / 1000 : 0;
  const speed = speedValue(ride.speedMps, settings.units);
  const speedUnit = settings.units === "imperial" ? "mph" : "km/h";
  const eta =
    ride.route && ride.progress && ride.route.distance > 0
      ? new Date(now + (ride.route.duration * ride.progress.distanceRemaining) / ride.route.distance * 1000)
      : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <AppText weight="bold" numberOfLines={1} style={styles.flex}>
          {ride.destination ? `To ${ride.destination.name}` : "Free ride"}
        </AppText>
        <StatusBadge label={STATUS_META[status].label} color={STATUS_META[status].color} />
      </View>

      {ride.route && ride.progress ? (
        <View style={[styles.turnCard, ride.progress.arrived && styles.turnCardArrived]}>
          <MaterialCommunityIcons name={DIRECTION_ICON[ride.progress.direction]} size={96} color={colors.onAccent} />
          <View style={styles.flex}>
            {ride.progress.arrived ? (
              <AppText variant="title" weight="extrabold" color={colors.onAccent}>
                You've arrived
              </AppText>
            ) : (
              <>
                <AppText style={styles.turnDistance} color={colors.onAccent}>
                  {formatDistance(ride.progress.distanceToManeuver, settings.units)}
                </AppText>
                <AppText variant="heading" weight="bold" color={colors.onAccent} numberOfLines={2}>
                  {step?.instruction ?? ""}
                </AppText>
              </>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.freeCard}>
          <MaterialCommunityIcons name="motorbike" size={48} color={colors.accent} />
          <AppText color={colors.textMuted} align="center">
            Tracking your speed and distance. Start navigation from the Ride tab for turn arrows.
          </AppText>
        </View>
      )}

      {ride.rerouting ? <Banner tone="info" title="Recalculating route…" /> : null}
      {ride.progress?.offRoute && !ride.rerouting ? <Banner tone="warning" title="Off route" /> : null}
      {status !== "connected" ? (
        <Banner tone="warning" title="Helmet not connected" message="Arrows show here only until the helmet reconnects." />
      ) : null}

      <View style={[styles.speedo, ride.overspeed && styles.speedoOver]}>
        <AppText style={[styles.speed, ride.overspeed && { color: colors.danger }]}>{speed}</AppText>
        <AppText weight="semibold" color={ride.overspeed ? colors.danger : colors.textMuted}>
          {ride.overspeed ? `${speedUnit} · SLOW DOWN` : speedUnit}
        </AppText>
      </View>

      <View style={styles.stats}>
        <Stat label="Distance" value={formatDistance(ride.distanceTravelled, settings.units)} />
        <Stat label="Time" value={formatDuration(elapsed)} />
        {ride.progress ? (
          <Stat label="Remaining" value={formatDistance(ride.progress.distanceRemaining, settings.units)} />
        ) : (
          <Stat label="Top speed" value={`${speedValue(ride.maxSpeedMps, settings.units)}`} />
        )}
        {eta ? <Stat label="ETA" value={eta.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} /> : null}
      </View>

      <Button label="End ride" icon="stop-circle" variant="danger" onPress={confirmEnd} style={styles.end} />
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
      <AppText variant="heading" weight="bold">
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  turnCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  turnCardArrived: {
    backgroundColor: colors.success,
  },
  turnDistance: {
    fontFamily: fonts.extrabold,
    fontSize: 44,
    lineHeight: 52,
  },
  freeCard: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  speedo: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 160,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  speedoOver: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerDim,
  },
  speed: {
    fontFamily: fonts.extrabold,
    fontSize: 96,
    lineHeight: 108,
    color: colors.text,
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  stat: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  end: {
    marginTop: spacing.sm,
  },
});
