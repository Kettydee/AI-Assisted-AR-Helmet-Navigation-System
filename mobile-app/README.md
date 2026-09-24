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
   - Subscribes to the helmet's BLE Hazard & SOS characteristic.
   - A `CRASH_DETECTED` event means the helmet's IMU already saw a decel spike
     followed by a sustained tilt and started its own 10-second on-HUD
     countdown; the app should mirror that countdown (speaking
     `announceCrash` from [`src/voicePrompts.ts`](src/voicePrompts.ts)) rather
     than starting an independent one, since the two would drift apart.
   - If a `SOS_CANCELLED` event arrives before the countdown elapses, the
     rider pressed the helmet's PTT button — abort the dispatch.
   - If the countdown elapses with no `SOS_CANCELLED`, dispatch an SMS and
     emergency call with the event's GPS coordinates (when `hasGpsFix` is
     true) to configured emergency contacts.
   - `POTHOLE_BUMP` events are the crowdsourced hazard-logging signal
     described below, not a crash — no countdown or dispatch for these.

3. **Audio Management & Ducking:**
   - Lowers playback volume of background music when navigation audio prompts or hazard alerts trigger.
   - Speaks route prompts such as `Turn right in 120 meters` through the phone/helmet audio connection.
   - Speaks hazard prompts such as `Pothole detected. Go left` using the avoidance direction received from the helmet.
   - Routes voice calls over Bluetooth Hands-Free Profile (HFP) when the helmet's Push-To-Talk button is pressed.

4. **Crowdsourced Hazard Logging:**
   - Batches GPS-tagged bump events detected by the helmet IMU and uploads them to the central backend.
   - `POTHOLE_BUMP` hazard events go to the `hazard_logs` table; `CRASH_DETECTED`/
     `SOS_CANCELLED` events go to `crash_events` (status `detected` →
     `cancelled` or `dispatched`) — see
     [`../website/supabase_schema.sql`](../website/supabase_schema.sql).

5. **Incoming Call Alerts:**
   - Subscribes to the phone's native call state (e.g. Android `TelephonyManager`/
     `PhoneStateListener`, iOS CallKit) and, on a new incoming call, writes a
     `RINGING` packet with the caller's display name to the helmet's call
     characteristic, then an `ENDED` packet when the call stops ringing for any
     reason (answered elsewhere, declined elsewhere, or timed out).
   - Speaks `Incoming call from <name>. Tap the helmet button to accept, or hold
     it to decline.` via [`src/voicePrompts.ts`](src/voicePrompts.ts)'s
     `announceIncomingCall`.
   - Subscribes to the helmet's call-action characteristic and calls the native
     answer/reject call API when the rider taps (accept) or holds (decline) the
     helmet's PTT button.

---

## 📡 BLE Protocol Specification

- **Service UUID:** `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
- **Navigation Characteristic (Write/Read):** `beb5483e-36e1-4688-b7f5-ea07361b26a8`
  - Payload format: `[Direction: 1B][DistanceMeters: 2B, big-endian]`
  - Direction IDs: `1=LEFT`, `2=RIGHT`, `3=STRAIGHT`, `4=U-TURN`, `5=DESTINATION`
  - Example: `02 00 78` means `RIGHT`, `120 m`. The ESP32 draws the arrow.
- **Hazard & SOS Characteristic (Notify):** `1c95d5e3-d8f7-413a-bf3d-7a2e5d7be87e`
  - Helmet → phone, from the MPU6050 IMU. Payload format:
    `[EventType: 1B][G-Force: 2B big-endian][Lat: 4B big-endian][Lon: 4B big-endian]`
  - EventType: `1=POTHOLE_BUMP`, `2=CRASH_DETECTED`, `3=SOS_CANCELLED`
  - G-Force is fixed-point, `round(g * 100)` as an unsigned 16-bit int (e.g.
    `550` = `5.50g`), clamped to `[0, 655.35]`.
  - Lat/Lon are fixed-point signed 32-bit ints, `round(deg * 1_000_000)` —
    matching the 6-decimal precision `vision-ai/gps_sim7600x.py` already
    uses — rather than raw floats, so there's no float-endianness ambiguity
    to get wrong on this side. The helmet sends `(0, 0)` when it has no GPS
    fix yet; treat that as "no location," not the middle of the ocean.
- **Call Alert Characteristic (Read/Write):** `77c1bfdd-ed70-4894-b5c5-7e973c7793ec`
  - Phone → helmet. Payload format: `[EventType: 1B][NameLength: 1B][Name: up to 18 ASCII bytes]`
  - EventType: `1=RINGING`, `2=ENDED` (name omitted/ignored for `ENDED`)
  - The 18-byte cap plus the 2-byte header keeps the packet at the default
    20-byte BLE ATT write payload, so it works without negotiating a larger MTU.
  - The HUD only renders ASCII (Adafruit GFX's default font), so non-ASCII
    characters in the caller name are replaced with `?` before encoding.
- **Call Action Characteristic (Notify):** `1f221721-edb9-4bd8-b18b-df997197e3d0`
  - Helmet → phone. Payload format: `[Action: 1B]`, `1=ACCEPT`, `2=DECLINE`
  - Sent once, when the rider releases the PTT button while a call is ringing:
    a short press (< 600 ms) is `ACCEPT`, a long press (≥ 600 ms) is `DECLINE`.

The encode/decode helpers are implemented in
[`src/callAlertProtocol.ts`](src/callAlertProtocol.ts). The routing screen
should write a fresh `RINGING` packet only when a *new* call starts (not on
every native callback tick), and always follow up with `ENDED` once the phone
knows the call is no longer ringing.

The Hazard & SOS decode/encode helpers are implemented in
[`src/hazardProtocol.ts`](src/hazardProtocol.ts) (the encoder is mainly for
tests — the ESP32 is the real encoder for this characteristic).

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
Trigger `announceIncomingCall` once per `RINGING` packet written to the call
characteristic (the caller's raw/unsanitized name — the ASCII sanitization in
`callAlertProtocol.ts` is only needed for the HUD's BLE payload, not for speech).
Trigger `announceCrash` once per `CRASH_DETECTED` hazard event — this is the
"audible alert to rider" the SOS flow calls for (see
[`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)); don't repeat it for
`POTHOLE_BUMP` events, which are a silent background logging signal.
