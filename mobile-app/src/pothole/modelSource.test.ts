import { test } from "node:test";
import assert from "node:assert/strict";
import { confThresholdFromMetadata, defaultModelUrl, inspectModel, metadataUrlFor } from "./modelSource";

test("defaultModelUrl points at the pothole-model release asset", () => {
  assert.equal(
    defaultModelUrl("Kettydee/AI-Assisted-AR-Helmet-Navigation-System"),
    "https://github.com/Kettydee/AI-Assisted-AR-Helmet-Navigation-System/releases/download/pothole-model/pothole.tflite",
  );
});

const yoloInput = { dataType: "float32", shape: [1, 416, 416, 3] };
const yoloOutput = { dataType: "float32", shape: [1, 5, 3549] };

test("inspectModel accepts an NHWC (onnx2tf-style) YOLOv8 TFLite export", () => {
  assert.deepEqual(inspectModel([yoloInput], [yoloOutput]), {
    ok: true,
    layout: { inputWidth: 416, inputHeight: 416, inputDataType: "float32", pixelLayout: "interleaved", numAnchors: 3549 },
  });
});

test("inspectModel accepts Ultralytics 8.4's NCHW LiteRT export", () => {
  // Tensor shapes of a real `model.export(format="tflite", imgsz=416)` from ultralytics 8.4.
  assert.deepEqual(inspectModel([{ dataType: "float32", shape: [1, 3, 416, 320] }], [yoloOutput]), {
    ok: true,
    layout: { inputWidth: 320, inputHeight: 416, inputDataType: "float32", pixelLayout: "planar", numAnchors: 3549 },
  });
});

test("inspectModel explains why other models are rejected", () => {
  const reasons = [
    inspectModel([], []),
    inspectModel([{ dataType: "float32", shape: [1, 416, 416] }], [yoloOutput]),
    inspectModel([yoloInput], [{ dataType: "int8", shape: [1, 5, 3549] }]),
    inspectModel([yoloInput], [{ dataType: "float32", shape: [1, 3549, 5] }]),
    inspectModel([{ dataType: "string", shape: [1, 416, 416, 3] }], [yoloOutput]),
  ];
  for (const r of reasons) {
    assert.equal(r.ok, false);
  }
});

test("metadataUrlFor sits next to the model", () => {
  assert.equal(metadataUrlFor("https://x.test/a/pothole.tflite"), "https://x.test/a/model_metadata.json");
});

test("confThresholdFromMetadata reads train.py's calibrated threshold", () => {
  assert.equal(confThresholdFromMetadata('{"calibrated_conf_threshold": 0.35, "imgsz": 416}'), 0.35);
  assert.equal(confThresholdFromMetadata(null), 0.5);
  assert.equal(confThresholdFromMetadata("not json"), 0.5);
  assert.equal(confThresholdFromMetadata('{"calibrated_conf_threshold": 7}'), 0.5);
  assert.equal(confThresholdFromMetadata("null"), 0.5);
});
