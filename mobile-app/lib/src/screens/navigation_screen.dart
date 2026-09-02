import 'package:flutter/material.dart';

import '../models/navigation_instruction.dart';
import '../state/ride_controller.dart';
import '../theme/app_theme.dart';
import '../widgets/common.dart';

class NavigationScreen extends StatefulWidget {
  const NavigationScreen({super.key});

  @override
  State<NavigationScreen> createState() => _NavigationScreenState();
}

class _NavigationScreenState extends State<NavigationScreen> {
  final TextEditingController _destinationController = TextEditingController();

  @override
  void dispose() {
    _destinationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final RideController controller = RideScope.of(context);
    final NavigationInstruction instruction = controller.nextInstruction;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
      children: <Widget>[
        const PageHeading(
          eyebrow: 'Navigation',
          title: 'Plan the next move.',
          subtitle: 'Set a destination. HELMATE keeps every turn in view.',
        ),
        const SizedBox(height: 24),
        TextField(
          controller: _destinationController,
          textInputAction: TextInputAction.search,
          onChanged: controller.setDestination,
          onSubmitted: (_) => _startNavigation(context, controller),
          decoration: InputDecoration(
            hintText: 'Enter destination',
            prefixIcon: const Icon(Icons.search_rounded),
            suffixIcon: _destinationController.text.isEmpty
                ? const Icon(Icons.mic_none_rounded)
                : IconButton(
                    tooltip: 'Clear',
                    onPressed: () {
                      _destinationController.clear();
                      controller.setDestination('');
                      setState(() {});
                    },
                    icon: const Icon(Icons.close_rounded),
                  ),
          ),
        ),
        const SizedBox(height: 18),
        _MapPreview(isNavigating: controller.isNavigating),
        const SizedBox(height: 18),
        if (controller.isNavigating) ...<Widget>[
          SurfaceCard(
            color: AppColors.volt.withValues(alpha: 0.06),
            borderColor: AppColors.volt.withValues(alpha: 0.32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Row(
                  children: <Widget>[
                    const Text(
                      'NEXT TURN',
                      style: TextStyle(
                        color: AppColors.volt,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.5,
                      ),
                    ),
                    const Spacer(),
                    StatusPill(
                      label: controller.isHelmetConnected
                          ? 'Sent to HUD'
                          : 'Phone only',
                      active: controller.isHelmetConnected,
                    ),
                  ],
                ),
                const SizedBox(height: 22),
                Row(
                  children: <Widget>[
                    Container(
                      width: 76,
                      height: 76,
                      decoration: BoxDecoration(
                        color: AppColors.volt,
                        borderRadius: BorderRadius.circular(22),
                      ),
                      child: Icon(
                        _directionIcon(instruction.direction),
                        size: 46,
                        color: AppColors.ink,
                      ),
                    ),
                    const SizedBox(width: 18),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text(
                            '${instruction.distanceMeters} m',
                            style: Theme.of(context)
                                .textTheme
                                .headlineMedium
                                ?.copyWith(color: Colors.white),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            '${instruction.direction.label} onto ${instruction.street}',
                            style: const TextStyle(color: AppColors.muted),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          OutlinedButton.icon(
            onPressed: () => controller.stopNavigation(),
            icon: const Icon(Icons.close_rounded),
            label: const Text('End Navigation'),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(52),
              foregroundColor: AppColors.danger,
              side: BorderSide(
                color: AppColors.danger.withValues(alpha: 0.45),
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(18),
              ),
            ),
          ),
        ] else ...<Widget>[
          _RouteSummary(destination: controller.destination),
          const SizedBox(height: 18),
          FilledButton.icon(
            onPressed: controller.destination.isEmpty
                ? null
                : () => _startNavigation(context, controller),
            icon: const Icon(Icons.navigation_rounded),
            label: const Text('Start Navigation'),
          ),
        ],
      ],
    );
  }

  Future<void> _startNavigation(
    BuildContext context,
    RideController controller,
  ) async {
    FocusScope.of(context).unfocus();
    await controller.startNavigation();
    if (context.mounted && !controller.isHelmetConnected) {
      AppSnackBar.show(
        context,
        'Navigation started. Connect the helmet to mirror turns on the HUD.',
      );
    }
  }

  static IconData _directionIcon(NavigationDirection direction) {
    return switch (direction) {
      NavigationDirection.left => Icons.turn_left_rounded,
      NavigationDirection.right => Icons.turn_right_rounded,
      NavigationDirection.straight => Icons.straight_rounded,
      NavigationDirection.uTurn => Icons.u_turn_left_rounded,
      NavigationDirection.destination => Icons.flag_rounded,
    };
  }
}

class _MapPreview extends StatelessWidget {
  const _MapPreview({required this.isNavigating});

  final bool isNavigating;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: SizedBox(
        height: 236,
        child: Stack(
          fit: StackFit.expand,
          children: <Widget>[
            CustomPaint(painter: _MapPainter(active: isNavigating)),
            Positioned(
              top: 14,
              right: 14,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.ink.withValues(alpha: 0.82),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: <Widget>[
                    const Icon(Icons.gps_fixed, size: 15, color: AppColors.sky),
                    const SizedBox(width: 6),
                    Text(
                      isNavigating ? 'Live route' : 'Route preview',
                      style: const TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
            ),
            const Positioned(
              left: 46,
              bottom: 48,
              child: _MapMarker(icon: Icons.my_location_rounded),
            ),
            const Positioned(
              right: 48,
              top: 52,
              child: _MapMarker(icon: Icons.flag_rounded, destination: true),
            ),
          ],
        ),
      ),
    );
  }
}

class _MapPainter extends CustomPainter {
  const _MapPainter({required this.active});

  final bool active;

  @override
  void paint(Canvas canvas, Size size) {
    final Rect bounds = Offset.zero & size;
    canvas.drawRect(
      bounds,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: <Color>[Color(0xFF171E35), Color(0xFF0E1220)],
        ).createShader(bounds),
    );
    final Paint road = Paint()
      ..color = const Color(0xFF2C3551)
      ..strokeWidth = 18
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;
    final Paint sideRoad = Paint()
      ..color = const Color(0xFF222A40)
      ..strokeWidth = 8
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;
    canvas.drawLine(Offset(-10, size.height * .35),
        Offset(size.width + 20, size.height * .72), road);
    canvas.drawLine(Offset(size.width * .2, -10),
        Offset(size.width * .38, size.height + 10), sideRoad);
    canvas.drawLine(Offset(size.width * .77, -10),
        Offset(size.width * .58, size.height + 10), sideRoad);
    canvas.drawLine(
        Offset(-10, size.height * .8), Offset(size.width * .74, -10), sideRoad);

    final Path route = Path()
      ..moveTo(size.width * .18, size.height * .76)
      ..cubicTo(
        size.width * .31,
        size.height * .64,
        size.width * .43,
        size.height * .7,
        size.width * .52,
        size.height * .53,
      )
      ..cubicTo(
        size.width * .62,
        size.height * .34,
        size.width * .73,
        size.height * .42,
        size.width * .82,
        size.height * .25,
      );
    canvas.drawPath(
      route,
      Paint()
        ..color = active ? AppColors.volt : AppColors.sky
        ..strokeWidth = 6
        ..strokeCap = StrokeCap.round
        ..style = PaintingStyle.stroke,
    );
  }

  @override
  bool shouldRepaint(covariant _MapPainter oldDelegate) =>
      oldDelegate.active != active;
}

class _MapMarker extends StatelessWidget {
  const _MapMarker({required this.icon, this.destination = false});

  final IconData icon;
  final bool destination;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: destination ? AppColors.amber : AppColors.sky,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 3),
        boxShadow: const <BoxShadow>[
          BoxShadow(color: Color(0x55000000), blurRadius: 10),
        ],
      ),
      child: Icon(icon, size: 19, color: AppColors.ink),
    );
  }
}

class _RouteSummary extends StatelessWidget {
  const _RouteSummary({required this.destination});

  final String destination;

  @override
  Widget build(BuildContext context) {
    return SurfaceCard(
      child: Row(
        children: <Widget>[
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: AppColors.sky.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(15),
            ),
            child: const Icon(Icons.route_rounded, color: AppColors.sky),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  destination.isEmpty
                      ? 'Your route will appear here'
                      : destination,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  destination.isEmpty
                      ? 'Enter a destination to begin'
                      : 'Fastest route · 8.4 km · 24 min',
                  style: const TextStyle(color: AppColors.muted, fontSize: 13),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
