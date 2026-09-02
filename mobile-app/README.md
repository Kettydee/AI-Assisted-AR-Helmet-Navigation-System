# HELMATE

HELMATE is a focused Flutter MVP with four screens: Home,
Navigation, Safety, and Settings. It is the phone-side control surface for the
ESP32-S3 helmet and keeps all detailed interaction off the helmet display.

## What is implemented

- **Home:** helmet link status, simulated live speed, GPS lock state, ride timer,
  and start/end ride control.
- **Navigation:** destination entry, route preview, next turn, live distance to
  the maneuver, and rate-limited BLE packet writes.
- **Safety:** emergency-contact editing, crash-detection toggle, SOS state, and a
  safe 10-second countdown simulation that never contacts anyone.
- **Settings:** speed-warning threshold, pothole alerts, audio alerts, and a BLE
  device picker.
- **Protocol:** the firmware-compatible three-byte navigation encoder with unit
  coverage.

The checked-in `DemoHelmetService` lets the complete UI and protocol flow run in
an emulator without helmet hardware. It exposes the same interface that a native
BLE adapter must implement, so replacing it does not affect screen code.

## Run locally

Flutter 3.22 or newer (Dart 3.4+) is required.

```bash
cd mobile-app
flutter create --platforms=android,ios .
flutter pub get
flutter run
```

`flutter create` hydrates the generated Android and iOS runner directories; the
application code, tests, and package definition are already included. Run the
checks with:

```bash
flutter analyze
flutter test
```

## BLE protocol

| Item | UUID / format |
| --- | --- |
| Service | `4fafc201-1fb5-459e-8fcc-c5c9c331914b` |
| Navigation characteristic | `beb5483e-36e1-4688-b7f5-ea07361b26a8` |
| Hazard/SOS characteristic | `1c95d5e3-d8f7-413a-bf3d-7a2e5d7be87e` |
| Navigation payload | `[direction: 1B][distance metres: 2B, big-endian]` |

Direction IDs are `1=LEFT`, `2=RIGHT`, `3=STRAIGHT`, `4=U-TURN`, and
`5=DESTINATION`. For example, `02 00 78` means right in 120 metres.

The controller sends a packet whenever the direction changes or distance changes
by at least 10 metres. Speech prompts should be triggered by maneuver events, not
these more frequent display updates.

## Production adapters still required

The MVP deliberately keeps platform effects behind service boundaries. Before a
hardware road test:

1. Replace `DemoHelmetService` with a BLE adapter that scans for the service UUID,
   discovers both characteristics, subscribes to hazard notifications, and writes
   navigation packets.
2. Feed speed and position from a foreground GPS service and add the Android/iOS
   permission declarations.
3. Connect destination search and routing to Google Maps or an OSM provider.
4. Implement emergency SMS/dialer handoff with explicit user consent and retain
   the 10-second cancel window.
5. Connect audio prompts to platform text-to-speech and Bluetooth audio routing.

The previous TypeScript protocol helpers remain in `src/` as migration reference;
the Flutter implementation used by the app lives under `lib/src/services/`.
