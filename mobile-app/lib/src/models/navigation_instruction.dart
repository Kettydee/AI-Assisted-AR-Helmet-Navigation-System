enum NavigationDirection {
  left(1, 'LEFT'),
  right(2, 'RIGHT'),
  straight(3, 'STRAIGHT'),
  uTurn(4, 'U-TURN'),
  destination(5, 'ARRIVE');

  const NavigationDirection(this.packetId, this.label);

  final int packetId;
  final String label;
}

class NavigationInstruction {
  const NavigationInstruction({
    required this.direction,
    required this.street,
    required this.distanceMeters,
  });

  final NavigationDirection direction;
  final String street;
  final int distanceMeters;

  NavigationInstruction copyWith({int? distanceMeters}) {
    return NavigationInstruction(
      direction: direction,
      street: street,
      distanceMeters: distanceMeters ?? this.distanceMeters,
    );
  }
}
