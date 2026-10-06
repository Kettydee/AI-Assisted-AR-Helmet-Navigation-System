import React from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./AppText";
import { colors, radius, spacing, TOUCH_TARGET } from "../../theme";

type IconName = keyof typeof Ionicons.glyphMap;

/** Scrollable, safe-area-aware page. Header-less tab screens pass edges={["top"]}. */
export function Screen({
  children,
  scroll = true,
  edges = [],
  onRefresh,
  refreshing = false,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  onRefresh?: () => void;
  refreshing?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <AppText variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionTitle}>
      {children.toUpperCase()}
    </AppText>
  );
}

export function ListRow({
  icon,
  iconColor = colors.accent,
  title,
  subtitle,
  right,
  onPress,
  showChevron = !!onPress,
}: {
  icon?: IconName;
  iconColor?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
}) {
  const body = (
    <>
      {icon ? (
        <View style={styles.rowIcon}>
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>
      ) : null}
      <View style={styles.rowText}>
        <AppText weight="semibold">{title}</AppText>
        {subtitle ? (
          <AppText variant="small" color={colors.textMuted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      {showChevron ? <Ionicons name="chevron-forward" size={20} color={colors.textFaint} /> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        {body}
      </Pressable>
    );
  }
  return <View style={styles.row}>{body}</View>;
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: IconName;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={36} color={colors.accent} />
      </View>
      <AppText variant="heading" weight="bold" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText variant="small" color={colors.textMuted} align="center">
          {message}
        </AppText>
      ) : null}
      {action}
    </View>
  );
}

type BannerTone = "info" | "warning" | "danger" | "success";

const BANNER_TONES: Record<BannerTone, { bg: string; fg: string; icon: IconName }> = {
  info: { bg: colors.accentDim, fg: colors.accent, icon: "information-circle" },
  warning: { bg: colors.warningDim, fg: colors.warning, icon: "warning" },
  danger: { bg: colors.dangerDim, fg: colors.danger, icon: "alert-circle" },
  success: { bg: "#0F3B2C", fg: colors.success, icon: "checkmark-circle" },
};

export function Banner({
  tone = "info",
  title,
  message,
  action,
}: {
  tone?: BannerTone;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  const t = BANNER_TONES[tone];
  return (
    <View style={[styles.banner, { backgroundColor: t.bg, borderColor: t.fg + "55" }]} accessibilityRole="alert">
      <View style={styles.bannerRow}>
        <Ionicons name={t.icon} size={22} color={t.fg} />
        <View style={styles.rowText}>
          <AppText weight="bold" color={t.fg}>
            {title}
          </AppText>
          {message ? (
            <AppText variant="small" color={colors.text}>
              {message}
            </AppText>
          ) : null}
        </View>
      </View>
      {action ? <View style={styles.bannerAction}>{action}</View> : null}
    </View>
  );
}

export function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { borderColor: color + "66", backgroundColor: color + "1A" }]}>
      <View style={[styles.badgeDot, { backgroundColor: color }]} />
      <AppText variant="small" weight="semibold" color={color}>
        {label}
      </AppText>
    </View>
  );
}

/** 4-bar signal indicator from an RSSI reading. */
export function SignalBars({ rssi }: { rssi: number | null }) {
  const level = rssi === null ? 0 : rssi >= -60 ? 4 : rssi >= -70 ? 3 : rssi >= -80 ? 2 : 1;
  return (
    <View style={styles.bars} accessibilityLabel={`Signal ${level} of 4`}>
      {[1, 2, 3, 4].map((bar) => (
        <View
          key={bar}
          style={[
            styles.bar,
            { height: 4 + bar * 4, backgroundColor: bar <= level ? colors.accent : colors.border },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  fill: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.75,
  },
  sectionTitle: {
    letterSpacing: 1.2,
    marginTop: spacing.sm,
    marginBottom: -spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: TOUCH_TARGET,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  banner: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  bannerRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  bannerAction: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 20,
  },
  bar: {
    width: 4,
    borderRadius: 1,
  },
});
