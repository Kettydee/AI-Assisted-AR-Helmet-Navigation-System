import React from "react";
import { Stack } from "expo-router";
import { HelmetConnectionProvider } from "../hooks/useHelmetConnection";
import { useCallRelay } from "../hooks/useCallRelay";
import { CrashOverlay } from "../components/CrashOverlay";

function AppShell() {
  // Mounted once at the root: relays native call state <-> the helmet for
  // the whole app, regardless of which screen is showing.
  useCallRelay();

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0b1220" },
          headerTintColor: "#ffffff",
          contentStyle: { backgroundColor: "#0b1220" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "AR Helmet Nav" }} />
        <Stack.Screen name="scan" options={{ title: "Connect to Helmet" }} />
        <Stack.Screen name="test-panel" options={{ title: "Test Panel" }} />
        <Stack.Screen name="settings" options={{ title: "SOS Contacts" }} />
      </Stack>
      {/* Not a routed screen: needs to interrupt any screen, and can't be
          navigated away from mid-countdown the way a pushed route could. */}
      <CrashOverlay />
    </>
  );
}

export default function RootLayout() {
  return (
    <HelmetConnectionProvider>
      <AppShell />
    </HelmetConnectionProvider>
  );
}
