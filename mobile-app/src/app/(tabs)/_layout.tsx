import React from "react";
import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ColorValue } from "react-native";
import { useSettings } from "../../hooks/useSettings";
import { useHelmetConnection } from "../../hooks/useHelmetConnection";
import { colors, fonts } from "../../theme";

type IconName = keyof typeof Ionicons.glyphMap;

function icon(name: IconName, focusedName: IconName) {
  return ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => (
    <Ionicons name={focused ? focusedName : name} size={size} color={color as string} />
  );
}

export default function TabsLayout() {
  const { settings } = useSettings();
  const { status } = useHelmetConnection();
  const insets = useSafeAreaInsets();

  if (!settings.onboardingDone) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
        },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Ride", tabBarIcon: icon("speedometer-outline", "speedometer") }} />
      <Tabs.Screen
        name="helmet"
        options={{
          title: "Helmet",
          tabBarIcon: icon("bluetooth-outline", "bluetooth"),
          tabBarBadge: status === "connected" ? undefined : status === "reconnecting" ? "…" : "!",
          tabBarBadgeStyle: { backgroundColor: status === "reconnecting" ? colors.warning : colors.danger },
        }}
      />
      <Tabs.Screen name="hazards" options={{ title: "Hazards", tabBarIcon: icon("warning-outline", "warning") }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: icon("settings-outline", "settings") }} />
    </Tabs>
  );
}
