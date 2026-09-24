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
