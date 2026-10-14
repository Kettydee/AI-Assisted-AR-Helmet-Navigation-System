import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeYoloOutput, iou, nonMaxSuppression, unletterbox, type Detection } from "./yolo";

/** Build a channel-first [4 + classes, anchors] tensor from per-anchor rows. */
function tensor(anchors: number[][]): Float32Array {
  const rows = anchors[0].length;
  const n = anchors.length;
  const out = new Float32Array(rows * n);
  anchors.forEach((a, i) => a.forEach((v, r) => (out[r * n + i] = v)));
  return out;
}

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-5, `${a} != ${b}`);

test("decodeYoloOutput keeps anchors above the threshold and converts xywh to corners", () => {
  const out = tensor([
    [0.5, 0.5, 0.2, 0.1, 0.9],
    [0.1, 0.1, 0.1, 0.1, 0.2],
  ]);
  const dets = decodeYoloOutput(out, 2, 0.5, 416);
  assert.equal(dets.length, 1);
  close(dets[0].x1, 0.4);
  close(dets[0].y1, 0.45);
  close(dets[0].x2, 0.6);
  close(dets[0].y2, 0.55);
  close(dets[0].score, 0.9);
});

test("decodeYoloOutput normalises pixel-space boxes by the input size", () => {
  const out = tensor([[208, 104, 41.6, 20.8, 0.8]]);
  const [d] = decodeYoloOutput(out, 1, 0.5, 416);
  close(d.x1, 0.45);
  close(d.y1, 0.225);
  close(d.x2, 0.55);
  close(d.y2, 0.275);
});

test("decodeYoloOutput takes the best class score for multi-class models", () => {
  const out = tensor([[0.5, 0.5, 0.1, 0.1, 0.1, 0.7]]);
  const dets = decodeYoloOutput(out, 1, 0.5, 416);
  assert.equal(dets.length, 1);
  close(dets[0].score, 0.7);
});

test("decodeYoloOutput rejects malformed tensors", () => {
  assert.deepEqual(decodeYoloOutput(new Float32Array(4), 1, 0.5, 416), []);
  assert.deepEqual(decodeYoloOutput(new Float32Array(10), 0, 0.5, 416), []);
});

const box = (x1: number, y1: number, x2: number, y2: number, score = 1): Detection => ({ x1, y1, x2, y2, score });

test("iou of identical, disjoint and half-overlapping boxes", () => {
  close(iou(box(0, 0, 1, 1), box(0, 0, 1, 1)), 1);
  close(iou(box(0, 0, 1, 1), box(2, 2, 3, 3)), 0);
  close(iou(box(0, 0, 2, 1), box(1, 0, 3, 1)), 1 / 3);
});

test("nonMaxSuppression drops overlapping lower-scoring boxes and caps the count", () => {
  const kept = nonMaxSuppression(
    [box(0, 0, 1, 1, 0.6), box(0.05, 0, 1.05, 1, 0.9), box(5, 5, 6, 6, 0.5)],
    0.7,
    10,
  );
  assert.deepEqual(kept.map((d) => d.score), [0.9, 0.5]);
  assert.equal(nonMaxSuppression([box(0, 0, 1, 1, 0.6), box(5, 5, 6, 6, 0.5)], 0.7, 1).length, 1);
});

test("unletterbox maps a portrait frame's pillarboxed input back to the frame", () => {
  // 9:16 portrait frame: content occupies the middle 9/16 of the square input.
  const contentW = 9 / 16;
  const offX = (1 - contentW) / 2;
  const d = unletterbox(box(offX, 0.25, offX + contentW / 2, 0.75), 900, 1600);
  close(d.x1, 0);
  close(d.x2, 0.5);
  close(d.y1, 0.25);
  close(d.y2, 0.75);
});

test("unletterbox clamps boxes that spill into the padding", () => {
  const d = unletterbox(box(-0.1, 0, 0.5, 1.2), 1600, 900);
  assert.equal(d.x1, 0);
  assert.equal(d.y2, 1);
});
