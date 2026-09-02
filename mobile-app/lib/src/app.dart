import 'package:flutter/material.dart';

import 'screens/home_screen.dart';
import 'screens/navigation_screen.dart';
import 'screens/safety_screen.dart';
import 'screens/settings_screen.dart';
import 'state/ride_controller.dart';
import 'theme/app_theme.dart';
import 'widgets/common.dart';

class HelmateApp extends StatefulWidget {
  const HelmateApp({required this.controller, super.key});

  final RideController controller;

  @override
  State<HelmateApp> createState() => _HelmateAppState();
}

class _HelmateAppState extends State<HelmateApp> {
  @override
  void dispose() {
    widget.controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return RideScope(
      controller: widget.controller,
      child: MaterialApp(
        title: 'HELMATE',
        debugShowCheckedModeBanner: false,
        theme: buildAppTheme(),
        home: const AppShell(),
      ),
    );
  }
}

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _currentIndex = 0;

  static const List<Widget> _screens = <Widget>[
    HomeScreen(),
    NavigationScreen(),
    SafetyScreen(),
    SettingsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: <Color>[
              Color(0xFF10162A),
              AppColors.ink,
              Color(0xFF0A0B13),
            ],
            stops: <double>[0, 0.42, 1],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 620),
              child: IndexedStack(index: _currentIndex, children: _screens),
            ),
          ),
        ),
      ),
      bottomNavigationBar: DecoratedBox(
        decoration: const BoxDecoration(
          color: Color(0xF5121625),
          border: Border(top: BorderSide(color: AppColors.outline)),
        ),
        child: SafeArea(
          top: false,
          child: NavigationBar(
            selectedIndex: _currentIndex,
            onDestinationSelected: (int index) {
              setState(() => _currentIndex = index);
            },
            destinations: const <NavigationDestination>[
              NavigationDestination(
                icon: Icon(Icons.space_dashboard_outlined),
                selectedIcon: Icon(Icons.space_dashboard_rounded),
                label: 'Home',
              ),
              NavigationDestination(
                icon: Icon(Icons.navigation_outlined),
                selectedIcon: Icon(Icons.navigation_rounded),
                label: 'Navigate',
              ),
              NavigationDestination(
                icon: Icon(Icons.health_and_safety_outlined),
                selectedIcon: Icon(Icons.health_and_safety_rounded),
                label: 'Safety',
              ),
              NavigationDestination(
                icon: Icon(Icons.tune_outlined),
                selectedIcon: Icon(Icons.tune_rounded),
                label: 'Settings',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
