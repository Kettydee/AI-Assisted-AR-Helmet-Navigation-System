# 🕳️ Pothole Detection ML Training & Deployment Guide

Welcome to the **`ml-pothole-training`** branch of the **AI-Assisted AR Helmet Navigation System**.

This branch focuses on the complete machine learning lifecycle for road defect and pothole detection: dataset curation, model training, hyperparameter optimization, edge format exports (NCNN / ONNX), and real-time inference on the Banana Pi BPI-M4.

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/drive/1dOddPLRgAFKLsdCTcXO1J4sgXiA_Q1Wm?usp=sharing)

---

## 📂 Quick Links to ML Resources in this Branch

| Resource | Path / Link | Description |
| :--- | :--- | :--- |
| **Interactive Colab** | [Google Colab Notebook](https://colab.research.google.com/drive/1dOddPLRgAFKLsdCTcXO1J4sgXiA_Q1Wm?usp=sharing) | Train on free GPU (T4), visualize HUD overlays, and export models. |
| **Repo Notebook** | [`vision-ai/pothole_detection_colab.ipynb`](vision-ai/pothole_detection_colab.ipynb) | Version-controlled Jupyter notebook file. |
| **CLI Training** | [`vision-ai/train.py`](vision-ai/train.py) | Standalone Python training script with auto-dataset downloader. |
| **Edge Runner** | [`vision-ai/bpi_inference.py`](vision-ai/bpi_inference.py) | Production real-time inference script for Banana Pi BPI-M4. |
| **Avoidance Logic** | [`vision-ai/avoidance.py`](vision-ai/avoidance.py) | Center/Left/Right corridor scoring and evasion guidance. |
| **Dependencies** | [`vision-ai/requirements.txt`](vision-ai/requirements.txt) | Python dependencies for PyTorch, Ultralytics, OpenCV, and ONNX. |
| **Hardware Guide** | [`vision-ai/README.md`](vision-ai/README.md) | Wiring pinout (BPI-M4 to ESP32-S3) and systemd autostart service. |

---

## 🚀 1. Training the Model

### Option A: Via Google Colab (Recommended for Free GPU)
1. Open the [Google Colab Notebook](https://colab.research.google.com/drive/1dOddPLRgAFKLsdCTcXO1J4sgXiA_Q1Wm?usp=sharing).
2. Go to **Runtime → Change runtime type** and select **T4 GPU**.
3. Run all cells:
   - Cell 0: Installs `ultralytics` and verifies CUDA.
   - Cell 1: Downloads and formats the IVCNZ Pothole dataset.
   - Cell 2: Trains `yolov8n.pt` for 40 epochs at `imgsz=416`.
   - Cell 3: Exports the model to `NCNN` and `ONNX` formats and triggers a zip download.
   - Cell 4: Evaluates HUD alert simulation with green lane boundaries.
   - Cell 5: Prints formal validation metrics (Precision, Recall, mAP50).
   - Cell 6: Generates `pothole_alert_simulation.mp4`.

### Option B: Local Training via CLI
```bash
cd vision-ai
pip install -r requirements.txt

# Run training (auto-downloads dataset if not present)
python train.py --epochs 50 --imgsz 416 --batch 16 --device 0
```

---

## ⚙️ 2. Edge Optimization for Banana Pi BPI-M4

The Banana Pi BPI-M4 features a quad-core **ARM Cortex-A53** processor. To maximize FPS on embedded ARM CPUs:

1. **NCNN Export:** NCNN uses ARM NEON SIMD instructions, outperforming standard PyTorch by ~3x on the BPI CPU.
   ```python
   from ultralytics import YOLO
   model = YOLO("runs/detect/pothole_model/weights/best.pt")
   model.export(format="ncnn", imgsz=416)
   ```
2. **Resolution Scaling:** Using `416x416` (or `320x320`) achieves **6–12 FPS** on the Cortex-A53 without an external NPU.
3. **Multi-threading:** Ensure `bpi_inference.py` runs with `--threads 4` to utilize all 4 CPU cores.

---

## 📡 3. Running Real-Time Inference on the Helmet

On the Banana Pi M4:
```bash
cd vision-ai

# Headless production mode streaming alerts to ESP32-S3 over UART
python3 bpi_inference.py \
  --model best_ncnn_model \
  --camera /dev/video0 \
  --serial-port /dev/ttyS1 \
  --conf 0.50 \
  --area-threshold 2200 \
  --headless \
  --threads 4
```

Whenever an in-lane pothole is spotted, an alert packet is transmitted over UART to the **ESP32-S3**, triggering the high-priority visual HUD warning box:
```text
┌────────────────────────┐
│    ! ROAD HAZARD !     │
│        POTHOLE         │
│       SLOW DOWN        │
└────────────────────────┘
```
