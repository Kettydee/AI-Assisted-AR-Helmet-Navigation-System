import 'dart:async';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:helmate/src/services/helmet_service.dart';
import 'package:helmate/src/state/ride_controller.dart';

void main() {
  test('navigation writes the first packet when a helmet is connected',
      () async {
    final RecordingHelmetService service = RecordingHelmetService();
    final RideController controller = RideController(helmetService: service);
    await controller.initialize();
    await controller.connectHelmet(
      const HelmetDevice(id: 'test', name: 'Test helmet', signalStrength: -40),
    );

    controller.setDestination('Central Station');
    await controller.startNavigation();

    expect(service.packets, hasLength(1));
    expect(service.packets.single, <int>[0x02, 0x01, 0x40]);
    controller.dispose();
  });
}

class RecordingHelmetService implements HelmetService {
  final StreamController<bool> _connections =
      StreamController<bool>.broadcast(sync: true);
  final List<Uint8List> packets = <Uint8List>[];

  @override
  Stream<bool> get connectionChanges => _connections.stream;

  @override
  Future<List<HelmetDevice>> scan() async => const <HelmetDevice>[];

  @override
  Future<void> connect(HelmetDevice device) async => _connections.add(true);

  @override
  Future<void> disconnect() async => _connections.add(false);

  @override
  Future<void> writeNavigation(Uint8List packet) async => packets.add(packet);

  @override
  Future<void> dispose() => _connections.close();
}
