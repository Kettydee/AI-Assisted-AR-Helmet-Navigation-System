import 'package:flutter/material.dart';

import '../services/helmet_service.dart';
import '../state/ride_controller.dart';
import '../theme/app_theme.dart';
import '../widgets/common.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final RideController controller = RideScope.of(context);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
      children: <Widget>[
        const PageHeading(
          eyebrow: 'Settings',
          title: 'Make it yours.',
          subtitle: 'Tune every warning, prompt and helmet connection.',
        ),
        const SizedBox(height: 24),
        SurfaceCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  const Icon(Icons.speed_rounded, color: AppColors.sky),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Speed warning',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                  Text(
                    '${controller.speedWarningKph.round()} km/h',
                    style: const TextStyle(
                      color: AppColors.volt,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Slider(
                value: controller.speedWarningKph,
                min: 40,
                max: 140,
                divisions: 20,
                label: '${controller.speedWarningKph.round()} km/h',
                activeColor: AppColors.volt,
                inactiveColor: AppColors.outline,
                onChanged: controller.setSpeedWarning,
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: <Widget>[
                    Text('40',
                        style: TextStyle(color: AppColors.muted, fontSize: 11)),
                    Text('140',
                        style: TextStyle(color: AppColors.muted, fontSize: 11)),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        SurfaceCard(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          child: Column(
            children: <Widget>[
              _ToggleTile(
                icon: Icons.warning_amber_rounded,
                title: 'Pothole alerts',
                subtitle: 'Show avoidance direction on the HUD',
                value: controller.potholeAlertsEnabled,
                onChanged: controller.setPotholeAlerts,
              ),
              const Divider(height: 1, color: AppColors.outline),
              _ToggleTile(
                icon: Icons.volume_up_outlined,
                title: 'Audio alerts',
                subtitle: 'Speak navigation and hazard prompts',
                value: controller.audioAlertsEnabled,
                onChanged: controller.setAudioAlerts,
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        SurfaceCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      color: AppColors.sky.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(Icons.bluetooth_rounded,
                        color: AppColors.sky),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text('BLE device',
                            style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 3),
                        Text(
                          controller.isHelmetConnected
                              ? (controller.selectedDevice?.name ??
                                  'AR-Helmet-Nav')
                              : 'No helmet connected',
                          style: const TextStyle(
                              color: AppColors.muted, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                  StatusPill(
                    label: controller.isHelmetConnected ? 'Online' : 'Offline',
                    active: controller.isHelmetConnected,
                  ),
                ],
              ),
              const SizedBox(height: 18),
              if (controller.isHelmetConnected)
                OutlinedButton.icon(
                  onPressed: controller.disconnectHelmet,
                  icon: const Icon(Icons.link_off_rounded),
                  label: const Text('Disconnect Helmet'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(50),
                    foregroundColor: AppColors.danger,
                    side: BorderSide(
                      color: AppColors.danger.withValues(alpha: 0.45),
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                )
              else
                FilledButton.icon(
                  onPressed: controller.isConnecting
                      ? null
                      : () => _showDevicePicker(context, controller),
                  icon: controller.isConnecting
                      ? const SizedBox.square(
                          dimension: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.radar_rounded),
                  label: Text(
                    controller.isConnecting ? 'Connecting…' : 'Find Helmet',
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        const Center(
          child: Text(
            'HELMATE · MVP 0.1.0',
            style: TextStyle(color: AppColors.muted, fontSize: 12),
          ),
        ),
      ],
    );
  }

  Future<void> _showDevicePicker(
    BuildContext context,
    RideController controller,
  ) async {
    final Future<List<HelmetDevice>> devices = controller.scanForHelmets();
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.surface,
      builder: (BuildContext sheetContext) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 22, 20, 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text('Nearby helmets',
                  style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 5),
              const Text(
                'Searching for the HELMATE helmet BLE service',
                style: TextStyle(color: AppColors.muted),
              ),
              const SizedBox(height: 18),
              FutureBuilder<List<HelmetDevice>>(
                future: devices,
                builder: (BuildContext context,
                    AsyncSnapshot<List<HelmetDevice>> snapshot) {
                  if (snapshot.connectionState != ConnectionState.done) {
                    return const SizedBox(
                      height: 110,
                      child: Center(
                          child:
                              CircularProgressIndicator(color: AppColors.volt)),
                    );
                  }
                  if (snapshot.hasError || (snapshot.data?.isEmpty ?? true)) {
                    return const SizedBox(
                      height: 110,
                      child: Center(
                        child: Text(
                          'No compatible helmets found.',
                          style: TextStyle(color: AppColors.muted),
                        ),
                      ),
                    );
                  }
                  return Column(
                    children: snapshot.data!.map((HelmetDevice device) {
                      return ListTile(
                        contentPadding:
                            const EdgeInsets.symmetric(horizontal: 4),
                        leading: Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: AppColors.volt.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(Icons.motorcycle_rounded,
                              color: AppColors.volt),
                        ),
                        title: Text(device.name),
                        subtitle: Text(
                          '${device.signalStrength} dBm · ${device.id}',
                          style: const TextStyle(
                              color: AppColors.muted, fontSize: 12),
                        ),
                        trailing: const Icon(Icons.chevron_right_rounded),
                        onTap: () async {
                          Navigator.pop(sheetContext);
                          try {
                            await controller.connectHelmet(device);
                            if (context.mounted) {
                              AppSnackBar.show(
                                  context, '${device.name} connected.');
                            }
                          } catch (_) {
                            if (context.mounted) {
                              AppSnackBar.show(
                                  context, 'Could not connect to the helmet.');
                            }
                          }
                        },
                      );
                    }).toList(),
                  );
                },
              ),
            ],
          ),
        );
      },
    );
  }
}

class _ToggleTile extends StatelessWidget {
  const _ToggleTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: <Widget>[
          Icon(icon, color: AppColors.sky),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(title, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  style: const TextStyle(color: AppColors.muted, fontSize: 12),
                ),
              ],
            ),
          ),
          Switch(value: value, onChanged: onChanged),
        ],
      ),
    );
  }
}
