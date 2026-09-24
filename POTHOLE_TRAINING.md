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

# Run training (auto-downloads the base IVCNZ dataset if not present)
python train.py --epochs 100 --imgsz 416 --batch 16 --device 0
```

`train.py` needs a real GPU (Colab's free T4, or your own `--device 0`) and network
access to fetch the base dataset — neither is available in a plain CI/sandbox
shell, so always run the actual training on a GPU machine.

By default it now trains up to 100 epochs with early stopping
(`--patience 25`), a cosine LR schedule, the AdamW optimizer, and mixup +
rotation augmentation — all tunable, see `python train.py --help`.

---

### Training on many more images

`train.py` only auto-downloads one dataset (IVCNZ, a few thousand images). To
train on significantly more data, point it at any number of additional
YOLO-format datasets with `--extra-data` (repeatable), each identified by its
own `data.yaml`:

```bash
python train.py \
  --epochs 100 --imgsz 416 --device 0 \
  --extra-data ../more-potholes/roboflow-export-1/data.yaml \
  --extra-data ../more-potholes/dashcam-labeled/data.yaml
```

This works with any dataset already in standard YOLO layout (Roboflow
Universe exports, CVAT/Label Studio exports, or your own labeled images) —
`train.py` merges all sources into one pool, then re-splits the *combined*
pool 70/20/10 into train/val/test (override with `--val-split` /
`--test-split`), prefixing filenames per source so same-named files from
different datasets never collide.

Each `--extra-data` source **must be single-class** (`pothole`, id `0`) —
`train.py` refuses to merge a multi-class dataset rather than silently
mislabel a different class (e.g. "crack") as a pothole. Filter/re-export
non-pothole classes out first (most annotation tools support exporting a
subset of classes).

### Confidence calibration

After training, `train.py` sweeps confidence thresholds (`--conf-sweep-min`/
`--conf-sweep-max`/`--conf-sweep-step`, default `0.15`–`0.85` in steps of
`0.05`) against the validation split, picks the threshold with the best F1,
and reports final precision/recall/mAP50 on the held-out test split at that
threshold. The result is written to `model_metadata.json` next to the
exported weights (and copied into `best_ncnn_model/` for deployment), so
`bpi_inference.py` uses the calibrated value automatically instead of a
guessed `--conf 0.50` — see [`vision-ai/README.md`](vision-ai/README.md).

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
4. **Simplified ONNX graph:** `train.py` now exports ONNX with `simplify=True` (constant-folds and prunes the graph), which is smaller and measurably faster on CPU than an unsimplified export.
5. **Frame-consensus voting:** `bpi_inference.py` now requires a hazard to reappear in `--consensus-hits` of the last `--consensus-frames` frames (default `2` of `3`) before it alerts, cutting single-frame false positives without needing a bigger/slower model.

---

## 📡 3. Running Real-Time Inference on the Helmet

On the Banana Pi M4:
```bash
cd vision-ai

# Headless production mode streaming alerts to ESP32-S3 over UART.
# --conf is optional: if omitted, it's read from model_metadata.json next to
# --model (the confidence train.py calibrated for best F1), falling back to 0.50.
python3 bpi_inference.py \
  --model best_ncnn_model \
  --camera /dev/video0 \
  --serial-port /dev/ttyS1 \
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
