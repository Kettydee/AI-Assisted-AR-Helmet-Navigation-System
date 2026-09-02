import 'package:flutter/material.dart';

import '../state/ride_controller.dart';
import '../theme/app_theme.dart';
import '../widgets/common.dart';

class SafetyScreen extends StatelessWidget {
  const SafetyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final RideController controller = RideScope.of(context);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
      children: <Widget>[
        const PageHeading(
          eyebrow: 'Safety',
          title: 'Protection, on standby.',
          subtitle: 'Crash response stays armed while you focus on the road.',
        ),
        const SizedBox(height: 24),
        _SosStatusCard(controller: controller),
        const SizedBox(height: 18),
        SurfaceCard(
          child: Column(
            children: <Widget>[
              _SettingsRow(
                icon: Icons.health_and_safety_rounded,
                title: 'Crash detection',
                subtitle: controller.crashDetectionEnabled
                    ? 'Monitoring helmet impact events'
                    : 'Crash alerts are paused',
                trailing: Switch(
                  value: controller.crashDetectionEnabled,
                  onChanged: controller.setCrashDetection,
                ),
              ),
              const Divider(height: 30, color: AppColors.outline),
              _SettingsRow(
                icon: Icons.contact_phone_rounded,
                title: controller.emergencyContactName,
                subtitle: controller.emergencyContactPhone.isEmpty
                    ? 'Add a phone number'
                    : controller.emergencyContactPhone,
                trailing: IconButton(
                  tooltip: 'Edit emergency contact',
                  onPressed: () => _editContact(context, controller),
                  icon: const Icon(Icons.edit_outlined, color: AppColors.muted),
                ),
              ),
              const Divider(height: 30, color: AppColors.outline),
              const _SettingsRow(
                icon: Icons.location_on_rounded,
                title: 'Live location',
                subtitle: 'Shared only when SOS is sent',
                trailing: StatusPill(label: 'Ready', active: true),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        OutlinedButton.icon(
          onPressed: controller.crashDetectionEnabled
              ? () => _showSosTest(context, controller)
              : null,
          icon: const Icon(Icons.emergency_outlined),
          label: const Text('Test SOS Countdown'),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.danger,
            minimumSize: const Size.fromHeight(54),
            side: BorderSide(
              color: AppColors.danger.withValues(alpha: 0.5),
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
            ),
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          'A real alert requires native SMS/dialer integration and user permission. '
          'This test never contacts anyone.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.muted, fontSize: 12),
        ),
      ],
    );
  }

  Future<void> _editContact(
    BuildContext context,
    RideController controller,
  ) async {
    final TextEditingController name =
        TextEditingController(text: controller.emergencyContactName);
    final TextEditingController phone =
        TextEditingController(text: controller.emergencyContactPhone);
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      builder: (BuildContext sheetContext) {
        return Padding(
          padding: EdgeInsets.fromLTRB(
            20,
            22,
            20,
            MediaQuery.viewInsetsOf(sheetContext).bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text('Emergency contact',
                  style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 18),
              TextField(
                controller: name,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(
                  labelText: 'Name',
                  prefixIcon: Icon(Icons.person_outline_rounded),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Phone number',
                  prefixIcon: Icon(Icons.phone_outlined),
                ),
              ),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: () {
                  controller.updateEmergencyContact(name.text, phone.text);
                  Navigator.pop(sheetContext);
                },
                child: const Text('Save Contact'),
              ),
            ],
          ),
        );
      },
    );
    name.dispose();
    phone.dispose();
  }

  Future<void> _showSosTest(
    BuildContext context,
    RideController controller,
  ) async {
    controller.startSosTest();
    await showModalBottomSheet<void>(
      context: context,
      isDismissible: false,
      enableDrag: false,
      backgroundColor: AppColors.surface,
      builder: (BuildContext sheetContext) {
        return RideScope(
          controller: controller,
          child: const _SosCountdownSheet(),
        );
      },
    );
    if (controller.sosState == SosState.countdown) {
      controller.cancelSos();
    }
  }
}

class _SosStatusCard extends StatelessWidget {
  const _SosStatusCard({required this.controller});

  final RideController controller;

  @override
  Widget build(BuildContext context) {
    final (String title, String subtitle, Color color, IconData icon) =
        switch (controller.sosState) {
      SosState.ready => (
          'SOS ready',
          'A 10-second cancel window will appear after a detected crash.',
          AppColors.volt,
          Icons.shield_outlined,
        ),
      SosState.countdown => (
          'SOS countdown',
          '${controller.sosSecondsRemaining} seconds until the simulated alert.',
          AppColors.amber,
          Icons.timer_outlined,
        ),
      SosState.dispatched => (
          'Test alert complete',
          'No message or call was placed during this test.',
          AppColors.danger,
          Icons.emergency_rounded,
        ),
    };

    return SurfaceCard(
      color: color.withValues(alpha: 0.08),
      borderColor: color.withValues(alpha: 0.35),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(17),
            ),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 15),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(title, style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 5),
                Text(subtitle, style: const TextStyle(color: AppColors.muted)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SettingsRow extends StatelessWidget {
  const _SettingsRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.trailing,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Widget trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: <Widget>[
        Icon(icon, color: AppColors.sky, size: 23),
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
        const SizedBox(width: 8),
        trailing,
      ],
    );
  }
}

class _SosCountdownSheet extends StatelessWidget {
  const _SosCountdownSheet();

  @override
  Widget build(BuildContext context) {
    final RideController controller = RideScope.of(context);
    final bool dispatched = controller.sosState == SosState.dispatched;
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 28, 24, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Container(
            width: 86,
            height: 86,
            decoration: BoxDecoration(
              color: (dispatched ? AppColors.volt : AppColors.danger)
                  .withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: dispatched
                  ? const Icon(Icons.check_rounded,
                      color: AppColors.volt, size: 42)
                  : Text(
                      '${controller.sosSecondsRemaining}',
                      style: Theme.of(context).textTheme.displaySmall?.copyWith(
                            color: AppColors.danger,
                          ),
                    ),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            dispatched ? 'Simulation complete' : 'Crash alert detected',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            dispatched
                ? 'The test finished without contacting your emergency contact.'
                : 'In the production flow, SOS would share your live location with ${controller.emergencyContactName}.',
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.muted),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: () {
              controller.cancelSos();
              Navigator.pop(context);
            },
            style: FilledButton.styleFrom(
              backgroundColor: dispatched ? AppColors.volt : AppColors.danger,
              foregroundColor: dispatched ? AppColors.ink : Colors.white,
            ),
            child: Text(dispatched ? 'Done' : 'I’m Safe — Cancel SOS'),
          ),
        ],
      ),
    );
  }
}
