import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Linking, Platform, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { State as BleState } from "react-native-ble-plx";
import { AppText, Banner, Button, Card, EmptyState, ListRow, Screen, SectionTitle, SignalBars, StatusBadge } from "../../components/ui";
import { STATUS_META } from "../../components/statusMeta";
import { useHelmetConnection } from "../../hooks/useHelmetConnection";
import { useSettings } from "../../hooks/useSettings";
import type { ScannedHelmet, ScanOutcome } from "../../ble/HelmetConnection";
import { colors, spacing } from "../../theme";

export default function HelmetScreen() {
  const router = useRouter();
  const { connection, status, lastError } = useHelmetConnection();
  const { settings, update } = useSettings();
  const [devices, setDevices] = useState<ScannedHelmet[]>([]);
  const [bluetoothState, setBluetoothState] = useState<BleState | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [scanOutcome, setScanOutcome] = useState<ScanOutcome | null>(null);
  const [scanFinished, setScanFinished] = useState(false);

  useEffect(() => connection.onBluetoothStateChange(setBluetoothState), [connection]);

  const startScan = useCallback(async () => {
    setDevices([]);
    setScanFinished(false);
    const outcome = await connection.scan(
      (device) =>
        setDevices((prev) => {
          const i = prev.findIndex((d) => d.id === device.id);
          if (i === -1) return [...prev, device];
          const next = prev.slice();
          next[i] = device; // keep RSSI fresh
          return next;
        }),
      { onFinished: () => setScanFinished(true) },
    );
    setScanOutcome(outcome);
  }, [connection]);

  // Scan while this tab is visible and nothing is connected. "Unauthorized"
  // (Android 12+ before permission is granted) also scans: scan() asks for
  // the permission first.
  useFocusEffect(
    useCallback(() => {
      const usable = bluetoothState === BleState.PoweredOn || bluetoothState === BleState.Unauthorized;
      if (usable && connection.status === "disconnected") {
        void startScan();
      }
      return () => connection.stopScan();
    }, [bluetoothState, connection, startScan]),
  );

  const handleConnect = async (device: ScannedHelmet) => {
    setConnectingId(device.id);
    try {
      await connection.connect(device.id);
      update({ lastDeviceId: device.id, lastDeviceName: device.name });
    } catch {
      // lastError already holds a readable reason.
    } finally {
      setConnectingId(null);
    }
  };

  const meta = STATUS_META[status];
  const blocked = scanOutcome === "blocked";
  const denied = scanOutcome === "denied";
  const btOff = bluetoothState === BleState.PoweredOff || bluetoothState === BleState.Resetting;
  const unsupported = bluetoothState === BleState.Unsupported;

  return (
    <Screen edges={["top"]}>
      <View style={styles.header}>
        <AppText variant="title" weight="extrabold">
          Helmet
        </AppText>
        <StatusBadge label={meta.label} color={meta.color} />
      </View>

      {status === "connected" || status === "reconnecting" ? (
        <Card style={styles.connectedCard}>
          <MaterialCommunityIcons
            name="racing-helmet"
            size={72}
            color={status === "connected" ? colors.success : colors.warning}
          />
          <AppText variant="heading" weight="bold" align="center">
            {settings.lastDeviceName ?? "AR-Helmet-Nav"}
          </AppText>
          <AppText variant="small" color={colors.textMuted} align="center">
            {status === "connected"
              ? "Connected. Navigation arrows, call alerts and crash detection are active."
              : "Connection lost. Reconnecting automatically - keep the helmet nearby."}
          </AppText>
          <Button label="Disconnect" variant="secondary" icon="close-circle" onPress={() => void connection.disconnect()} />
        </Card>
      ) : unsupported ? (
        <Banner tone="danger" title="Bluetooth LE not supported" message="This phone can't connect to the helmet." />
      ) : btOff ? (
        <Banner
          tone="warning"
          title="Bluetooth is off"
          message="Turn on Bluetooth to find your helmet."
          action={
            Platform.OS === "android" ? (
              <Button label="Turn on Bluetooth" compact icon="bluetooth" onPress={() => void connection.enableBluetooth()} />
            ) : undefined
          }
        />
      ) : blocked ? (
        <Banner
          tone="danger"
          title="Permission blocked"
          message={'Bluetooth access was denied. Open Settings > Permissions and allow "Nearby devices" and "Location".'}
          action={<Button label="Open app settings" compact icon="open" onPress={() => void Linking.openSettings()} />}
        />
      ) : denied ? (
        <Banner
          tone="warning"
          title="Permission needed"
          message="The app needs Bluetooth (Nearby devices) and Location access to find your helmet."
          action={<Button label="Grant permission" compact icon="key" onPress={() => void startScan()} />}
        />
      ) : (
        <>
          {lastError ? <Banner tone="danger" title="Something went wrong" message={lastError.message} /> : null}
          <Card style={styles.scanCard}>
            <Radar active={status === "scanning"} />
            <AppText weight="semibold" align="center">
              {status === "scanning"
                ? "Looking for your helmet…"
                : status === "connecting"
                  ? "Connecting…"
                  : scanFinished
                    ? devices.length
                      ? "Tap your helmet to connect"
                      : "No helmet found"
                    : "Ready to scan"}
            </AppText>
            <AppText variant="small" color={colors.textMuted} align="center">
              Switch the helmet on and keep it within a couple of metres of your phone.
            </AppText>
            {status !== "scanning" && status !== "connecting" ? (
              <Button label={scanFinished ? "Scan again" : "Scan for helmet"} icon="search" onPress={() => void startScan()} />
            ) : null}
          </Card>

          {devices.length > 0 ? <SectionTitle>Nearby helmets</SectionTitle> : null}
          {devices.map((d) => (
            <ListRow
              key={d.id}
              icon="hardware-chip"
              title={d.name ?? "AR-Helmet-Nav"}
              subtitle={d.id === settings.lastDeviceId ? "Your last helmet" : d.id}
              onPress={connectingId ? undefined : () => void handleConnect(d)}
              showChevron={false}
              right={connectingId === d.id ? <ActivityIndicator color={colors.accent} /> : <SignalBars rssi={d.rssi} />}
            />
          ))}
          {scanFinished && devices.length === 0 ? (
            <EmptyState
              icon="help-buoy"
              title="Troubleshooting"
              message="Make sure the helmet's light is on, it isn't connected to another phone, and Bluetooth + Location are on."
            />
          ) : null}
        </>
      )}

      <SectionTitle>More</SectionTitle>
      <ListRow
        icon="refresh"
        title="Auto-reconnect"
        subtitle={settings.autoReconnect ? "On - reconnects to your last helmet at launch" : "Off"}
        onPress={() => update({ autoReconnect: !settings.autoReconnect })}
        showChevron={false}
        right={
          <AppText weight="bold" color={settings.autoReconnect ? colors.success : colors.textFaint}>
            {settings.autoReconnect ? "ON" : "OFF"}
          </AppText>
        }
      />
      <ListRow icon="code-slash" title="Developer tools" subtitle="Send test arrows, view raw packets" onPress={() => router.push("/developer")} />
    </Screen>
  );
}

function Radar({ active }: { active: boolean }) {
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      ring.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(ring, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [active, ring]);

  return (
    <View style={styles.radar}>
      <Animated.View
        style={[
          styles.radarRing,
          {
            opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
            transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] }) }],
          },
        ]}
      />
      <View style={styles.radarCore}>
        <MaterialCommunityIcons name="racing-helmet" size={40} color={colors.accent} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  connectedCard: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  scanCard: {
    alignItems: "stretch",
    paddingVertical: spacing.xl,
  },
  radar: {
    alignSelf: "center",
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  radarRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  radarCore: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accentDim,
    alignItems: "center",
    justifyContent: "center",
  },
});
