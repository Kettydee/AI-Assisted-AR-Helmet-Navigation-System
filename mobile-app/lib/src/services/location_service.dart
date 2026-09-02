abstract interface class LocationService {
  Future<bool> acquireGpsLock();
}

/// Emulator-safe location adapter. A native adapter can request foreground
/// location permission and return the first high-accuracy fix instead.
class DemoLocationService implements LocationService {
  const DemoLocationService();

  @override
  Future<bool> acquireGpsLock() async {
    await Future<void>.delayed(const Duration(milliseconds: 650));
    return true;
  }
}
