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

- [ ] Actually run `train.py` on a GPU machine — ideally with `--extra-data`
      pointed at more labeled pothole images beyond the built-in IVCNZ set —
      to produce and commit/document a stronger checkpoint. Nothing in this
      sandbox can do that (no GPU, no extra dataset to point at yet).
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
