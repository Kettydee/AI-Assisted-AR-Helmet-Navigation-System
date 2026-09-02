# Companion Mobile Application

The mobile companion application acts as the "Think + Connect" brain of the system, delegating visual feedback and sensor capture to the ESP32-S3 helmet unit over Bluetooth Low Energy (BLE).

---

## 📱 Responsibilities

1. **Turn-by-Turn Routing Engine:**
   - Interfaces with Google Maps Directions API / OpenStreetMap (OSRM).
   - Reduces each maneuver to `LEFT`, `RIGHT`, `STRAIGHT`, `U-TURN`, or `DESTINATION`.
   - Serializes only the direction and remaining distance into a compact BLE packet.
   - Pushes updates to the helmet's BLE navigation characteristic.

2. **Emergency SOS & Fall Dispatch:**
   - Subscribes to the helmet's BLE Hazard & Impact characteristic.
   - If a sustained crash or orientation flip is signaled, the app initiates a 10-second cancel countdown.
   - If not cancelled, it automatically dispatches an SMS and emergency call with live GPS coordinates to configured emergency contacts.

3. **Audio Management & Ducking:**
   - Lowers playback volume of background music when navigation audio prompts or hazard alerts trigger.
   - Speaks route prompts such as `Turn right in 120 meters` through the phone/helmet audio connection.
   - Speaks hazard prompts such as `Pothole detected. Go left` using the avoidance direction received from the helmet.
   - Routes voice calls over Bluetooth Hands-Free Profile (HFP) when the helmet's Push-To-Talk button is pressed.

4. **Crowdsourced Hazard Logging:**
   - Batches GPS-tagged bump events detected by the helmet IMU and uploads them to the central backend.

---

## 📡 BLE Protocol Specification

- **Service UUID:** `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
- **Navigation Characteristic (Write/Read):** `beb5483e-36e1-4688-b7f5-ea07361b26a8`
  - Payload format: `[Direction: 1B][DistanceMeters: 2B, big-endian]`
  - Direction IDs: `1=LEFT`, `2=RIGHT`, `3=STRAIGHT`, `4=U-TURN`, `5=DESTINATION`
  - Example: `02 00 78` means `RIGHT`, `120 m`. The ESP32 draws the arrow.
- **Hazard & SOS Characteristic (Notify):** `1c95d5e3-d8f7-413a-bf3d-7a2e5d7be87e`
  - Payload format: `[EventType: 1B][G-Force: 2B][Lat: 4B][Lon: 4B]`

The reusable OSRM-to-BLE mapping is implemented in
[`src/navigationProtocol.ts`](src/navigationProtocol.ts). The routing screen
should recalculate `distanceToManeuverMeters` from the rider's live GPS position
and write a new packet when the direction changes or the displayed distance
changes meaningfully (for example, every 10 m).

The AR display intentionally receives no words such as `GO LEFT`. It renders a
large arrow, the compact label (`LEFT`, `RIGHT`, etc.), and the distance.

Voice text is generated separately by [`src/voicePrompts.ts`](src/voicePrompts.ts).
Connect its `SpeechEngine` interface to the app's text-to-speech library. Trigger
`announceNavigation` when the routing engine emits a spoken maneuver event, not
on every distance BLE update, so the rider does not hear the same instruction
repeatedly. Trigger `announcePothole` when a new avoidance alert arrives.
