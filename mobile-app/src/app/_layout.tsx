import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Exo2_400Regular,
  Exo2_500Medium,
  Exo2_600SemiBold,
  Exo2_700Bold,
  Exo2_800ExtraBold,
} from "@expo-google-fonts/exo-2";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { HelmetConnectionProvider } from "../hooks/useHelmetConnection";
import { SettingsProvider, useSettings } from "../hooks/useSettings";
import { HistoryProvider } from "../hooks/useHistory";
import { RideProvider } from "../hooks/useRide";
import { useCallRelay } from "../hooks/useCallRelay";
import { CrashOverlay } from "../components/CrashOverlay";
import { UpdateGate } from "../update/UpdateGate";
import { colors, fonts } from "../theme";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function AppShell() {
  // Mounted once at the root: relays native call state <-> the helmet for
  // the whole app, regardless of which screen is showing.
  useCallRelay();
  const { loaded } = useSettings();
  const [fontsLoaded, fontError] = useFonts({
    Exo2_400Regular,
    Exo2_500Medium,
    Exo2_600SemiBold,
    Exo2_700Bold,
    Exo2_800ExtraBold,
  });
  const ready = loaded && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: fonts.bold },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="navigate" options={{ title: "Where to?" }} />
        <Stack.Screen name="ride" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="contacts" options={{ title: "Emergency contacts" }} />
        <Stack.Screen name="history" options={{ title: "Ride history" }} />
        <Stack.Screen name="developer" options={{ title: "Developer tools" }} />
        <Stack.Screen name="scan-road" options={{ headerShown: false }} />
        <Stack.Screen name="pothole-cam" options={{ title: "Pothole Cam" }} />
      </Stack>
      {/* Update gate covers the app when a newer release exists; CrashOverlay
          renders after it so a crash alert is never hidden behind it. */}
      <UpdateGate />
      <CrashOverlay />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <HelmetConnectionProvider>
          <HistoryProvider>
            <RideProvider>
              <AppShell />
            </RideProvider>
          </HistoryProvider>
        </HelmetConnectionProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
