import 'package:flutter/material.dart';

import 'src/app.dart';
import 'src/services/helmet_service.dart';
import 'src/state/ride_controller.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  final RideController controller = RideController(
    helmetService: DemoHelmetService(),
  )..initialize();

  runApp(HelmateApp(controller: controller));
}
