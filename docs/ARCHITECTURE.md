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
