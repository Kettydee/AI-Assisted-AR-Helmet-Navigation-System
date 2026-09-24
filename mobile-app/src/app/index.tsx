import React from "react";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHelmetConnection } from "../hooks/useHelmetConnection";

const STATUS_LABEL: Record<string, string> = {
  disconnected: "Not connected",
  scanning: "Scanning for helmet...",
  connecting: "Connecting...",
  connected: "Connected",
};

export default function HomeScreen() {
  const { status, lastError, connection } = useHelmetConnection();
  const connected = status === "connected";

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.appName}>AR Helmet Nav</Text>

      <View style={styles.statusPill}>
        <View style={[styles.statusDot, connected && styles.statusDotConnected]} />
        <Text style={styles.statusText}>{STATUS_LABEL[status] ?? status}</Text>
      </View>

      {lastError ? <Text style={styles.errorText}>{lastError}</Text> : null}

      <View style={styles.linkList}>
        <Link href="/scan" asChild>
          <Pressable style={styles.linkButton}>
            <Text style={styles.linkButtonText}>{connected ? "Manage connection" : "Connect to helmet"}</Text>
          </Pressable>
        </Link>
        <Link href="/test-panel" asChild>
          <Pressable style={styles.linkButton}>
            <Text style={styles.linkButtonText}>Test panel</Text>
          </Pressable>
        </Link>
        <Link href="/settings" asChild>
          <Pressable style={styles.linkButton}>
            <Text style={styles.linkButtonText}>SOS contacts</Text>
          </Pressable>
        </Link>
      </View>

      {connected ? (
        <Pressable style={styles.disconnectButton} onPress={() => void connection.disconnect()}>
          <Text style={styles.disconnectButtonText}>Disconnect</Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 20,
  },
  appName: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 12,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#161f33",
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#6b7280",
  },
  statusDotConnected: {
    backgroundColor: "#22c55e",
  },
  statusText: {
    color: "#e5e7eb",
    fontSize: 14,
  },
  errorText: {
    color: "#f87171",
    fontSize: 13,
  },
  linkList: {
    gap: 12,
  },
  linkButton: {
    backgroundColor: "#161f33",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  linkButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  disconnectButton: {
    marginTop: "auto",
    marginBottom: 12,
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  disconnectButtonText: {
    color: "#f87171",
    fontSize: 14,
  },
});
