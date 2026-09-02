# System Architecture & Data Flow

This document details the multi-tier hardware, firmware, and cloud architecture for the AI-Assisted AR Helmet Navigation System.

---

## 🔁 Data Flow Pipeline

```text
[ NEO-6M GPS ] ──(NMEA UART)──┐
                              ▼
[ MPU6050 IMU] ──(I2C)───────► [ ESP32-S3 Firmware ] ──(BLE GATT)──► [ Companion Phone App ]
                              ▲                                                │
[ BH1750 Lux ] ──(I2C)────────┤                                                ▼
                              ▼                                       [ Google Maps / OSM ]
                       [ SSD1306 HUD ]                                         │
                                                                               ▼
                                                                     [ Cloud Pothole DB ]
```

### As-built variant (current prototype)

The bench prototype moves compute to a Banana Pi M4 and changes two sources; the
downstream HUD / BLE / cloud paths are unchanged. See
[`PROGRESS.md`](PROGRESS.md).

```text
[ ESP32-CAM (CameraWebServer) ] ──(Wi-Fi MJPEG http://<ip>:81/stream)──┐
                                                                       ▼
[ Waveshare SIM7600X ] ──(USB CDC: NMEA / AT+CGPSINFO)──► [ Banana Pi M4 (Armbian) ]
        │                                                        │  YOLOv8-nano (NCNN)
        └──(4G LTE)──► cloud / routing (optional)                │  gps_sim7600x.py
                                                                 ▼
                                              (UART 115200: POTHOLE_ALERT:… / GPS:…)
                                                                 ▼
                                                     [ ESP32-S3 Helmet MCU ] ──► SSD1306 HUD + audio duck + BLE
```

The SIM7600X supplies the GPS fix that the original design expected from a
NEO-6M on the ESP32; `gps_sim7600x.py` can forward compact `GPS:<lat>:<lon>:<fix>`
lines to the ESP32 over the same UART convention as the pothole alerts.

### AR navigation packet flow

```text
Destination → Maps / OSRM route → next maneuver → direction + distance
            → BLE navigation characteristic → ESP32 → HUD arrow
```

Only five map directions are supported in the MVP: `LEFT`, `RIGHT`,
`STRAIGHT`, `U-TURN`, and `DESTINATION`. A navigation BLE payload is exactly
three bytes: one direction byte followed by a two-byte big-endian distance in
metres.

When the camera detects a pothole, the Banana Pi separately chooses the clearest
of `LEFT`, `CENTER`, and `RIGHT`. That warning temporarily takes priority on the
HUD, then the display returns to the current map maneuver.

---

## 🛡️ Hazard & Crash Detection Logic

1. **Pothole Detection:**
   - Samples $a_z$ at 100 Hz.
   - If $|a_z - 1.0\text{g}| > 2.5\text{g}$ threshold, trigger bump candidate.
   - Attach current GPS latitude/longitude.
   - Send BLE notification to smartphone.

2. **Crash & SOS Detection:**
   - Detects deceleration spike $> 4.0\text{g}$ followed by static orientation angle $> 60^\circ$ (indicating bike or rider fallen).
   - Starts emergency dispatch routine with audible alert to rider.
   - If rider does not hit PTT switch within 10 seconds to abort, sends automated SMS/call with GPS coordinates to emergency services and primary emergency contacts.
