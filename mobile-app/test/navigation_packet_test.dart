import 'package:flutter_test/flutter_test.dart';
import 'package:helmate/src/models/navigation_instruction.dart';
import 'package:helmate/src/services/navigation_packet.dart';

void main() {
  group('encodeNavigationPacket', () {
    test('encodes RIGHT 120 m in three bytes', () {
      expect(
        encodeNavigationPacket(NavigationDirection.right, 120),
        <int>[0x02, 0x00, 0x78],
      );
    });

    test('rounds and clamps distances into an unsigned 16-bit value', () {
      expect(
        encodeNavigationPacket(NavigationDirection.left, -20),
        <int>[0x01, 0x00, 0x00],
      );
      expect(
        encodeNavigationPacket(NavigationDirection.destination, 90000),
        <int>[0x05, 0xff, 0xff],
      );
    });

    test('rejects non-finite distances', () {
      expect(
        () => encodeNavigationPacket(NavigationDirection.straight, double.nan),
        throwsArgumentError,
      );
    });
  });
}
