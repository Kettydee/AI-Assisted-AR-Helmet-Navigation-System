"""
Pothole Detection Model Training & Export Script for Banana Pi M4
Uses Ultralytics YOLOv8-nano and exports to NCNN & ONNX formats.
"""

import argparse
import glob
import os
import shutil
import urllib.request
import zipfile
from sklearn.model_selection import train_test_split
from ultralytics import YOLO

DATASET_URL = "https://github.com/jaygala24/pothole-detection/releases/download/v1.0.0/Pothole.Dataset.IVCNZ.zip"

def prepare_dataset(data_dir="dataset"):
    if os.path.exists(os.path.join(data_dir, "data.yaml")):
        print(f"Dataset already exists at {data_dir}. Skipping download.")
        return os.path.abspath(os.path.join(data_dir, "data.yaml"))

    zip_path = "potholes.zip"
    print("Downloading IVCNZ Pothole Dataset... ⏳")
    urllib.request.urlretrieve(DATASET_URL, zip_path)

    print("Extracting files... 📂")
    with zipfile.ZipFile(zip_path, "r") as zip_ref:
        zip_ref.extractall("raw_data")

    if os.path.exists(zip_path):
        os.remove(zip_path)

    images = sorted(glob.glob("raw_data/Pothole Dataset/*.jpg"))
    train_imgs, val_imgs = train_test_split(images, test_size=0.2, random_state=42)

    for split, img_list in [("train", train_imgs), ("valid", val_imgs)]:
        os.makedirs(f"{data_dir}/images/{split}", exist_ok=True)
        os.makedirs(f"{data_dir}/labels/{split}", exist_ok=True)
        for img in img_list:
            txt = img.replace(".jpg", ".txt")
            shutil.copy(img, f"{data_dir}/images/{split}/")
            if os.path.exists(txt):
                shutil.copy(txt, f"{data_dir}/labels/{split}/")

    yaml_path = os.path.join(data_dir, "data.yaml")
    yaml_content = f"""
path: {os.path.abspath(data_dir)}
train: images/train
val: images/valid
names:
  0: pothole
"""
    with open(yaml_path, "w") as f:
        f.write(yaml_content.strip())

    print("Dataset setup completed! ✅")
    return os.path.abspath(yaml_path)

def main():
    parser = argparse.ArgumentParser(description="Train YOLOv8 Pothole Model for Banana Pi M4")
    parser.add_argument("--epochs", type=int, default=40, help="Number of training epochs")
    parser.add_argument("--imgsz", type=int, default=416, help="Image size (default 416 for BPI-M4)")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--model", type=str, default="yolov8n.pt", help="Base model weights")
    parser.add_argument("--device", type=str, default="0", help="CUDA device or 'cpu'")
    args = parser.parse_args()

    yaml_path = prepare_dataset()

    print(f"\n--- Starting Training ({args.model}) ---")
    model = YOLO(args.model)
    results = model.train(
        data=yaml_path,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        name="pothole_model",
        device=args.device
    )

    best_weights = "runs/detect/pothole_model/weights/best.pt"
    print(f"\nEvaluating Best Model: {best_weights}")
    best_model = YOLO(best_weights)
    metrics = best_model.val(data=yaml_path, imgsz=args.imgsz)

    print("\n" + "=" * 45)
    print("🎯 EVALUATION RESULTS")
    print("=" * 45)
    print(f"Precision : {metrics.box.p[0]*100:.2f}%")
    print(f"Recall    : {metrics.box.r[0]*100:.2f}%")
    print(f"mAP@50    : {metrics.box.map50*100:.2f}%")
    print("=" * 45)

    print("\n--- Exporting for Banana Pi BPI-M4 ---")
    print("1. Exporting to NCNN (fastest for ARM NEON CPUs)...")
    best_model.export(format="ncnn", imgsz=args.imgsz)

    print("2. Exporting to ONNX...")
    best_model.export(format="onnx", imgsz=args.imgsz)

    print("\nExports complete. Ready for Banana Pi deployment! 🚀")

if __name__ == "__main__":
    main()
