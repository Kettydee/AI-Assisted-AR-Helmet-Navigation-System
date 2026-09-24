#!/usr/bin/env python3
"""
Banana Pi BPI-M4 Real-Time Pothole Edge Detection & ESP32-S3 Telemetry Runner
Author: AI-Assisted AR Helmet Team
"""

import argparse
import json
import os
import sys
import time
from collections import deque
import cv2

try:
    import serial
except ImportError:
    serial = None

from ultralytics import YOLO
from avoidance import choose_avoidance_direction

DEFAULT_CONF = 0.50


def resolve_confidence(explicit_conf, model_path, default=DEFAULT_CONF):
    """Pick the detection confidence threshold.

    An explicit --conf always wins. Otherwise, look for model_metadata.json
    (written by train.py's post-training calibration sweep) next to the model
    and use its argmax-F1 threshold instead of a guessed constant.
    """
    if explicit_conf is not None:
        return explicit_conf, None

    metadata_dir = model_path if os.path.isdir(model_path) else (os.path.dirname(model_path) or ".")
    metadata_path = os.path.join(metadata_dir, "model_metadata.json")
    if os.path.isfile(metadata_path):
        try:
            with open(metadata_path) as f:
                metadata = json.load(f)
            calibrated = metadata.get("calibrated_conf_threshold")
            if isinstance(calibrated, (int, float)):
                return float(calibrated), metadata_path
        except (OSError, ValueError) as exc:
            print(f"[WARN] Could not read {metadata_path}: {exc}")

    return default, None


def draw_direction_arrow(frame, direction):
    """Draw a large direction cue without drawing detection boxes."""
    h, w, _ = frame.shape
    center_x = w // 2
    top = max(70, h // 8)
    bottom = min(h - 70, top + h // 4)
    color = (0, 215, 255)
    thickness = max(4, w // 120)

    if direction == "LEFT":
        start, end = (center_x + w // 10, bottom), (center_x - w // 10, bottom)
        cv2.arrowedLine(frame, start, end, color, thickness, tipLength=0.35)
    elif direction == "RIGHT":
        start, end = (center_x - w // 10, bottom), (center_x + w // 10, bottom)
        cv2.arrowedLine(frame, start, end, color, thickness, tipLength=0.35)
    else:
        start, end = (center_x, bottom), (center_x, top)
        cv2.arrowedLine(frame, start, end, color, thickness, tipLength=0.28)

    label_size, _ = cv2.getTextSize(direction, cv2.FONT_HERSHEY_SIMPLEX, 1.1, 3)
    cv2.putText(
        frame,
        direction,
        (center_x - label_size[0] // 2, bottom + 45),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.1,
        color,
        3,
    )

def parse_args():
    parser = argparse.ArgumentParser(description="Banana Pi M4 Pothole Edge Inference Runner")
    parser.add_argument("--model", type=str, default="best_ncnn_model",
                        help="Path to trained model (NCNN directory, ONNX, or PyTorch weights)")
    parser.add_argument("--camera", type=str, default="0",
                        help="Camera index, device path, or stream URL "
                             "(e.g. 0, /dev/video0, or http://192.168.4.1:81/stream for ESP32-CAM)")
    parser.add_argument("--serial-port", type=str, default=None,
                        help="Serial port connected to ESP32-S3 (e.g., /dev/ttyS1, /dev/ttyUSB0)")
    parser.add_argument("--baudrate", type=int, default=115200,
                        help="UART baud rate")
    parser.add_argument("--conf", type=float, default=None,
                        help="Confidence threshold for detection. Default: read "
                             "calibrated_conf_threshold from model_metadata.json next to "
                             f"--model if present, else {DEFAULT_CONF}")
    parser.add_argument("--iou", type=float, default=0.70,
                        help="NMS IoU threshold for suppressing duplicate/overlapping boxes")
    parser.add_argument("--area-threshold", type=int, default=2200,
                        help="Minimum bounding box pixel area to trigger high-severity alert")
    parser.add_argument("--lane-margin", type=float, default=0.25,
                        help="Fraction of frame width on sides excluded from rider center lane")
    parser.add_argument("--consensus-frames", type=int, default=3,
                        help="Sliding window size (frames) for hazard consensus voting")
    parser.add_argument("--consensus-hits", type=int, default=2,
                        help="Hazard must appear in at least this many of the last "
                             "--consensus-frames frames before an alert fires (cuts "
                             "single-frame false positives at a small latency cost)")
    parser.add_argument("--headless", action="store_true",
                        help="Run without displaying GUI window (recommended for helmet embedded runtime)")
    parser.add_argument("--threads", type=int, default=4,
                        help="Number of CPU threads for inference (BPI-M4 has 4 Cortex-A53 cores)")
    return parser.parse_args()

NETWORK_SOURCE_PREFIXES = ("http://", "https://", "rtsp://", "tcp://", "udp://")


def is_network_source(camera):
    return isinstance(camera, str) and camera.lower().startswith(NETWORK_SOURCE_PREFIXES)


def open_camera_source(camera):
    """Open a local camera index/device or a network stream (ESP32-CAM MJPEG).

    Returns an opened cv2.VideoCapture, or None if it could not be opened.
    """
    if is_network_source(camera):
        cap = cv2.VideoCapture(camera)
        # Keep only the newest frame so detections track the live road, not a
        # backlog that builds up when inference is slower than the stream.
        try:
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        except AttributeError:
            pass
    else:
        source = int(camera) if str(camera).isdigit() else camera
        cap = cv2.VideoCapture(source)
        if cap.isOpened():
            # Only meaningful for local capture devices; a fixed MJPEG stream
            # ignores these and setting them can stall some backends.
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    return cap if cap.isOpened() else None


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

    if not 1 <= args.consensus_hits <= args.consensus_frames:
        print(f"[FATAL] --consensus-hits ({args.consensus_hits}) must be between 1 and "
              f"--consensus-frames ({args.consensus_frames}).")
        sys.exit(1)

    args.conf, conf_source = resolve_confidence(args.conf, args.model)
    if conf_source:
        print(f"[INFO] Using calibrated confidence threshold {args.conf} from {conf_source}")
    else:
        print(f"[INFO] Using confidence threshold {args.conf} (no calibration metadata found)")

    # Set OpenCV and OpenMP threads for BPI-M4 quad-core
    os.environ["OMP_NUM_THREADS"] = str(args.threads)
    cv2.setNumThreads(args.threads)

    print(f"[INFO] Loading model from: {args.model}")
    model = YOLO(args.model, task="detect")

    # Camera: local index/device path, or an ESP32-CAM style http/rtsp stream.
    network_source = is_network_source(args.camera)
    print(f"[INFO] Opening camera source: {args.camera}")
    cap = open_camera_source(args.camera)
    if cap is None:
        print(f"[FATAL] Unable to open camera: {args.camera}")
        sys.exit(1)

    ser = init_serial(args.serial_port, args.baudrate)

    last_alert_time = 0
    ALERT_COOLDOWN = 0.5  # seconds between consecutive serial alert frames
    frame_count = 0
    start_time = time.time()
    hazard_window = deque(maxlen=args.consensus_frames)

    print("[INFO] Banana Pi M4 Pothole Detection Service running. Press Ctrl+C to terminate.")

    empty_reads = 0
    reconnect_delay = 0.5

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                empty_reads += 1
                if network_source and empty_reads >= 10:
                    # The ESP32-CAM drops the TCP stream under load / Wi-Fi
                    # dropout; tear the capture down and dial back in.
                    print(f"[WARN] stream reconnecting (waited {reconnect_delay:.1f}s)")
                    cap.release()
                    time.sleep(reconnect_delay)
                    reconnect_delay = min(reconnect_delay * 2, 3.0)
                    reopened = open_camera_source(args.camera)
                    if reopened is not None:
                        cap = reopened
                        empty_reads = 0
                        reconnect_delay = 0.5
                else:
                    if not network_source:
                        print("[WARN] Empty frame captured from camera.")
                    time.sleep(0.01)
                continue

            empty_reads = 0
            reconnect_delay = 0.5

            frame_count += 1
            h, w, _ = frame.shape
            lane_min_x = int(w * args.lane_margin)
            lane_max_x = int(w * (1.0 - args.lane_margin))

            # Run inference
            results = model.predict(source=frame, conf=args.conf, iou=args.iou, verbose=False)

            hazard_detected = False
            max_hazard_area = 0
            best_hazard_conf = 0.0
            hazard_boxes = []

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
                        hazard_boxes.append((x1, y1, x2, y2))
                        if area > max_hazard_area:
                            max_hazard_area = int(area)
                            best_hazard_conf = conf

            # Require the hazard to reappear across a short sliding window before
            # alerting, so a single noisy frame can't fire a false POTHOLE_ALERT.
            hazard_window.append(hazard_detected)
            consensus_hazard = hazard_window.count(True) >= args.consensus_hits

            avoidance_direction = None
            if consensus_hazard:
                avoidance_direction = choose_avoidance_direction(
                    hazard_boxes, w, h, args.lane_margin
                )

            now = time.time()
            if consensus_hazard and (now - last_alert_time > ALERT_COOLDOWN):
                last_alert_time = now
                alert_msg = (
                    f"POTHOLE_ALERT:{avoidance_direction}:"
                    f"{best_hazard_conf:.2f}:{max_hazard_area}\n"
                )
                print(f"[ALERT] Pothole avoidance: {alert_msg.strip()}")
                if ser:
                    ser.write(alert_msg.encode("utf-8"))

            if not args.headless:
                # Draw lane guides
                cv2.line(frame, (lane_min_x, 0), (lane_min_x, h), (0, 255, 0), 2)
                cv2.line(frame, (lane_max_x, 0), (lane_max_x, h), (0, 255, 0), 2)
                
                status_text = "POTHOLE" if hazard_detected else "PATH CLEAR"
                status_color = (0, 0, 255) if hazard_detected else (0, 255, 0)
                cv2.putText(frame, status_text, (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, status_color, 2)

                if avoidance_direction:
                    draw_direction_arrow(frame, avoidance_direction)

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
