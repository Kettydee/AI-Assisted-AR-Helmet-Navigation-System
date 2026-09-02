import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../state/ride_controller.dart';
import '../theme/app_theme.dart';
import '../widgets/common.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final RideController controller = RideScope.of(context);
    final String duration = _formatDuration(controller.rideSeconds);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
      children: <Widget>[
        Row(
          children: <Widget>[
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: AppColors.volt,
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Center(
                child: Text(
                  'H',
                  style: TextStyle(
                    color: AppColors.ink,
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    'HELMATE',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.5,
                    ),
                  ),
                  Text(
                    'RIDER CONSOLE',
                    style: TextStyle(
                      color: AppColors.muted,
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.6,
                    ),
                  ),
                ],
              ),
            ),
            StatusPill(
              label: controller.isRideActive ? 'Ride active' : 'Standby',
              active: controller.isRideActive,
              activeColor: AppColors.volt,
            ),
          ],
        ),
        const SizedBox(height: 30),
        const PageHeading(
          eyebrow: 'Dashboard',
          title: 'Ready when you are.',
          subtitle: 'Helmet, route and safety—one glance before you ride.',
        ),
        const SizedBox(height: 22),
        _HelmetConnectionCard(controller: controller),
        const SizedBox(height: 18),
        SurfaceCard(
          color: const Color(0xFF11182A),
          child: Column(
            children: <Widget>[
              Row(
                children: <Widget>[
                  const Text(
                    'LIVE TELEMETRY',
                    style: TextStyle(
                      color: AppColors.muted,
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.7,
                    ),
                  ),
                  const Spacer(),
                  StatusPill(
                    label: controller.gpsStatus == GpsStatus.locked
                        ? 'GPS locked'
                        : 'Finding GPS',
                    active: controller.gpsStatus == GpsStatus.locked,
                    activeColor: AppColors.sky,
                  ),
                ],
              ),
              _SpeedGauge(
                speed: controller.speedKph,
                warning: controller.speedWarningKph,
              ),
              const SizedBox(height: 12),
              Row(
                children: <Widget>[
                  Expanded(
                    child: _Metric(
                      label: 'RIDE TIME',
                      value: duration,
                      icon: Icons.timer_outlined,
                    ),
                  ),
                  Container(width: 1, height: 42, color: AppColors.outline),
                  Expanded(
                    child: _Metric(
                      label: 'GPS',
                      value: switch (controller.gpsStatus) {
                        GpsStatus.locked => 'Locked',
                        GpsStatus.acquiring => 'Acquiring',
                        GpsStatus.unavailable => 'Unavailable',
                      },
                      icon: Icons.gps_fixed_rounded,
                      active: controller.gpsStatus == GpsStatus.locked,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        FilledButton.icon(
          onPressed: controller.gpsStatus == GpsStatus.unavailable
              ? null
              : controller.toggleRide,
          icon: Icon(
            controller.isRideActive
                ? Icons.stop_circle_outlined
                : Icons.play_arrow_rounded,
          ),
          label: Text(controller.isRideActive ? 'End ride' : 'Begin ride'),
          style: controller.isRideActive
              ? FilledButton.styleFrom(
                  backgroundColor: AppColors.danger,
                  foregroundColor: Colors.white,
                )
              : null,
        ),
        const SizedBox(height: 12),
        Text(
          controller.isRideActive
              ? 'Ride tracking is active. Navigation updates will be sent to the HUD.'
              : 'Connect your helmet for live HUD guidance.',
          textAlign: TextAlign.center,
          style: const TextStyle(color: AppColors.muted, fontSize: 12),
        ),
      ],
    );
  }

  static String _formatDuration(int seconds) {
    final int minutes = seconds ~/ 60;
    final int remainder = seconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${remainder.toString().padLeft(2, '0')}';
  }
}

class _HelmetConnectionCard extends StatelessWidget {
  const _HelmetConnectionCard({required this.controller});

  final RideController controller;

  @override
  Widget build(BuildContext context) {
    return SurfaceCard(
      color: controller.isHelmetConnected
          ? AppColors.volt.withValues(alpha: 0.07)
          : AppColors.surface,
      borderColor: controller.isHelmetConnected
          ? AppColors.volt.withValues(alpha: 0.35)
          : null,
      child: Row(
        children: <Widget>[
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: (controller.isHelmetConnected
                      ? AppColors.volt
                      : AppColors.muted)
                  .withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(15),
            ),
            child: Icon(
              Icons.bluetooth_rounded,
              color: controller.isHelmetConnected
                  ? AppColors.volt
                  : AppColors.muted,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  controller.isHelmetConnected
                      ? (controller.selectedDevice?.name ?? 'AR-Helmet-Nav')
                      : 'Helmet disconnected',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  controller.isHelmetConnected
                      ? 'BLE link active · HUD ready'
                      : 'Pair a device in Settings',
                  style: const TextStyle(color: AppColors.muted, fontSize: 13),
                ),
              ],
            ),
          ),
          StatusPill(
            label: controller.isHelmetConnected ? 'Connected' : 'Offline',
            active: controller.isHelmetConnected,
          ),
        ],
      ),
    );
  }
}

class _SpeedGauge extends StatelessWidget {
  const _SpeedGauge({required this.speed, required this.warning});

  final double speed;
  final double warning;

  @override
  Widget build(BuildContext context) {
    final bool overLimit = speed >= warning;
    return SizedBox(
      height: 196,
      child: CustomPaint(
        painter: _GaugePainter(
          progress: (speed / 140).clamp(0, 1).toDouble(),
          color: overLimit ? AppColors.danger : AppColors.volt,
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Text(
                speed.round().toString(),
                style: Theme.of(context).textTheme.displaySmall?.copyWith(
                      color: overLimit ? AppColors.danger : Colors.white,
                    ),
              ),
              const Text(
                'KM/H',
                style: TextStyle(
                  color: AppColors.muted,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.4,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _GaugePainter extends CustomPainter {
  const _GaugePainter({required this.progress, required this.color});

  final double progress;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final Rect rect = Rect.fromCircle(
      center: Offset(size.width / 2, size.height / 2 + 18),
      radius: math.min(size.width, size.height) * 0.4,
    );
    const double start = math.pi * 0.75;
    const double sweep = math.pi * 1.5;
    final Paint background = Paint()
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 12
      ..color = const Color(0xFF29304A);
    final Paint foreground = Paint()
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 12
      ..color = color;
    canvas.drawArc(rect, start, sweep, false, background);
    canvas.drawArc(rect, start, sweep * progress, false, foreground);
  }

  @override
  bool shouldRepaint(covariant _GaugePainter oldDelegate) {
    return oldDelegate.progress != progress || oldDelegate.color != color;
  }
}

class _Metric extends StatelessWidget {
  const _Metric({
    required this.label,
    required this.value,
    required this.icon,
    this.active = true,
  });

  final String label;
  final String value;
  final IconData icon;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: <Widget>[
        Icon(icon, size: 19, color: active ? AppColors.sky : AppColors.muted),
        const SizedBox(width: 9),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              label,
              style: const TextStyle(
                color: AppColors.muted,
                fontSize: 10,
                fontWeight: FontWeight.w700,
                letterSpacing: 1,
              ),
            ),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w700)),
          ],
        ),
      ],
    );
  }
}
