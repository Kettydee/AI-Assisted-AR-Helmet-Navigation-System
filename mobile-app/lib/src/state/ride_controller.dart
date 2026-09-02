import 'dart:async';

import 'package:flutter/foundation.dart';

import '../models/navigation_instruction.dart';
import '../services/helmet_service.dart';
import '../services/location_service.dart';
import '../services/navigation_packet.dart';

enum GpsStatus { acquiring, locked, unavailable }

enum SosState { ready, countdown, dispatched }

class RideController extends ChangeNotifier {
  RideController({
    required HelmetService helmetService,
    LocationService locationService = const DemoLocationService(),
  })  : _helmetService = helmetService,
        _locationService = locationService;

  final HelmetService _helmetService;
  final LocationService _locationService;
  StreamSubscription<bool>? _connectionSubscription;
  Timer? _rideTimer;
  Timer? _sosTimer;
  NavigationDirection? _lastSentDirection;
  int? _lastSentDistance;

  bool isHelmetConnected = false;
  bool isConnecting = false;
  bool isScanning = false;
  HelmetDevice? selectedDevice;
  GpsStatus gpsStatus = GpsStatus.acquiring;
  double speedKph = 0;
  bool isRideActive = false;
  int rideSeconds = 0;

  String destination = '';
  bool isNavigating = false;
  NavigationInstruction nextInstruction = const NavigationInstruction(
    direction: NavigationDirection.right,
    street: 'MG Road',
    distanceMeters: 320,
  );

  String emergencyContactName = 'Emergency contact';
  String emergencyContactPhone = '+91 98765 43210';
  bool crashDetectionEnabled = true;
  SosState sosState = SosState.ready;
  int sosSecondsRemaining = 10;

  double speedWarningKph = 80;
  bool potholeAlertsEnabled = true;
  bool audioAlertsEnabled = true;

  Future<void> initialize() async {
    _connectionSubscription =
        _helmetService.connectionChanges.listen((bool connected) {
      isHelmetConnected = connected;
      isConnecting = false;
      notifyListeners();
    });
    final bool hasLock = await _locationService.acquireGpsLock();
    gpsStatus = hasLock ? GpsStatus.locked : GpsStatus.unavailable;
    notifyListeners();
  }

  Future<List<HelmetDevice>> scanForHelmets() async {
    isScanning = true;
    notifyListeners();
    try {
      return await _helmetService.scan();
    } finally {
      isScanning = false;
      notifyListeners();
    }
  }

  Future<void> connectHelmet(HelmetDevice device) async {
    isConnecting = true;
    selectedDevice = device;
    notifyListeners();
    try {
      await _helmetService.connect(device);
    } catch (_) {
      isConnecting = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> disconnectHelmet() => _helmetService.disconnect();

  void toggleRide() {
    isRideActive = !isRideActive;
    if (isRideActive) {
      _rideTimer?.cancel();
      _rideTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        rideSeconds += 1;
        speedKph = 42 + (rideSeconds % 13).toDouble();
        if (isNavigating && nextInstruction.distanceMeters > 0) {
          final int distance =
              (nextInstruction.distanceMeters - 3).clamp(0, 65535).toInt();
          nextInstruction = nextInstruction.copyWith(distanceMeters: distance);
          unawaited(sendNavigationUpdate());
        }
        notifyListeners();
      });
    } else {
      _rideTimer?.cancel();
      speedKph = 0;
    }
    notifyListeners();
  }

  void setDestination(String value) {
    destination = value.trim();
    notifyListeners();
  }

  Future<void> startNavigation() async {
    if (destination.isEmpty) {
      return;
    }
    isNavigating = true;
    nextInstruction = const NavigationInstruction(
      direction: NavigationDirection.right,
      street: 'MG Road',
      distanceMeters: 320,
    );
    _lastSentDirection = null;
    _lastSentDistance = null;
    notifyListeners();
    await sendNavigationUpdate();
  }

  Future<void> stopNavigation() async {
    isNavigating = false;
    _lastSentDirection = null;
    _lastSentDistance = null;
    notifyListeners();
  }

  Future<void> sendNavigationUpdate() async {
    if (!isHelmetConnected || !isNavigating) {
      return;
    }
    final NavigationDirection direction = nextInstruction.direction;
    final int distance = nextInstruction.distanceMeters;
    final bool directionChanged = direction != _lastSentDirection;
    final bool distanceChanged = _lastSentDistance == null ||
        (distance - _lastSentDistance!).abs() >= 10;
    if (!directionChanged && !distanceChanged) {
      return;
    }
    await _helmetService.writeNavigation(
      encodeNavigationPacket(direction, distance),
    );
    _lastSentDirection = direction;
    _lastSentDistance = distance;
  }

  void setCrashDetection(bool enabled) {
    crashDetectionEnabled = enabled;
    notifyListeners();
  }

  void updateEmergencyContact(String name, String phone) {
    emergencyContactName =
        name.trim().isEmpty ? 'Emergency contact' : name.trim();
    emergencyContactPhone = phone.trim();
    notifyListeners();
  }

  void startSosTest() {
    if (!crashDetectionEnabled || sosState == SosState.countdown) {
      return;
    }
    sosState = SosState.countdown;
    sosSecondsRemaining = 10;
    _sosTimer?.cancel();
    _sosTimer = Timer.periodic(const Duration(seconds: 1), (Timer timer) {
      sosSecondsRemaining -= 1;
      if (sosSecondsRemaining <= 0) {
        timer.cancel();
        sosState = SosState.dispatched;
      }
      notifyListeners();
    });
    notifyListeners();
  }

  void cancelSos() {
    _sosTimer?.cancel();
    sosState = SosState.ready;
    sosSecondsRemaining = 10;
    notifyListeners();
  }

  void resetSos() => cancelSos();

  void setSpeedWarning(double value) {
    speedWarningKph = value;
    notifyListeners();
  }

  void setPotholeAlerts(bool enabled) {
    potholeAlertsEnabled = enabled;
    notifyListeners();
  }

  void setAudioAlerts(bool enabled) {
    audioAlertsEnabled = enabled;
    notifyListeners();
  }

  @override
  void dispose() {
    _rideTimer?.cancel();
    _sosTimer?.cancel();
    unawaited(_connectionSubscription?.cancel());
    unawaited(_helmetService.dispose());
    super.dispose();
  }
}
