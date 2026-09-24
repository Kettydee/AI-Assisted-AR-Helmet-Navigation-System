# Build Progress Log

Running record of what is actually assembled and working on the prototype, how it
differs from the original BOM, and what is next. Newest milestones on top.

---

## Hardware as-built vs. original design

The original `README.md` / `hardware/BOM.md` design centres on an ESP32-S3 DevKit
as the core hub. The working prototype has shifted to a Banana Pi as the compute
node with the ESP32 kept for the helmet-side HUD/audio/BLE role:

| Role | Original BOM | As-built prototype |
| :-- | :-- | :-- |
| Compute / vision | ESP32-S3 + optional Pi coprocessor | **Banana Pi M4 (Armbian)** as primary compute |
| Positioning | NEO-6M GPS wired to the ESP32 | **Waveshare SIM7600X** (GNSS + 4G LTE) on the Banana Pi |
| Forward camera | USB / MIPI-CSI camera on the Pi | **ESP32-CAM** running `CameraWebServer`, consumed as an MJPEG stream over Wi-Fi |
| HUD / audio / BLE | ESP32-S3 | ESP32-S3 (unchanged, firmware in `firmware/`) |

---

## Milestones

### 2026-09-24 — mobile-app becomes a real Expo/React Native app

`mobile-app/` was pure protocol logic with no app to run it in. It's now a
scaffolded Expo SDK 57 app (`npx create-expo-app`, current template - the
Expo/RN/TS versions here are newer than any training data, which is exactly
why the scaffolding tool generated them rather than being hand-written) with
a real `react-native-ble-plx` connection wired to the exact protocol already
built and tested:

- [x] `src/ble/HelmetConnection.ts` - scans (filtered to the helmet's
      SERVICE_UUID), connects, discovers characteristics, and both writes
      (nav, call-alert) and subscribes (hazard, call-action) using the
      existing `src/protocol/*` encode/decode functions. `src/ble/base64.ts`
      is a small dependency-free codec (react-native-ble-plx exchanges
      characteristic values as base64; Hermes doesn't reliably provide
      btoa/atob).
- [x] `src/hooks/`: `useHelmetConnection` (BLE context), `useCallRelay`
      (native call state <-> the helmet's call characteristics),
      `useCrashAlert` (the counting -> dispatch state machine below),
      `useSpeech` (expo-speech, implementing the existing `SpeechEngine`
      interface).
- [x] `src/components/CrashOverlay.tsx` - always mounted at the app root
      (not a routed screen, so it can interrupt any screen and can't be
      navigated away from mid-countdown), mirrors the firmware's 10s
      countdown, then - since the firmware stops listening for a PTT cancel
      once its own countdown elapses (see main.cpp) - switches to a
      "dispatch" screen with one-tap Call/Text per saved contact rather
      than waiting on a `SOS_CANCELLED` that won't arrive.
- [x] `src/sos/`: local (AsyncStorage, unsynced) emergency contacts, and
      `Linking`-based call/text dispatch - real silent auto-dispatch isn't
      something a normal app can do on either platform without special
      carrier permissions, so this is the realistic "one tap for whoever's
      holding the phone" version.
- [x] `src/telephony/CallObserver.ts` is an honest stub, not fake native
      code: detecting a ringing call and answering/declining one both need
      a real native module (Android's telephony APIs increasingly expect
      default-dialer status; iOS needs CallKit) and on-device testing
      neither of which this sandbox can do. It defines the exact interface
      `useCallRelay` is built against, with a console.warn default, so
      nothing pretends to work that doesn't.
- [x] Screens (`src/app/`, Expo Router): `index` (status), `scan` (BLE
      device list), `test-panel` (send raw nav packets / view the last
      hazard event - explicitly not real turn-by-turn nav, there's no
      routing engine here), `settings` (local SOS contacts).
- [x] `docs.expo.dev` is blocked by this sandbox's network policy, and
      `npx expo install`/`expo-doctor`'s React Native Directory check both
      failed the same way (need network this sandbox doesn't have) - so API
      correctness was verified a different, arguably more reliable way:
      reading the actual installed packages' `.d.ts` files directly out of
      `node_modules` for the exact versions in use (confirmed
      `expo-speech`'s `speak()`/`stop()`/`isSpeakingAsync()` signatures and
      `react-native-ble-plx`'s `BleManager`/`Device` API and bundled Expo
      config plugin this way) rather than trusting training data older than
      this SDK.
- [x] Split every pure-logic file (base64, contact validation, crash
      message formatting) from anything that imports `react-native`/
      `expo-*`/AsyncStorage, so `npm test` (Node's test runner, no RN
      runtime) can keep covering it the same way `src/protocol/*` already
      was - 44 tests, all passing. `npm run typecheck` passes clean across
      the *entire* app including the RN/JSX screens, and `npx expo-doctor`
      passes 19/21 checks (the 2 failures are the same network block, not
      project issues).
- [x] Nothing here has run on a device, an emulator, or against a real
      helmet - Expo Go can't run this app at all (react-native-ble-plx is a
      native module), and this sandbox has no way to build/run a
      development build either. See mobile-app/README.md's Next section.

### 2026-09-24 — Small fixes: stale banner, schema, serial reconnect

- [x] Root `README.md`'s "🌟 Branch: `ml-pothole-training`" banner was stale
      (that branch was already merged to `main` back in PR #2) — replaced
      with a plain pointer to `POTHOLE_TRAINING.md`. Added a CI badge next
      to the others while in there.
- [x] `website/supabase_schema.sql` gained `hazard_logs` (`POTHOLE_BUMP`
      events) and `crash_events` (`CRASH_DETECTED`/`SOS_CANCELLED`, status
      `detected`→`cancelled`/`dispatched`) tables, matching what the
      firmware's Hazard characteristic now actually sends — previously only
      `sos_contacts` existed. RLS verified for real, not just written and
      trusted: spun up a local Postgres 16, stubbed Supabase's
      `auth.users`/`auth.uid()`, ran the full schema file against it, then
      confirmed under `SET ROLE` (not as superuser, which bypasses RLS) that
      one user's rows are invisible to another and that inserting a row
      with someone else's `user_id` is rejected.
- [x] `bpi_inference.py`'s serial link now reconnects like the camera
      stream already did: a failed `ser.write()` drops the handle, and the
      next hazard alert (throttled to once every few seconds) retries
      opening the port instead of crashing the process over an unplugged
      USB-serial adapter.

### 2026-09-24 — CI + test coverage for previously-untested code

There was no `.github/workflows` at all before this, and several files with
real logic (`bpi_inference.py`, `train.py`'s new dataset/calibration code,
every `mobile-app/src/*.ts` file) had no tests.

- [x] `.github/workflows/ci.yml` (new) — four jobs: `vision-ai-tests` (Python
      `unittest discover`, lightweight deps only — deliberately not the full
      `requirements.txt`, since none of the tests need torch/ultralytics/
      opencv), `mobile-app-tests` (typecheck + `node --test`),
      `website-build` (`tsc && vite build`), `firmware-build` (`pio run`).
      Every job except `firmware-build` was actually run and verified green
      in this sandbox before being wired into CI; `firmware-build` needs a
      real PlatformIO/ESP32 toolchain download this sandbox can't do, so
      that one is unverified — written from PlatformIO's documented CI
      usage, not tested.
- [x] `vision-ai/test_bpi_inference.py`, `vision-ai/test_train.py` (new) —
      stub `cv2`/`ultralytics` in `sys.modules` before importing (same
      dependency-avoidance trick as the other test files) to test
      `resolve_confidence`/`is_network_source`/the dataset-merge+split+
      calibration logic without needing those installed.
- [x] `mobile-app/src/*.test.ts` (new, one per source file) using Node's
      built-in test runner. This needed `mobile-app/package.json` +
      `tsconfig.json` (mobile-app had neither before — nothing to `npm
      test` with) and `@types/node`, since raw `node:test`/`node:assert`
      imports don't typecheck without it.
      Two real bugs surfaced only by actually running this, not just
      writing it: `node --test dist` silently tries to `require("dist")`
      as a bare module specifier (not "scan this directory") when there's
      no `index.js` in it, and running bare `node --test` picks up the
      `.ts` sources too via Node 22's native TS support, which then fail
      on extension-less imports under ESM resolution. Fixed by pointing
      the test script at an explicit glob, `dist/**/*.test.js`.

### 2026-09-24 — MPU6050 crash/SOS + BH1750 auto-brightness

`docs/ARCHITECTURE.md`'s "Hazard & Crash Detection Logic" and the BOM's
MPU6050/BH1750 were already documented and in `platformio.ini`'s lib_deps,
but `firmware/src/main.cpp` never actually read either sensor — this wires
both up:

- [x] Pothole-bump logging: `|az - 1g| > POTHOLE_Z_THRESHOLD` sends a
      `POTHOLE_BUMP` hazard event (debounced, `POTHOLE_BUMP_COOLDOWN_MS`).
- [x] Crash/SOS: a decel spike past `CRASH_DECEL_THRESHOLD` arms a
      `CRASH_CONFIRM_WINDOW_MS` watch; if accelerometer-derived roll stays
      past `TILT_ROLL_THRESHOLD` for `CRASH_STATIC_HOLD_MS`, it's confirmed
      as a crash (not just a hard bump) — sends `CRASH_DETECTED`, shows a
      countdown on the HUD, and any PTT press within `SOS_COUNTDOWN_MS`
      cancels it (`SOS_CANCELLED`). ±8g accelerometer range so
      `CRASH_DECEL_THRESHOLD` (4g) doesn't clip at the MPU6050's default ±2g.
      No gyro fusion — the architecture doc's own "static orientation" check
      is exactly the case plain accelerometer-derived roll is valid for.
- [x] `pHazardCharacteristic` (created since the original scaffold but never
      actually notified) now carries all three event types:
      `[EventType:1B][G-Force:2B big-endian][Lat:4B big-endian][Lon:4B big-endian]`,
      lat/lon fixed-point (`deg*1e6`) rather than raw floats to sidestep
      float-endianness ambiguity for the phone-side decoder.
- [x] `mobile-app/src/hazardProtocol.ts` (new) — decode/encode pair for the
      above, paired with `voicePrompts.ts`'s new `announceCrash`.
      `mobile-app/README.md` updated with the concrete byte layout (it
      previously only sketched field sizes, no encoding).
- [x] BH1750 ambient light throttled to `LIGHT_READ_INTERVAL_MS`, driving
      `display.dim()` below `LOW_LIGHT_LUX_THRESHOLD` lux. This is a binary
      contrast preset, not the continuous PWM the README describes — see
      Next.
- [x] Both sensors degrade gracefully (IMU/light features just disable
      themselves) if not wired up, rather than blocking boot like the OLED.
- [x] `loop()` refactored to compute `millis()` once (`now`) and reuse it,
      instead of scattered separate `millis()` calls.
- [x] Verified the state machine (impact→tilt-confirm→confirmed→countdown→
      cancel/expire, including a restarted tilt hold not inheriting prior
      progress) and the hazard-event byte-packing (including negative
      lat/lon and g-force clamping) against a scripted C++ harness — no
      ESP32 toolchain in this sandbox, so nothing here has run on real
      hardware or a real MPU6050/BH1750.

### 2026-09-24 — Pothole model pipeline upgrade

This sandbox has no GPU and no dataset beyond what `train.py` downloads, so
none of this is a claim that a better checkpoint has already been trained —
it upgrades the *pipeline* so that running it (on a GPU, e.g. the Colab T4
link above) produces a better-calibrated model than before.

- [x] `vision-ai/train.py` can now merge in any number of extra single-class
      YOLO-format datasets via `--extra-data` (repeatable), re-splitting the
      combined pool 70/20/10 train/val/test — the actual mechanism for
      "train with many more images" beyond the one built-in IVCNZ download.
      Multi-class sources are rejected rather than silently mislabeled.
- [x] Stronger default training hyperparameters: up to 100 epochs with
      early stopping (`--patience 25`), cosine LR, AdamW, mixup + rotation
      augmentation.
- [x] Post-training confidence calibration: sweeps confidence thresholds on
      the val split, picks the best-F1 threshold, reports final
      precision/recall/mAP50 on a held-out test split, and writes
      `model_metadata.json` next to the exported weights.
- [x] `vision-ai/bpi_inference.py` reads that calibrated threshold
      automatically (explicit `--conf` still overrides it) instead of a
      guessed constant, exposes `--iou`, and now requires a hazard to
      reappear in `--consensus-hits` of the last `--consensus-frames` frames
      (default 2 of 3) before alerting, to cut single-frame false positives.
      ONNX export now runs with `simplify=True`.
      The dataset-merge/split and calibration logic was verified against
      synthetic fixtures with a stubbed `ultralytics` module (no GPU
      needed); the actual Ultralytics `train()`/`val()`/`export()` calls
      still need a real run to confirm against the installed version.

### 2026-09-24 — Incoming call alerts on the HUD

New BLE characteristics let the phone push incoming-call state to the helmet
and get the rider's answer/decline back, without a second physical button:

- [x] `mobile-app/src/callAlertProtocol.ts` — `encodeCallAlertPacket`/
      `decodeCallAction`, ASCII-sanitized + length-capped caller name (the
      SSD1306's default font can't render non-ASCII, and the 18-byte cap
      keeps the packet inside the default 20-byte BLE ATT write payload).
      `voicePrompts.ts` gained `announceIncomingCall`.
- [x] `firmware/src/main.cpp` — two new BLE characteristics (call alert
      write, call action notify), a HUD call screen (priority: pothole >
      call > nav), and a `CALL_ALERT_TIMEOUT_MS` safety net if the phone's
      `ENDED` write is lost.
- [x] The PTT button now does double duty: while a call is ringing, a short
      press (< `PTT_LONG_PRESS_MS`) sends `ACCEPT` and a long press sends
      `DECLINE`. This needed rewriting the old blocking
      `if (digitalRead(...)) { ...; delay(300); }` PTT check into a
      debounced, non-blocking press/release state machine — the blocking
      version could have dropped bytes arriving on `BpiSerial` during the
      delay, and couldn't time a press anyway. Outside a call it still
      triggers the voice assistant, now once per press instead of
      repeating every loop while held.
- [x] `AUDIO_MUTE_PIN` is now driven by one combined
      `visionAlertActive || callAlertActive` expression instead of each
      alert independently setting HIGH/LOW, which used to let one alert's
      cleanup un-mute audio out from under the other.
- [x] Verified with a scripted C++ harness mirroring the debounce/short/
      long-press state machine and the packet-clamping arithmetic
      line-for-line (15 checks) and a Node/tsc run of the TS encode/decode
      round-trip (22 checks) — no ESP32 toolchain in this sandbox, so
      nothing here has been flashed to real hardware.

### 2026-09 — Hardware bring-up + integration hooks

- [x] **Banana Pi M4** flashed with **Armbian**, boots and is reachable over the network.
- [x] **ESP32-CAM** flashed with the stock Arduino `CameraWebServer` sketch; MJPEG
      stream reachable at `http://<esp32-cam-ip>:81/stream`.
- [x] **Waveshare SIM7600X** enumerated on the Banana Pi; GNSS engine powered via
      `AT+CGPS=1` and a **position fix acquired** (`AT+CGPSINFO`).
- [x] `vision-ai/gps_sim7600x.py` added — dependency-light SIM7600X GNSS reader
      (AT+CGPSINFO and NMEA modes), JSON on stdout, optional compact
      `GPS:<lat>:<lon>:<fix>` forward to the ESP32 over UART. Unit tested in
      `vision-ai/test_gps_sim7600x.py`.
- [x] `vision-ai/bpi_inference.py` — `--camera` now accepts an `http(s)`/`rtsp`
      stream URL (ESP32-CAM) with newest-frame buffering and auto-reconnect;
      local camera indices/devices unchanged.
- [x] `hardware/wiring/sim7600x.md` added — USB/UART enumeration and antenna notes.
- [x] `firmware/src/main.cpp` now parses the `GPS:<lat>:<lon>:<fix>` lines
      `gps_sim7600x.py --serial-out` forwards over the existing Banana Pi UART
      (alongside `POTHOLE_ALERT`), storing the latest fix and lighting a small
      GPS-lock dot on the SSD1306 HUD; a fix is dropped after
      `GPS_FIX_TIMEOUT_MS` (5 s) of silence.

### Earlier — Software scaffolding (see `git log`)

- [x] Project scaffold, docs, BOM, optics design.
- [x] Banana Pi YOLOv8-nano pothole pipeline: `bpi_inference.py`, `train.py`,
      NCNN/ONNX export, lane + area gating, UART `POTHOLE_ALERT` alerts.
- [x] ESP32-S3 firmware: SSD1306 HUD arrow rendering, BLE nav characteristic,
      UART listener for Banana Pi hazard alerts, audio-duck pin.
- [x] Companion app protocol: `navigationProtocol.ts` (OSRM → 3-byte BLE packet),
      `voicePrompts.ts` (TTS), `avoidance.py` corridor picker + tests.

---

## Next

- [ ] Watch the first real run of `.github/workflows/ci.yml`'s
      `firmware-build` job (Actions tab) and fix whatever it turns up —
      it's the one CI job this sandbox had no way to actually execute
      (no PlatformIO/ESP32 toolchain here), so it's the least trustworthy
      part of the new workflow.
- [ ] Actually run `train.py` on a GPU machine — ideally with `--extra-data`
      pointed at more labeled pothole images beyond the built-in IVCNZ set —
      to produce and commit/document a stronger checkpoint. Nothing in this
      sandbox can do that (no GPU, no extra dataset to point at yet).
- [ ] Flash to real hardware with an MPU6050 + BH1750 wired up and confirm:
      a hard tap logs `POTHOLE_BUMP`; an actual drop/tilt test confirms
      `CRASH_DETECTED` + the HUD countdown + PTT cancel; lux swings (hand
      over the sensor) actually dim the HUD. The thresholds
      (`CRASH_DECEL_THRESHOLD`, `TILT_ROLL_THRESHOLD`, etc.) came from the
      architecture doc, not from tuning against a real sensor.
- [ ] Replace `display.dim()`'s binary contrast with continuous PWM (needs
      the SSD1306's raw `SETCONTRAST` command, which wasn't worth guessing
      at without hardware to verify the exact sequence against).
- [ ] Flash the updated firmware to real ESP32-S3 hardware and confirm the two
      new call characteristics end to end: write a `RINGING` packet from a BLE
      tool (e.g. nRF Connect) and check the HUD screen + PTT tap/hold produces
      an `ACCEPT`/`DECLINE` notification. Nothing in this sandbox can do that
      (no ESP32 toolchain, no BLE hardware).
- [ ] Wire `callAlertProtocol.ts` into an actual companion app: a real
      telephony listener (Android `PhoneStateListener`/iOS CallKit) to fire
      `RINGING`/`ENDED`, and the native answer/reject call APIs behind the
      `ACCEPT`/`DECLINE` notification. This repo only has the protocol/logic
      layer, same as `navigationProtocol.ts` — no app scaffold exists yet to
      wire it into.
- [ ] Run `bpi_inference.py` against the live ESP32-CAM stream on the Banana Pi and
      record achievable FPS with the NCNN model at 416 and 320 px.
- [ ] Feed `gps_sim7600x.py` output into a telemetry/SOS process (GPS-tagged bump
      logging, crash-dispatch coordinates).
- [ ] Confirm the Banana Pi ↔ ESP32-S3 UART wiring end to end on real hardware
      (`POTHOLE_ALERT` + `GPS:` lines) — firmware now parses both; look for the
      GPS-lock dot on the HUD to confirm the `GPS:` path.
- [ ] Bring up the SSD1306 HUD + BLE on the ESP32-S3 hardware.
- [ ] Decide whether routing/SOS stays on a companion phone or moves onto the
      Banana Pi over the SIM7600X data connection.

---

## Team contributions

| Contributor | Area |
| :-- | :-- |
| S Sanjith (@Sanjith-Jam) | — |
| Rayna Agarwal (@raynaagarwal01-rgb) | Hardware bring-up (Armbian, ESP32-CAM, SIM7600X GPS); SIM7600X GNSS reader + ESP32-CAM stream integration; companion app protocol (`navigationProtocol.ts`, `voicePrompts.ts`); `avoidance.py` corridor picker + tests; HUD arrow rendering; demo tooling |
| Khirabdi Tanaya Dash (@Kettydee) | Project scaffold, docs, BOM, optics; Banana Pi YOLOv8-nano vision pipeline and NCNN/ONNX export; ESP32 UART hazard-alert path |
| Maxime Mahieu Jose (@MaximeMahieu) | — |
| Kavin Ram | — |
