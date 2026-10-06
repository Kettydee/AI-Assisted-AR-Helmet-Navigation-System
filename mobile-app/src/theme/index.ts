/**
 * Design tokens. Dark, high-contrast "HUD" palette tuned for glanceability in
 * sunlight; every screen pulls colours/spacing/type from here instead of
 * hard-coding them.
 */

export const colors = {
  bg: "#0B1220",
  surface: "#131C2E",
  surfaceRaised: "#1B2640",
  border: "#26324D",
  text: "#F5F7FB",
  textMuted: "#9AA6BF",
  textFaint: "#66728C",
  accent: "#22D3EE",
  accentDim: "#0E4C5A",
  onAccent: "#04121A",
  success: "#34D399",
  warning: "#FBBF24",
  warningDim: "#4A3A10",
  danger: "#F87171",
  dangerStrong: "#DC2626",
  dangerDim: "#4A1616",
  sos: "#B91C1C",
  hudGlow: "#5EEAD4",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

/**
 * Exo 2 is loaded in app/_layout.tsx. Weight is picked by font *family*,
 * never with fontWeight: on Android, bold-weighted system text inside
 * shrink-wrapped containers gets measured too narrow and clipped ("Not
 * connected" rendering as "Not") - a separate family per weight avoids it.
 */
export const fonts = {
  regular: "Exo2_400Regular",
  medium: "Exo2_500Medium",
  semibold: "Exo2_600SemiBold",
  bold: "Exo2_700Bold",
  extrabold: "Exo2_800ExtraBold",
} as const;

export type FontWeightName = keyof typeof fonts;

export const type = {
  display: { fontSize: 34, lineHeight: 42 },
  title: { fontSize: 24, lineHeight: 32 },
  heading: { fontSize: 18, lineHeight: 26 },
  body: { fontSize: 16, lineHeight: 23 },
  small: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 17 },
} as const;

export type TypeVariant = keyof typeof type;

/** Minimum touch target - big enough for gloved fingers. */
export const TOUCH_TARGET = 56;
