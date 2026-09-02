#!/usr/bin/env python3
"""
Banana Pi BPI-M4 Real-Time Pothole Edge Detection & ESP32-S3 Telemetry Runner
Author: AI-Assisted AR Helmet Team
"""

import argparse
import os
import sys
import time
import cv2

try:
    import serial
except ImportError:
    serial = None

from ultralytics import YOLO

def parse_args():
    parser = argparse.ArgumentParser(description="Banana Pi M4 Pothole Edge Inference Runner")
    parser.add_argument("--model", type=str, default="best_ncnn_model",
                        help="Path to trained model (NCNN directory, ONNX, or PyTorch weights)")
    parser.add_argument("--camera", type=str, default="0",
                        help="Camera index or device path (e.g. 0 or /dev/video0)")
    parser.add_argument("--serial-port", type=str, default=None,
                        help="Serial port connected to ESP32-S3 (e.g., /dev/ttyS1, /dev/ttyUSB0)")
    parser.add_argument("--baudrate", type=int, default=115200,
                        help="UART baud rate")
    parser.add_argument("--conf", type=float, default=0.50,
                        help="Confidence threshold for detection")
    parser.add_argument("--area-threshold", type=int, default=2200,
                        help="Minimum bounding box pixel area to trigger high-severity alert")
    parser.add_argument("--lane-margin", type=float, default=0.25,
                        help="Fraction of frame width on sides excluded from rider center lane")
    parser.add_argument("--headless", action="store_true",
                        help="Run without displaying GUI window (recommended for helmet embedded runtime)")
    parser.add_argument("--threads", type=int, default=4,
                        help="Number of CPU threads for inference (BPI-M4 has 4 Cortex-A53 cores)")
    return parser.parse_args()

def init_serial(port, baudrate):
    if not port or serial is None:
        if port and serial is None:
            print("[WARN] pyserial not installed. Serial telemetry disabled.")
        return None
    try:
        ser = serial.Serial(port, baudrate, timeout=0.1)
        print(f"[INFO] Connected to ESP32-S3 on {port} @ {baudrate} baud.")
        return ser
    except Exception as e:
        print(f"[ERROR] Failed to open serial port {port}: {e}")
        return None

def main():
    args = parse_args()

    # Set OpenCV and OpenMP threads for BPI-M4 quad-core
    os.environ["OMP_NUM_THREADS"] = str(args.threads)
    cv2.setNumThreads(args.threads)

    print(f"[INFO] Loading model from: {args.model}")
    model = YOLO(args.model, task="detect")

    # Camera resolution & device
    cam_source = int(args.camera) if args.camera.isdigit() else args.camera
    print(f"[INFO] Opening camera source: {cam_source}")
    cap = cv2.VideoCapture(cam_source)
    if not cap.isOpened():
        print(f"[FATAL] Unable to open camera: {cam_source}")
        sys.exit(1)

    # Set frame dimensions for fast capture
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    ser = init_serial(args.serial_port, args.baudrate)

    last_alert_time = 0
    ALERT_COOLDOWN = 0.5  # seconds between consecutive serial alert frames
    frame_count = 0
    start_time = time.time()

    print("[INFO] Banana Pi M4 Pothole Detection Service running. Press Ctrl+C to terminate.")

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("[WARN] Empty frame captured from camera.")
                time.sleep(0.01)
                continue

            frame_count += 1
            h, w, _ = frame.shape
            lane_min_x = int(w * args.lane_margin)
            lane_max_x = int(w * (1.0 - args.lane_margin))

            # Run inference
            results = model.predict(source=frame, conf=args.conf, verbose=False)

            hazard_detected = False
            max_hazard_area = 0
            best_hazard_conf = 0.0

            for r in results:
                for box in r.boxes:
                    coords = box.xyxy[0].cpu().numpy()
                    x1, y1, x2, y2 = coords
                    area = (x2 - x1) * (y2 - y1)
                    center_x = (x1 + x2) / 2.0
                    conf = float(box.conf[0])

                    # Lane gating & Area gating
                    if (lane_min_x <= center_x <= lane_max_x) and (area >= args.area_threshold):
                        hazard_detected = True
                        if area > max_hazard_area:
                            max_hazard_area = int(area)
                            best_hazard_conf = conf

                        if not args.headless:
                            cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 0, 255), 3)

            now = time.time()
            if hazard_detected and (now - last_alert_time > ALERT_COOLDOWN):
                last_alert_time = now
                alert_msg = f"POTHOLE_ALERT:{best_hazard_conf:.2f}:{max_hazard_area}\n"
                print(f"[ALERT] In-lane pothole detected! {alert_msg.strip()}")
                if ser:
                    ser.write(alert_msg.encode("utf-8"))

            if not args.headless:
                # Draw lane guides
                cv2.line(frame, (lane_min_x, 0), (lane_min_x, h), (0, 255, 0), 2)
                cv2.line(frame, (lane_max_x, 0), (lane_max_x, h), (0, 255, 0), 2)
                
                status_text = "⚠️ POTHOLE AHEAD" if hazard_detected else "PATH CLEAR"
                status_color = (0, 0, 255) if hazard_detected else (0, 255, 0)
                cv2.putText(frame, status_text, (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, status_color, 2)

                cv2.imshow("BPI-M4 Pothole Vision", frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break

            if frame_count % 30 == 0:
                fps = frame_count / (time.time() - start_time)
                print(f"[STAT] Running at {fps:.1f} FPS (Threads: {args.threads})")

    except KeyboardInterrupt:
        print("\n[INFO] Stopping Banana Pi Vision Runner.")
    finally:
        cap.release()
        if not args.headless:
            cv2.destroyAllWindows()
        if ser:
            ser.close()

if __name__ == "__main__":
    main()
