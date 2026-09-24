import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHelmetConnection } from "../hooks/useHelmetConnection";
import { NavigationDirection } from "../protocol/navigationProtocol";
import { HazardEventType } from "../protocol/hazardProtocol";

const DIRECTIONS: { label: string; value: NavigationDirection }[] = [
  { label: "LEFT", value: NavigationDirection.LEFT },
  { label: "RIGHT", value: NavigationDirection.RIGHT },
  { label: "STRAIGHT", value: NavigationDirection.STRAIGHT },
  { label: "U-TURN", value: NavigationDirection.U_TURN },
  { label: "DESTINATION", value: NavigationDirection.DESTINATION },
];

const HAZARD_LABEL: Record<HazardEventType, string> = {
  [HazardEventType.POTHOLE_BUMP]: "Pothole bump",
  [HazardEventType.CRASH_DETECTED]: "Crash detected",
  [HazardEventType.SOS_CANCELLED]: "SOS cancelled",
};

/**
 * Sends raw BLE packets to verify the link end to end. Not a real turn-by-
 * turn nav screen - this app has no routing engine (Google Maps/OSRM)
 * wired in yet; see README.md's Next section.
 */
export default function TestPanelScreen() {
  const { connection, status, lastHazardEvent } = useHelmetConnection();
  const [distance, setDistance] = useState(100);
  const [lastSent, setLastSent] = useState<string | null>(null);

  const disabled = status !== "connected";

  const send = async (direction: NavigationDirection, label: string) => {
    try {
      await connection.sendNavigation(direction, distance);
      setLastSent(`${label} @ ${distance}m`);
    } catch (error) {
      setLastSent(`Failed: ${(error as Error).message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {disabled ? <Text style={styles.warning}>Not connected - connect to a helmet first.</Text> : null}

      <Text style={styles.sectionTitle}>Send navigation packet</Text>
      <View style={styles.distanceRow}>
        <Text style={styles.distanceLabel}>Distance: {distance} m</Text>
        <View style={styles.distanceButtons}>
          <Pressable style={styles.stepButton} onPress={() => setDistance((d) => Math.max(0, d - 10))}>
            <Text style={styles.stepButtonText}>-10</Text>
          </Pressable>
          <Pressable style={styles.stepButton} onPress={() => setDistance((d) => d + 10)}>
            <Text style={styles.stepButtonText}>+10</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.grid}>
        {DIRECTIONS.map(({ label, value }) => (
          <Pressable
            key={label}
            style={[styles.gridButton, disabled && styles.gridButtonDisabled]}
            disabled={disabled}
            onPress={() => void send(value, label)}
          >
            <Text style={styles.gridButtonText}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {lastSent ? <Text style={styles.lastSent}>Last sent: {lastSent}</Text> : null}

      <Text style={styles.sectionTitle}>Last hazard event received</Text>
      {lastHazardEvent ? (
        <View style={styles.hazardCard}>
          <Text style={styles.hazardType}>{HAZARD_LABEL[lastHazardEvent.type] ?? "Unknown"}</Text>
          <Text style={styles.hazardMeta}>G-force: {lastHazardEvent.gForce.toFixed(2)}g</Text>
          <Text style={styles.hazardMeta}>
            {lastHazardEvent.hasGpsFix
              ? `${lastHazardEvent.lat.toFixed(6)}, ${lastHazardEvent.lon.toFixed(6)}`
              : "No GPS fix"}
          </Text>
        </View>
      ) : (
        <Text style={styles.message}>None yet.</Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  warning: {
    color: "#fbbf24",
    fontSize: 13,
    marginBottom: 4,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  distanceLabel: {
    color: "#e5e7eb",
    fontSize: 14,
  },
  distanceButtons: {
    flexDirection: "row",
    gap: 8,
  },
  stepButton: {
    backgroundColor: "#161f33",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  stepButtonText: {
    color: "#ffffff",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridButton: {
    backgroundColor: "#1d4ed8",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  gridButtonDisabled: {
    backgroundColor: "#1f2937",
  },
  gridButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  lastSent: {
    color: "#9ca3af",
    fontSize: 13,
  },
  hazardCard: {
    backgroundColor: "#161f33",
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  hazardType: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  hazardMeta: {
    color: "#9ca3af",
    fontSize: 13,
  },
  message: {
    color: "#9ca3af",
    fontSize: 14,
  },
});
