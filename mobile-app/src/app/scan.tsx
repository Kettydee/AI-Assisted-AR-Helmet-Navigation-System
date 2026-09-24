import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { State as BleState } from "react-native-ble-plx";
import { useHelmetConnection } from "../hooks/useHelmetConnection";
import type { ScannedHelmet } from "../ble/HelmetConnection";

export default function ScanScreen() {
  const { connection, status, lastError } = useHelmetConnection();
  const [devices, setDevices] = useState<ScannedHelmet[]>([]);
  const [bluetoothState, setBluetoothState] = useState<BleState | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  useEffect(() => connection.onBluetoothStateChange(setBluetoothState), [connection]);

  useEffect(() => {
    if (status !== "disconnected" || bluetoothState !== BleState.PoweredOn) {
      return;
    }
    setDevices([]);
    connection.scan((device) => {
      setDevices((prev) => (prev.some((d) => d.id === device.id) ? prev : [...prev, device]));
    });
    return () => connection.stopScan();
  }, [connection, status, bluetoothState]);

  const handleConnect = async (deviceId: string) => {
    setConnectingId(deviceId);
    try {
      await connection.connect(deviceId);
    } catch {
      // connection.lastError / onError already surfaces the reason.
    } finally {
      setConnectingId(null);
    }
  };

  if (bluetoothState !== null && bluetoothState !== BleState.PoweredOn) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.message}>
          Bluetooth is {bluetoothState.toLowerCase()}. Turn it on to scan for the helmet.
        </Text>
      </SafeAreaView>
    );
  }

  if (status === "connected") {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.message}>Connected to helmet.</Text>
        <Pressable style={styles.disconnectButton} onPress={() => void connection.disconnect()}>
          <Text style={styles.disconnectButtonText}>Disconnect</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ActivityIndicator color="#93c5fd" />
        <Text style={styles.headerText}>Scanning for "AR-Helmet-Nav"...</Text>
      </View>

      {lastError ? <Text style={styles.errorText}>{lastError}</Text> : null}

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.message}>No helmet found yet. Make sure it's powered on nearby.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.deviceRow}
            disabled={connectingId !== null}
            onPress={() => void handleConnect(item.id)}
          >
            <View>
              <Text style={styles.deviceName}>{item.name ?? "Unnamed device"}</Text>
              <Text style={styles.deviceMeta}>
                {item.id} {item.rssi !== null ? `· ${item.rssi} dBm` : ""}
              </Text>
            </View>
            {connectingId === item.id ? <ActivityIndicator color="#93c5fd" /> : null}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerText: {
    color: "#e5e7eb",
    fontSize: 15,
  },
  message: {
    color: "#9ca3af",
    fontSize: 14,
    textAlign: "center",
    marginTop: 24,
  },
  errorText: {
    color: "#f87171",
    fontSize: 13,
  },
  list: {
    gap: 10,
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#161f33",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  deviceName: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  deviceMeta: {
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 2,
  },
  disconnectButton: {
    alignSelf: "center",
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  disconnectButtonText: {
    color: "#f87171",
    fontSize: 14,
  },
});
