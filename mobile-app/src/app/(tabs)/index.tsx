import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText, Banner, Button, Card, Screen, SectionTitle, StatusBadge } from "../../components/ui";
import { HudPreview } from "../../components/HudPreview";
import { useHelmetConnection } from "../../hooks/useHelmetConnection";
import { useHistory } from "../../hooks/useHistory";
import { useRide } from "../../hooks/useRide";
import { useSettings } from "../../hooks/useSettings";
import { loadContacts } from "../../sos/contactsStore";
import { HAZARD_LABEL } from "../../history/records";
import { formatDistance, formatDuration } from "../../nav/geo";
import { colors, radius, spacing } from "../../theme";
import { STATUS_META } from "../../components/statusMeta";

function timeAgo(at: number): string {
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86_400) return `${Math.round(s / 3600)} h ago`;
  return new Date(at).toLocaleDateString();
}

export default function RideHome() {
  const router = useRouter();
  const { status, lastError, connection } = useHelmetConnection();
  const { settings } = useSettings();
  const { hazards, rides } = useHistory();
  const ride = useRide();
  const [contactCount, setContactCount] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadContacts()
        .then((c) => setContactCount(c.length))
        .catch(() => setContactCount(0));
    }, []),
  );

  // A free ride started from here opens the dashboard once GPS is running.
  const [freeRidePending, setFreeRidePending] = useState(false);
  useEffect(() => {
    if (freeRidePending && ride.phase !== "starting") {
      setFreeRidePending(false);
      if (ride.phase === "active") router.push("/ride");
    }
  }, [freeRidePending, ride.phase, router]);

  const meta = STATUS_META[status];
  const lastHazard = hazards[0];
  const lastRide = rides[0];

  return (
    <Screen edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="caption" weight="bold" color={colors.accent} style={styles.kicker}>
            AR HELMET NAV
          </AppText>
          <AppText variant="title" weight="extrabold">
            Ready to ride?
          </AppText>
        </View>
        <StatusBadge label={meta.label} color={meta.color} />
      </View>

      {lastError && status !== "connected" ? (
        <Banner
          tone="danger"
          title="Helmet problem"
          message={lastError.message}
          action={<Button label="Fix it" compact variant="secondary" onPress={() => router.push("/helmet")} />}
        />
      ) : null}

      {contactCount === 0 ? (
        <Banner
          tone="warning"
          title="No emergency contacts"
          message="Add at least one so crash alerts can reach someone."
          action={<Button label="Add contact" compact variant="secondary" onPress={() => router.push("/contacts")} />}
        />
      ) : null}

      <Card style={styles.helmetCard} onPress={() => router.push("/helmet")} accessibilityLabel={`Helmet: ${meta.label}`}>
        <View style={[styles.helmetIcon, { borderColor: meta.color }]}>
          <MaterialCommunityIcons name="racing-helmet" size={40} color={meta.color} />
        </View>
        <View style={styles.flex}>
          <AppText variant="heading" weight="bold">
            {settings.lastDeviceName ?? "AR-Helmet-Nav"}
          </AppText>
          <AppText variant="small" color={colors.textMuted}>
            {status === "connected"
              ? "Linked - arrows and alerts will show on your visor."
              : status === "reconnecting"
                ? "Signal lost - trying to reconnect."
                : "Tap to pair your helmet."}
          </AppText>
        </View>
        {status === "connected" ? (
          <Button label="Disconnect" compact variant="ghost" onPress={() => void connection.disconnect()} />
        ) : (
          <Ionicons name="chevron-forward" size={22} color={colors.textFaint} />
        )}
      </Card>

      {ride.phase === "active" ? (
        <Button label="Return to ride" icon="speedometer" onPress={() => router.push("/ride")} />
      ) : (
        <Button label="Start navigation" icon="navigate" onPress={() => router.push("/navigate")} />
      )}
      <Button
        label="Free ride (no route)"
        icon="speedometer"
        variant="secondary"
        loading={ride.phase === "starting"}
        onPress={() => {
          setFreeRidePending(true);
          void ride.startRide(null);
        }}
      />
      {ride.error ? <Banner tone="danger" title="Couldn't start ride" message={ride.error} /> : null}

      <SectionTitle>Visor preview</SectionTitle>
      <HudPreview
        direction={ride.hudFrame?.direction ?? null}
        distance={ride.hudFrame?.distance ?? 0}
        units={settings.units}
        live={status === "connected"}
      />

      <SectionTitle>At a glance</SectionTitle>
      <View style={styles.tiles}>
        <Tile
          icon="people"
          label="SOS contacts"
          value={contactCount === null ? "–" : String(contactCount)}
          tone={contactCount === 0 ? colors.warning : colors.accent}
          onPress={() => router.push("/contacts")}
        />
        <Tile
          icon="warning"
          label="Last hazard"
          value={lastHazard ? HAZARD_LABEL[lastHazard.type] : "None"}
          sub={lastHazard ? timeAgo(lastHazard.at) : undefined}
          tone={colors.warning}
          onPress={() => router.push("/hazards")}
        />
        <Tile
          icon="map"
          label="Last ride"
          value={lastRide ? formatDistance(lastRide.distanceMeters, settings.units) : "No rides"}
          sub={lastRide ? formatDuration((lastRide.endedAt - lastRide.startedAt) / 1000) : undefined}
          tone={colors.success}
          onPress={() => router.push("/history")}
        />
      </View>
    </Screen>
  );
}

function Tile({
  icon,
  label,
  value,
  sub,
  tone,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  sub?: string;
  tone: string;
  onPress: () => void;
}) {
  return (
    <Card style={styles.tile} onPress={onPress} accessibilityLabel={`${label}: ${value}`}>
      <Ionicons name={icon} size={22} color={tone} />
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
      <AppText weight="bold" numberOfLines={2}>
        {value}
      </AppText>
      {sub ? (
        <AppText variant="caption" color={colors.textFaint}>
          {sub}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  kicker: {
    letterSpacing: 2,
  },
  helmetCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  helmetIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  tiles: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  tile: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
});
