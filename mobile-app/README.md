# Companion Mobile Application

The mobile companion application acts as the "Think + Connect" brain of the system, delegating visual feedback and sensor capture to the ESP32-S3 helmet unit over Bluetooth Low Energy (BLE).

---

## 📱 Responsibilities

1. **Turn-by-Turn Routing Engine:**
   - Interfaces with Google Maps Directions API / OpenStreetMap (OSRM).
   - Serializes current route maneuver (e.g., `TURN_LEFT`, `ROUNDABOUT_2`, `EXIT_RIGHT`) and remaining distance into binary packets.
   - Pushes updates to the helmet's BLE navigation characteristic.

2. **Emergency SOS & Fall Dispatch:**
   - Subscribes to the helmet's BLE Hazard & Impact characteristic.
   - If a sustained crash or orientation flip is signaled, the app initiates a 10-second cancel countdown.
   - If not cancelled, it automatically dispatches an SMS and emergency call with live GPS coordinates to configured emergency contacts.

3. **Audio Management & Ducking:**
   - Lowers playback volume of background music when navigation audio prompts or hazard alerts trigger.
   - Routes voice calls over Bluetooth Hands-Free Profile (HFP) when the helmet's Push-To-Talk button is pressed.

4. **Crowdsourced Hazard Logging:**
   - Batches GPS-tagged bump events detected by the helmet IMU and uploads them to the central backend.

---

## 📡 BLE Protocol Specification

- **Service UUID:** `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
- **Navigation Characteristic (Write/Read):** `beb5483e-36e1-4688-b7f5-ea07361b26a8`
  - Payload format: `[ManeuverID: 1B][DistanceMeters: 2B][SpeedLimit: 1B]`
- **Hazard & SOS Characteristic (Notify):** `1c95d5e3-d8f7-413a-bf3d-7a2e5d7be87e`
  - Payload format: `[EventType: 1B][G-Force: 2B][Lat: 4B][Lon: 4B]`
