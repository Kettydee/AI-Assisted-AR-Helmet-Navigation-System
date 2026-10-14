/**
 * Where Pothole Cam gets its model, and whether a model's tensors are ones
 * the on-phone pipeline understands. Pure so it is unit-tested.
 *
 * The model isn't bundled into the APK (it changes every time it's
 * retrained, and *.tflite is git-ignored). Instead it's attached to a GitHub
 * Release with the fixed tag `pothole-model`, downloaded once, and cached on
 * the phone. See POTHOLE_TRAINING.md, "Running on a phone".
 */

export const POTHOLE_MODEL_TAG = "pothole-model";
export const POTHOLE_MODEL_ASSET = "pothole.tflite";

export function defaultModelUrl(repo: string): string {
  return `https://github.com/${repo}/releases/download/${POTHOLE_MODEL_TAG}/${POTHOLE_MODEL_ASSET}`;
}

/** The resizer's output types, i.e. what the model input can be fed with. */
export type InputDataType = "float32" | "float16" | "uint8" | "int8";

export interface TensorInfo {
  dataType: string;
  shape: number[];
}

/** NHWC ([1, H, W, 3]) is "interleaved"; NCHW ([1, 3, H, W]) is "planar". */
export type PixelLayout = "interleaved" | "planar";

export interface ModelLayout {
  inputWidth: number;
  inputHeight: number;
  inputDataType: InputDataType;
  pixelLayout: PixelLayout;
  numAnchors: number;
}

/**
 * Check the model is a YOLOv8-style detector exported to TFLite: an RGB
 * image input and a float output `[1, 4 + classes, anchors]`. Ultralytics
 * >= 8.4 exports through LiteRT-Torch and keeps PyTorch's NCHW input
 * `[1, 3, H, W]`; older onnx2tf-based exports are NHWC `[1, H, W, 3]`.
 * Both work - the GPU resizer writes either layout.
 * Returns the layout, or a human-readable reason it can't be used.
 */
export function inspectModel(
  inputs: readonly TensorInfo[],
  outputs: readonly TensorInfo[],
): { ok: true; layout: ModelLayout } | { ok: false; reason: string } {
  const input = inputs[0];
  const output = outputs[0];
  if (!input || !output) {
    return { ok: false, reason: "The model has no input or output tensor." };
  }
  let pixelLayout: PixelLayout;
  let inputHeight: number;
  let inputWidth: number;
  if (input.shape.length === 4 && input.shape[3] === 3) {
    pixelLayout = "interleaved";
    [, inputHeight, inputWidth] = input.shape;
  } else if (input.shape.length === 4 && input.shape[1] === 3) {
    pixelLayout = "planar";
    [, , inputHeight, inputWidth] = input.shape;
  } else {
    return {
      ok: false,
      reason: `Expected an RGB image input [1, H, W, 3] or [1, 3, H, W], got [${input.shape.join(", ")}]. Export with format="tflite".`,
    };
  }
  const dataType = input.dataType as InputDataType;
  if (!["float32", "float16", "uint8", "int8"].includes(dataType)) {
    return { ok: false, reason: `Unsupported input type ${input.dataType}.` };
  }
  if (output.dataType !== "float32") {
    return {
      ok: false,
      reason: `Output is ${output.dataType}; use the float export (best_float16.tflite or best_float32.tflite), not int8.`,
    };
  }
  const [, rows, anchors] = output.shape;
  if (output.shape.length !== 3 || !(rows >= 5) || !(anchors > rows)) {
    return {
      ok: false,
      reason: `Expected a YOLOv8 output [1, 4 + classes, anchors], got [${output.shape.join(", ")}].`,
    };
  }
  return {
    ok: true,
    layout: { inputHeight, inputWidth, inputDataType: dataType, pixelLayout, numAnchors: anchors },
  };
}

export const DEFAULT_CONF_THRESHOLD = 0.5;

/**
 * train.py writes model_metadata.json (with the confidence threshold its
 * calibration sweep picked) next to the exported model; the release carries
 * it next to pothole.tflite.
 */
export function metadataUrlFor(modelUrl: string): string {
  return modelUrl.replace(/[^/]*$/, "model_metadata.json");
}

/** The calibrated threshold from model_metadata.json, or the 0.5 default (same rule as bpi_inference.py). */
export function confThresholdFromMetadata(raw: string | null): number {
  if (!raw) return DEFAULT_CONF_THRESHOLD;
  try {
    const value: unknown = (JSON.parse(raw) as { calibrated_conf_threshold?: unknown })?.calibrated_conf_threshold;
    return typeof value === "number" && value > 0 && value < 1 ? value : DEFAULT_CONF_THRESHOLD;
  } catch {
    return DEFAULT_CONF_THRESHOLD;
  }
}
