import 'package:flutter/material.dart';

abstract final class AppColors {
  static const Color ink = Color(0xFF080A12);
  static const Color surface = Color(0xFF121625);
  static const Color surfaceBright = Color(0xFF1A2033);
  static const Color volt = Color(0xFFD9FF57);
  static const Color sky = Color(0xFF789DFF);
  static const Color amber = Color(0xFFFFB86B);
  static const Color danger = Color(0xFFFF5D73);
  static const Color muted = Color(0xFF959DB2);
  static const Color outline = Color(0xFF262D42);
}

ThemeData buildAppTheme() {
  final ColorScheme colors = ColorScheme.fromSeed(
    seedColor: AppColors.volt,
    brightness: Brightness.dark,
    surface: AppColors.surface,
    error: AppColors.danger,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: colors,
    scaffoldBackgroundColor: AppColors.ink,
    fontFamily: 'sans-serif',
    textTheme: const TextTheme(
      displaySmall: TextStyle(
        fontSize: 48,
        fontWeight: FontWeight.w800,
        letterSpacing: -2,
      ),
      headlineMedium: TextStyle(
        fontSize: 30,
        fontWeight: FontWeight.w800,
        letterSpacing: -1.1,
      ),
      titleLarge: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
      titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
      bodyLarge: TextStyle(fontSize: 16, height: 1.35),
      bodyMedium: TextStyle(fontSize: 14, height: 1.35),
      labelLarge: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
    ),
    navigationBarTheme: NavigationBarThemeData(
      height: 72,
      backgroundColor: Colors.transparent,
      indicatorColor: AppColors.volt,
      iconTheme: WidgetStateProperty.resolveWith<IconThemeData>((states) {
        return IconThemeData(
          color: states.contains(WidgetState.selected)
              ? AppColors.ink
              : AppColors.muted,
        );
      }),
      labelTextStyle: WidgetStateProperty.resolveWith<TextStyle>((states) {
        return TextStyle(
          color: states.contains(WidgetState.selected)
              ? AppColors.volt
              : AppColors.muted,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        );
      }),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surfaceBright,
      hintStyle: const TextStyle(color: AppColors.muted),
      prefixIconColor: AppColors.muted,
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: const BorderSide(color: AppColors.outline),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: const BorderSide(color: AppColors.volt, width: 1.5),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.volt,
        foregroundColor: AppColors.ink,
        minimumSize: const Size.fromHeight(56),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
      ),
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith<Color?>((states) {
        return states.contains(WidgetState.selected) ? AppColors.ink : null;
      }),
      trackColor: WidgetStateProperty.resolveWith<Color?>((states) {
        return states.contains(WidgetState.selected) ? AppColors.volt : null;
      }),
    ),
  );
}
