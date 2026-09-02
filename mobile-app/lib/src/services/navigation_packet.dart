import 'dart:typed_data';

import '../models/navigation_instruction.dart';

/// Encodes the helmet's navigation payload:
/// [direction: u8][distance metres: u16, big-endian].
Uint8List encodeNavigationPacket(
  NavigationDirection direction,
  num distanceMeters,
) {
  if (!distanceMeters.isFinite) {
    throw ArgumentError.value(
      distanceMeters,
      'distanceMeters',
      'must be finite',
    );
  }

  final int distance = distanceMeters.round().clamp(0, 65535).toInt();
  return Uint8List.fromList(<int>[
    direction.packetId,
    (distance >> 8) & 0xff,
    distance & 0xff,
  ]);
}
