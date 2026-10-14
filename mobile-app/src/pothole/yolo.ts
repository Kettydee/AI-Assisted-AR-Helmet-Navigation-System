/**
 * YOLOv8 TFLite output decoding + NMS for the on-phone pothole detector.
 *
 * Every function here is a worklet: the Pothole Cam screen calls them on the
 * camera thread, right after running the model, so only a handful of boxes
 * (not the whole ~3.5k-anchor tensor) ever cross back to the JS thread. The
 * 'worklet' directive is just a string at runtime, so these stay plain,
 * unit-testable functions under Node (see yolo.test.ts).
 */

/** A detected box. Coordinates are normalised 0..1 (x right, y down). */
export interface Detection {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  score: number;
}

/**
 * Decode the raw output of an Ultralytics YOLOv8 detect model exported with
 * `model.export(format="tflite")`.
 *
 * The output tensor is `[1, 4 + numClasses, numAnchors]` (channel-first):
 * rows 0-3 are box centre-x, centre-y, width, height for every anchor, then
 * one row of class scores per class (already sigmoid-ed). TFLite exports
 * write the box in 0..1 of the model input; older exports used input pixels,
 * so anything clearly above 1 is divided by `inputSize` instead.
 *
 * Returns every anchor whose best class score is >= `confThreshold`, in
 * model-input coordinates, before NMS.
 */
export function decodeYoloOutput(
  output: Float32Array,
  numAnchors: number,
  confThreshold: number,
  inputSize: number,
): Detection[] {
  "worklet";
  const rows = Math.floor(output.length / numAnchors);
  const numClasses = rows - 4;
  const out: Detection[] = [];
  if (numClasses < 1 || numAnchors <= 0) {
    return out;
  }

  let pixelCoords = false;
  for (let i = 0; i < numAnchors; i++) {
    let score = output[4 * numAnchors + i];
    for (let c = 1; c < numClasses; c++) {
      const s = output[(4 + c) * numAnchors + i];
      if (s > score) score = s;
    }
    if (score < confThreshold) continue;

    const cx = output[i];
    const cy = output[numAnchors + i];
    const w = output[2 * numAnchors + i];
    const h = output[3 * numAnchors + i];
    if (cx > 1.5 || cy > 1.5) pixelCoords = true;
    out.push({ x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2, score });
  }

  if (pixelCoords && inputSize > 0) {
    for (const d of out) {
      d.x1 /= inputSize;
      d.y1 /= inputSize;
      d.x2 /= inputSize;
      d.y2 /= inputSize;
    }
  }
  return out;
}

export function iou(a: Detection, b: Detection): number {
  "worklet";
  const ix = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1));
  const iy = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  const inter = ix * iy;
  const union = (a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - inter;
  return union <= 0 ? 0 : inter / union;
}

/** Greedy non-max suppression, highest score first, capped at `maxDetections`. */
export function nonMaxSuppression(detections: Detection[], iouThreshold: number, maxDetections: number): Detection[] {
  "worklet";
  const sorted = detections.slice().sort((a, b) => b.score - a.score);
  const kept: Detection[] = [];
  for (const d of sorted) {
    if (kept.length >= maxDetections) break;
    let suppressed = false;
    for (const k of kept) {
      if (iou(d, k) > iouThreshold) {
        suppressed = true;
        break;
      }
    }
    if (!suppressed) kept.push(d);
  }
  return kept;
}

/**
 * Undo the resizer's `'contain'` letterboxing: map a box from the square
 * model input back to 0..1 of the (upright) camera frame, clamped to it.
 */
export function unletterbox(d: Detection, frameWidth: number, frameHeight: number): Detection {
  "worklet";
  let contentW = 1;
  let contentH = 1;
  if (frameWidth > frameHeight) {
    contentH = frameHeight / frameWidth;
  } else if (frameHeight > frameWidth) {
    contentW = frameWidth / frameHeight;
  }
  const offX = (1 - contentW) / 2;
  const offY = (1 - contentH) / 2;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return {
    x1: clamp((d.x1 - offX) / contentW),
    y1: clamp((d.y1 - offY) / contentH),
    x2: clamp((d.x2 - offX) / contentW),
    y2: clamp((d.y2 - offY) / contentH),
    score: d.score,
  };
}
