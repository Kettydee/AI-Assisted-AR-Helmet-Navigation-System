import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:helmate/src/app.dart';
import 'package:helmate/src/services/helmet_service.dart';
import 'package:helmate/src/state/ride_controller.dart';

void main() {
  testWidgets('all four MVP destinations are available',
      (WidgetTester tester) async {
    final RideController controller = RideController(
      helmetService: DemoHelmetService(),
    );
    await tester.pumpWidget(HelmateApp(controller: controller));

    expect(find.text('Ready when you are.'), findsOneWidget);
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Navigate'), findsOneWidget);
    expect(find.text('Safety'), findsOneWidget);
    expect(find.text('Settings'), findsOneWidget);
  });
}
