# Companion Mobile Application

An Expo / React Native app that acts as the "Think + Connect" brain of the
system: it holds the BLE link to the ESP32-S3 helmet unit, relays incoming
calls, and reacts to crash/SOS and pothole-bump events from the helmet's IMU.

This used to be protocol-only (pure TypeScript logic files, no app to run).
It's now a real Expo app built around that same logic — the protocol layer
moved to `src/protocol/` unchanged; everything else here wires it to a real
BLE stack, screens, and a couple of native features.

---

## 📥 Direct APK Download

Download the companion app directly to your Android device:
- 👉 **[Download `ar-helmet-nav-app-v1.2.0.apk`](https://github.com/Kettydee/AI-Assisted-AR-Helmet-Navigation-System/releases/download/app-v1.2.0/ar-helmet-nav-app-v1.2.0.apk)** (Latest v1.2.0 Release)
- **Release Page & Changelog:** [GitHub Releases](https://github.com/Kettydee/AI-Assisted-AR-Helmet-Navigation-System/releases/tag/app-v1.2.0)

---

Everything in this app — `npm run typecheck`, `npm test`, `npx expo-doctor` —
passes in the sandbox this was built in, which has no phone, emulator, or
Bluetooth hardware to actually run it against. Two pieces are honestly
stubbed rather than faked (see [`src/telephony/CallObserver.ts`](src/telephony/CallObserver.ts)):
detecting a native incoming call, and answering/declining one. Both need a
native module and on-device testing to get right — see **Next** below.

---

## 🚀 Running it

```bash
npm install
npm start          # then press `a` for Android / `i` for iOS / `w` for web
```

This app uses `react-native-ble-plx` (a native module), so **Expo Go can't
run it** — Expo Go only bundles Expo's own native modules. You need a
development build:

```bash
npx expo run:android   # or: npx expo run:ios (needs a Mac + Xcode)
```

Neither of those works without a local Android SDK or Xcode. If you don't
have either installed, build in the cloud instead — `eas.json` in this repo
already has profiles set up for it:

```bash
npm install -g eas-cli
eas login                              # free Expo account
eas build --profile preview --platform android   # standalone APK, no dev server needed
```

`eas build` prints a link when it's done; open it on your Android phone to
download and install the APK directly (no Play Store step). Use
`--profile development` instead of `preview` if you want a dev-client build
with live reload while you keep iterating on the code (needs `npm start`
running alongside it); `preview` is the one to reach for if you just want to
open the app and look at it.

Either way, without real ESP32-S3 helmet firmware nearby and broadcasting
over BLE, the **Scan** screen won't find a device to connect to — you'll see
the UI (scan list, settings, test panel) but "Connect" has nothing to pair
with yet.

`android`/`ios` folders don't exist in this repo and shouldn't be hand-edited
if they appear — Expo generates them (Continuous Native Generation) from
`app.json` and the config plugins listed there, including
`react-native-ble-plx`'s own bundled plugin (Bluetooth permissions on both
platforms, background-mode entitlements on iOS).

```bash
npm run typecheck   # tsc --noEmit against the whole app
npm test            # runs the pure-logic test suite (see Testing below)
```

---

## 🔄 Releasing an update (riders are forced to update)

Riders install the APK from GitHub Releases, so there's no Play Store to push
updates. Instead, every launch (and every return to the foreground) the app
calls the GitHub Releases API, finds the newest published `app-vX.Y.Z`
release, and if it's newer than the installed version it shows a full-screen
**Update required** page with a *Download update* button that downloads the
APK. The app can't be used until it's updated; it does **not** block when the
phone is offline or GitHub is unreachable, and a crash alert still shows on
top of it. Logic: [`src/update/`](src/update/).

To ship a new version:

1. Bump `expo.version` **and** `expo.android.versionCode` in `app.json`
   (and `version` in `package.json` to match).
2. Commit, then tag and push: `git tag app-v1.2.0 && git push origin app-v1.2.0`.
3. `.github/workflows/android-apk.yml` builds the APK and publishes the
   release. It refuses to build if the tag doesn't match `app.json`'s
   version - a mismatch would make every install think it's out of date
   forever.

The APK must keep being signed with the same key (the workflow's
prebuild debug keystore) and the same Android package name, or Android
installs it as a separate app instead of updating in place.

---

## 🗂️ Layout

```
src/
  protocol/     pure encode/decode + voice-prompt logic — see BLE Protocol Spec below
  ble/          HelmetConnection (react-native-ble-plx wrapper: runtime permissions,
                scan timeout, MTU, auto-reconnect), UUIDs, base64, error messages
  nav/          geo math + unit formatting, OSRM route parsing / progress
                (pure, tested), osrmClient (OSRM routing + Nominatim search)
  history/      hazard log + ride history records, CSV export (pure, tested)
  settings/     app preferences (pure parse/defaults)
  update/       forced-update check against GitHub Releases + UpdateGate screen
  hooks/        useSettings, useHelmetConnection, useHistory, useRide (live
                navigation engine), useCallRelay, useCrashAlert, useSpeech
  telephony/    CallObserver — native call detection/answer/decline (stubbed)
  sos/          local emergency-contact storage + crash message/dispatch
  theme/        colour/spacing/type tokens (Exo 2 font)
  components/   ui/ (AppText, Button, Card, ListRow, Banner...), HudPreview,
                CrashOverlay (full-screen SOS countdown, always mounted)
  app/          Expo Router screens — every file here is a route
```

`src/app/_layout.tsx` wraps the whole app in `HelmetConnectionProvider`,
mounts `useCallRelay` once, and renders `CrashOverlay` alongside the screen
stack rather than as a route — a crash alert needs to interrupt whatever
screen the rider is on and can't be navigated away from mid-countdown the
way a pushed route could be.

Screens: bottom tabs in `(tabs)/` — **Ride** (`index`: helmet status, start
navigation / free ride, visor preview, quick stats), **Helmet** (pairing with
permission/Bluetooth-off handling, signal bars, auto-reconnect), **Hazards**
(log of bumps/crashes with filters, map links, CSV export), **Settings**
(units, speed warning, voice, updates). Stack screens: `onboarding`
(first-launch setup), `navigate` (destination search), `ride` (full-screen
riding dashboard), `contacts` (SOS contacts, phonebook picker, test SMS),
`history` (ride history + totals), `developer` (send test arrows, raw packet
log).

---

## 📱 Responsibilities

1. **Turn-by-Turn Routing Engine:**
   - Routes with the public OSRM server and searches places with
     OpenStreetMap Nominatim (no API keys). `useRide` watches GPS, tracks
     progress along the route (`src/nav/route.ts`), reroutes when more than
     45 m off route, speaks prompts at 500/200/50 m, and warns on overspeed.
     There's no map view yet, and tracking only runs while the app is open
     (the screen is kept awake during a ride) - see Next.
   - Reduces each maneuver to `LEFT`, `RIGHT`, `STRAIGHT`, `U-TURN`, or `DESTINATION`.
   - Serializes only the direction and remaining distance into a compact BLE packet.
   - Pushes updates to the helmet's BLE navigation characteristic.

2. **Emergency SOS & Fall Dispatch:**
   - `useCrashAlert` subscribes to the helmet's BLE Hazard & SOS characteristic via `useHelmetConnection`.
   - A `CRASH_DETECTED` event means the helmet's IMU already saw a decel spike
     followed by a sustained tilt and started its own 10-second on-HUD
     countdown; the app mirrors that countdown (speaking `announceCrash`)
     rather than starting an independent one, since the two would drift apart.
   - If a `SOS_CANCELLED` event arrives before the countdown elapses, the
     rider pressed the helmet's PTT button — the overlay closes. The firmware
     stops listening for that button once its own countdown elapses (see
     `firmware/src/main.cpp`'s `loop()`), so the overlay's post-countdown
     "dispatch" screen has its own local dismiss instead of waiting for a
     `SOS_CANCELLED` that won't come.
   - Once the countdown elapses, `CrashOverlay` shows the crash's GPS
     coordinates (when `hasGpsFix` is true) and one-tap Call/Text buttons per
     saved contact — real silent auto-dispatch isn't something a normal app
     can do on either platform without special permissions, so this is the
     "one tap for whoever's holding the phone" version. See `src/sos/`.
   - `POTHOLE_BUMP` events are the crowdsourced hazard-logging signal
     described below, not a crash — no countdown or dispatch for these.

3. **Audio Management & Ducking:**
   - Lowers playback volume of background music when navigation audio prompts or hazard alerts trigger. **Not built** — needs an audio-session library; ducking during TTS specifically is often handled by the OS automatically, but explicit music control isn't wired up.
   - Speaks route prompts such as `Turn right in 120 meters` through the phone/helmet audio connection — `useSpeech` (expo-speech) implements this.
   - Speaks hazard prompts such as `Pothole detected. Go left` using the avoidance direction received from the helmet.
   - Routes voice calls over Bluetooth Hands-Free Profile (HFP) when the helmet's Push-To-Talk button is pressed — HFP audio routing itself is handled by the OS/Bluetooth stack once a call is answered; this app's job is just the answer/decline relay (see `useCallRelay`, and the CallObserver stub note above).

4. **Crowdsourced Hazard Logging:**
   - Batches GPS-tagged bump events detected by the helmet IMU and uploads them to the central backend. **Upload not built** — every hazard event is saved to a local log on the phone (Hazards tab, CSV export) but nothing uploads it yet.
   - `POTHOLE_BUMP` hazard events go to the `hazard_logs` table; `CRASH_DETECTED`/
     `SOS_CANCELLED` events go to `crash_events` (status `detected` →
     `cancelled` or `dispatched`) — see
     [`../website/supabase_schema.sql`](../website/supabase_schema.sql). This
     app has no Supabase client/auth yet (see Next), so nothing writes to
     either table today; `src/sos/contactsStore.ts`'s local, unsynced
     AsyncStorage list is a stand-in for emergency contacts until it does.

5. **Incoming Call Alerts:**
   - `useCallRelay` subscribes to the phone's native call state and, on a new
     incoming call, writes a `RINGING` packet with the caller's display name
     to the helmet's call characteristic, then an `ENDED` packet when the
     call stops ringing for any reason. **The native call-state listener
     itself is stubbed** — see `src/telephony/CallObserver.ts` and Next.
   - Speaks `Incoming call from <name>. Tap the helmet button to accept, or hold
     it to decline.` via `announceIncomingCall`.
   - Subscribes to the helmet's call-action characteristic and calls the native
     answer/reject call API when the rider taps (accept) or holds (decline) the
     helmet's PTT button. **Also stubbed** for the same reason.

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

All five characteristics are exercised end-to-end by
[`src/ble/HelmetConnection.ts`](src/ble/HelmetConnection.ts), the single
place that talks to `react-native-ble-plx` — everywhere else in the app goes
through it rather than touching the BLE library directly.

The encode/decode helpers are implemented in
[`src/protocol/callAlertProtocol.ts`](src/protocol/callAlertProtocol.ts). `useCallRelay`
writes a fresh `RINGING` packet only when a *new* call starts (not on every
native callback tick), and always follows up with `ENDED` once the phone
knows the call is no longer ringing.

The Hazard & SOS decode/encode helpers are implemented in
[`src/protocol/hazardProtocol.ts`](src/protocol/hazardProtocol.ts) (the encoder is mainly for
tests — the ESP32 is the real encoder for this characteristic).

The reusable OSRM-to-BLE mapping is implemented in
[`src/protocol/navigationProtocol.ts`](src/protocol/navigationProtocol.ts). A real routing
screen should recalculate `distanceToManeuverMeters` from the rider's live GPS position
and write a new packet when the direction changes or the displayed distance
changes meaningfully (for example, every 10 m) — `test-panel.tsx` sends fixed
test values instead, since there's no routing engine here yet.

The AR display intentionally receives no words such as `GO LEFT`. It renders a
large arrow, the compact label (`LEFT`, `RIGHT`, etc.), and the distance.

Voice text is generated separately by [`src/protocol/voicePrompts.ts`](src/protocol/voicePrompts.ts),
implemented against real speech by [`src/hooks/useSpeech.ts`](src/hooks/useSpeech.ts) (expo-speech).
`announceNavigation` fires on a spoken maneuver event, not on every distance BLE update, so the
rider doesn't hear the same instruction repeatedly. `announcePothole` fires on a new avoidance
alert. `announceIncomingCall` fires once per `RINGING` packet (the caller's raw/unsanitized name —
the ASCII sanitization in `callAlertProtocol.ts` is only needed for the HUD's BLE payload, not for
speech). `announceCrash` fires once per `CRASH_DETECTED` hazard event — this is the "audible alert
to rider" the SOS flow calls for (see [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)); it's not
repeated for `POTHOLE_BUMP` events, which are a silent background logging signal.

---

## 🧪 Testing

`npm test` compiles and runs everything under `src/protocol/`, plus a few
other pure logic files (`ble/base64.ts`, `sos/contactValidation.ts`,
`sos/crashMessage.ts`) with Node's built-in test runner — no Expo/React
Native runtime involved, matching how `vision-ai/`'s Python tests stub out
hardware-facing imports to test pure logic in isolation. This is a
*separate* TypeScript config (`tsconfig.test.json`, plain CommonJS) from the
app's own `tsconfig.json` (which extends `expo/tsconfig.base`) — see the
comments in both files if you're adding a new pure-logic file to the suite.

`HelmetConnection.ts`, the screens, and the hooks are **not** unit-tested:
they need a real BLE stack (and, practically, a real helmet) to meaningfully
exercise, which no amount of mocking substitutes for honestly. `npm run
typecheck` and `npx expo-doctor` are the checks that do run against them.

---

## Next

- **Native call detection/answer/decline** (`src/telephony/CallObserver.ts`)
  is a stub. Implementing it for real: Android needs a native module around
  `TelephonyManager`/`TelecomManager` (and likely registering as a
  call-redirection or default dialer app for the answer/decline half); iOS
  needs `CXCallObserver` (CallKit), e.g. via `react-native-callkeep`. Both
  need a real device and, likely, a Play Store/App Store policy read before
  shipping.
- **Map view + background navigation.** Routing works (OSRM), but there's
  no map on screen yet (react-native-maps needs a Google API key on Android;
  MapLibre + OSM tiles would avoid that), and GPS tracking stops if the app
  is backgrounded - a foreground-service location task (expo-task-manager)
  would keep a ride running with the screen off.
- **Supabase auth + synced SOS contacts / hazard log uploads.** Right now
  `src/sos/contactsStore.ts` is local-only (AsyncStorage, this device only)
  and `POTHOLE_BUMP`/`CRASH_DETECTED` events aren't uploaded anywhere. Once
  this app has its own Supabase client and auth (mirroring `website/`'s),
  point it at `sos_contacts`/`hazard_logs`/`crash_events` from
  `website/supabase_schema.sql`.
- **Audio ducking** for background music specifically (TTS itself is
  usually ducked automatically by the OS).
- Everything above `npm run typecheck`/`npm test`/`npx expo-doctor` passing
  in this repo needs to actually happen: a development build on a real
  Android/iOS device, paired with real ESP32-S3 firmware from this same
  repo, over a real BLE connection.
