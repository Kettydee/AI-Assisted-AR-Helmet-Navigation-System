# 👁️ Vision-Based Pothole Detection on Banana Pi BPI-M4

This module integrates real-time forward-facing computer vision into the **AI-Assisted AR Helmet Navigation System**, leveraging a **Banana Pi BPI-M4** Single Board Computer (SBC) running an optimized **YOLOv8-nano (NCNN / ONNX)** model.

---

## 🎯 Architecture & Responsibility

While the helmet's **ESP32-S3** manages display rendering, audio ducking, and BLE communication, the **Banana Pi BPI-M4** acts as a dedicated edge-vision coprocessor:
1. Ingests video frames from a forward-facing helmet-mounted wide-angle camera. On the current prototype this is an **ESP32-CAM** running the stock Arduino `CameraWebServer` sketch, consumed as an MJPEG stream over Wi-Fi (`http://<esp32-cam-ip>:81/stream`); a USB or MIPI-CSI camera on the Pi works too.
2. Runs lightweight neural network inference using ARM NEON vector instructions via **NCNN**.
3. Applies **lane gating** (filtering only the rider’s central 50% path) and **minimum defect area** filtering.
4. Scores the visible `LEFT`, `CENTER`, and `RIGHT` corridors and selects the least-obstructed path.
5. Streams the pothole warning and selected direction over UART to the ESP32-S3 to render an avoidance arrow and duck audio volume.

```text
[ Wide-Angle Camera ] ──(USB/CSI)──► [ Banana Pi BPI-M4 ]
                                            │
                                  (YOLOv8-nano NCNN 416x416)
                                            │
                              [ Lane & Hazard Filtering ]
                                            │
                                (UART @ 115200 Baud)
                                            ▼
                                   [ ESP32-S3 Helmet MCU ]
                                            │
                          ┌─────────────────┴─────────────────┐
                          ▼                                   ▼
                   [ SSD1306 HUD ]                 [ Audio Ducking Amp ]
             warning + direction arrow               Mutes Media Playback
```

UART alerts use `POTHOLE_ALERT:<direction>:<confidence>:<area>`, for example
`POTHOLE_ALERT:RIGHT:0.87:5420`. The ESP32 converts the direction into an arrow;
it never needs a bitmap or display sentence from the vision computer.

> [!CAUTION]
> The direction is based only on visible pothole occupancy. It does not detect
> traffic beside or behind the rider and must not be treated as confirmation
> that a lane change is safe.

---

## 🔌 Hardware Wiring: Banana Pi M4 ↔ ESP32-S3

Connect the Banana Pi 40-pin GPIO header to the ESP32-S3 DevKit pins as follows:

| Banana Pi BPI-M4 Header Pin | BPI Function | ESP32-S3 Pin | Function |
| :--- | :--- | :--- | :--- |
| **Pin 8** | UART TX (`/dev/ttyS1`) | **GPIO 18** | UART RX (`BPI_UART_RX_PIN`) |
| **Pin 10** | UART RX (`/dev/ttyS1`) | **GPIO 19** | UART TX (`BPI_UART_TX_PIN`) |
| **Pin 6** | Ground (GND) | **GND** | Common Ground |
| **Micro-USB / 5V In** | 5V Power Supply | **5V Rail** | Powered from 5V 3A step-down regulator |

> [!CAUTION]
> Always ensure a **common ground (GND)** between the Banana Pi and ESP32-S3 to prevent UART logic level reference floating.

---

## 🚀 Step-by-Step Setup on Banana Pi M4 (Armbian / Debian)

### 1. System Dependencies
Update your packages and install essential build libraries:
```bash
sudo apt update && sudo apt install -y python3-pip python3-opencv libvulkan-dev v4l-utils git
```

### 2. Install Python Dependencies
```bash
cd vision-ai
pip3 install -r requirements.txt
```

### 3. Verify Camera Device
Check that your camera is recognized:
```bash
v4l2-ctl --list-devices
# Usually enumerates as /dev/video0
```

---

## 🏃 Running Edge Inference

### Testing with Graphical HUD (HDMI / VNC)
```bash
python3 bpi_inference.py \
  --model best_ncnn_model \
  --camera /dev/video0 \
  --serial-port /dev/ttyS1 \
  --conf 0.50 \
  --threads 4
```

### Using the ESP32-CAM Wi-Fi stream instead of a local camera
Point `--camera` at the ESP32-CAM's MJPEG endpoint. The runner keeps only the
newest frame and automatically tears down and reopens the capture if the stream
drops (the ESP32-CAM closes the socket under Wi-Fi congestion):
```bash
python3 bpi_inference.py \
  --model best_ncnn_model \
  --camera http://192.168.4.1:81/stream \
  --serial-port /dev/ttyS1 \
  --headless \
  --threads 4
```

### Production Headless Mode (Helmet Internal Runtime)
Run in headless mode without X11 display overhead to maximize FPS and reduce power consumption:
```bash
python3 bpi_inference.py \
  --model best_ncnn_model \
  --camera /dev/video0 \
  --serial-port /dev/ttyS1 \
  --conf 0.50 \
  --headless \
  --threads 4
```

---

## 🛰️ GPS via the Waveshare SIM7600X

The prototype gets position (and 4G connectivity) from a **Waveshare SIM7600X**
on the Banana Pi rather than a wired NEO-6M on the ESP32. `gps_sim7600x.py`
powers the GNSS engine and emits line-delimited JSON fixes; see
[`../hardware/wiring/sim7600x.md`](../hardware/wiring/sim7600x.md) for port
enumeration and antenna notes.

```bash
# One-shot sanity check over the AT port (AT+CGPSINFO polling)
python3 gps_sim7600x.py --mode at --once

# Continuous, reading the dedicated NMEA port and also forwarding compact
# GPS:<lat>:<lon>:<fix> lines to the ESP32 over UART
python3 gps_sim7600x.py --mode nmea --serial-out /dev/ttyS1
```

Default ports are `/dev/ttyUSB2` (AT) and `/dev/ttyUSB1` (NMEA); override with
`--at-port` / `--nmea-port`. The JSON shape is
`{"source","fix","lat","lon","utc",...}` so telemetry logging and SOS dispatch
can consume it directly.

---

## ⚡ Autostart on Boot (Systemd Service)

To run the vision detection automatically whenever the helmet powers on:

1. Create a service file:
   ```bash
   sudo nano /etc/systemd/system/pothole-vision.service
   ```

2. Add the following configuration:
   ```ini
   [Unit]
   Description=Banana Pi M4 Pothole Vision Runner
   After=network.target

   [Service]
   Type=simple
   User=pi
   WorkingDirectory=/home/pi/AI-Assisted-AR-Helmet-Navigation-System/vision-ai
   ExecStart=/usr/bin/python3 bpi_inference.py --model best_ncnn_model --camera /dev/video0 --serial-port /dev/ttyS1 --headless --threads 4
   Restart=always
   RestartSec=3

   [Install]
   WantedBy=multi-user.target
   ```

3. Enable and start:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable pothole-vision.service
   sudo systemctl start pothole-vision.service
   ```

---

## ❄️ Thermal & Performance Optimization

1. **Passive/Active Heatsink:** The RTD1395 / H618 processor on the Banana Pi M4 will reach 65–75°C under continuous 4-core inference. Attach an aluminum heatsink and ensure case ventilation.
2. **Resolution Tuning:** The default resolution is 416×416. If higher framerates are needed, you can export at 320×320:
   ```bash
   python3 train.py --imgsz 320 --epochs 60
   ```
   This will yield ~12–15 FPS on Cortex-A53 cores.
