import 'dart:async';
import 'dart:typed_data';

const String helmetServiceUuid = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const String navigationCharacteristicUuid =
    'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const String hazardCharacteristicUuid = '1c95d5e3-d8f7-413a-bf3d-7a2e5d7be87e';

class HelmetDevice {
  const HelmetDevice({
    required this.id,
    required this.name,
    required this.signalStrength,
  });

  final String id;
  final String name;
  final int signalStrength;
}

abstract interface class HelmetService {
  Stream<bool> get connectionChanges;

  Future<List<HelmetDevice>> scan();

  Future<void> connect(HelmetDevice device);

  Future<void> disconnect();

  Future<void> writeNavigation(Uint8List packet);

  Future<void> dispose();
}

/// Development adapter used until the native BLE package is configured.
/// It keeps the whole app usable in an emulator and records protocol writes.
class DemoHelmetService implements HelmetService {
  final StreamController<bool> _connectionController =
      StreamController<bool>.broadcast(sync: true);

  final List<Uint8List> packets = <Uint8List>[];
  bool _isConnected = false;

  @override
  Stream<bool> get connectionChanges => _connectionController.stream;

  @override
  Future<List<HelmetDevice>> scan() async {
    await Future<void>.delayed(const Duration(milliseconds: 700));
    return const <HelmetDevice>[
      HelmetDevice(
        id: 'DE:MO:00:00:01',
        name: 'AR-Helmet-Nav',
        signalStrength: -48,
      ),
    ];
  }

  @override
  Future<void> connect(HelmetDevice device) async {
    await Future<void>.delayed(const Duration(milliseconds: 450));
    _isConnected = true;
    _connectionController.add(true);
  }

  @override
  Future<void> disconnect() async {
    _isConnected = false;
    _connectionController.add(false);
  }

  @override
  Future<void> writeNavigation(Uint8List packet) async {
    if (!_isConnected) {
      throw StateError('Helmet is not connected.');
    }
    packets.add(Uint8List.fromList(packet));
  }

  @override
  Future<void> dispose() => _connectionController.close();
}
