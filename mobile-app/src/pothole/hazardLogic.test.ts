import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chooseAvoidanceDirection,
  DEFAULT_POTHOLE_CONFIG,
  evaluateFrame,
  gateDetections,
  hasConsensus,
  pushConsensus,
  shouldAlert,
} from "./hazardLogic";
import type { Detection } from "./yolo";

// Same cases as vision-ai/test_avoidance.py, so the phone and the Banana Pi agree.
test("clear center is preferred", () => {
  assert.equal(chooseAvoidanceDirection([], 600, 400), "CENTER");
});

test("left side pothole keeps clear center", () => {
  assert.equal(chooseAvoidanceDirection([[150, 220, 230, 390]], 600, 400), "CENTER");
});

test("center pothole chooses a side", () => {
  assert.equal(chooseAvoidanceDirection([[250, 220, 350, 390]], 600, 400), "LEFT");
});

test("left and center blocked chooses right", () => {
  assert.equal(chooseAvoidanceDirection([[150, 180, 360, 400]], 600, 400), "RIGHT");
});

test("invalid dimensions are rejected", () => {
  assert.throws(() => chooseAvoidanceDirection([], 0, 400), RangeError);
  assert.throws(() => chooseAvoidanceDirection([], 600, 400, 0.5), RangeError);
});

const det = (x1: number, y1: number, x2: number, y2: number, score = 0.8): Detection => ({ x1, y1, x2, y2, score });

test("gateDetections keeps in-lane boxes that are big enough", () => {
  const inLane = det(0.4, 0.6, 0.6, 0.8);
  const offToSide = det(0.0, 0.6, 0.2, 0.8);
  const tiny = det(0.49, 0.5, 0.51, 0.52);
  assert.deepEqual(gateDetections([inLane, offToSide, tiny], DEFAULT_POTHOLE_CONFIG), [inLane]);
});

test("consensus window slides and counts hits", () => {
  let w: boolean[] = [];
  w = pushConsensus(w, true, 3);
  w = pushConsensus(w, false, 3);
  w = pushConsensus(w, true, 3);
  w = pushConsensus(w, false, 3);
  assert.deepEqual(w, [false, true, false]);
  assert.equal(hasConsensus(w, 2), false);
  assert.equal(hasConsensus(pushConsensus(w, true, 3), 2), true);
});

test("evaluateFrame needs 2 of 3 frames before confirming", () => {
  const pothole = [det(0.45, 0.6, 0.55, 0.8, 0.9)];
  const first = evaluateFrame(pothole, [], DEFAULT_POTHOLE_CONFIG);
  assert.equal(first.hazards.length, 1);
  assert.equal(first.confirmed, null);

  const second = evaluateFrame(pothole, first.window, DEFAULT_POTHOLE_CONFIG);
  assert.ok(second.confirmed);
  assert.equal(second.confirmed.direction, "LEFT");
  assert.equal(second.confirmed.confidence, 0.9);
  assert.ok(Math.abs(second.confirmed.areaFraction - 0.02) < 1e-9);
});

test("evaluateFrame does not confirm on a frame with no hazard even with past hits", () => {
  const pothole = [det(0.45, 0.6, 0.55, 0.8)];
  const a = evaluateFrame(pothole, [], DEFAULT_POTHOLE_CONFIG);
  const b = evaluateFrame(pothole, a.window, DEFAULT_POTHOLE_CONFIG);
  const c = evaluateFrame([], b.window, DEFAULT_POTHOLE_CONFIG);
  assert.equal(c.confirmed, null);
});

test("shouldAlert respects the cooldown", () => {
  assert.equal(shouldAlert(1000, null, 4000), true);
  assert.equal(shouldAlert(3000, 1000, 4000), false);
  assert.equal(shouldAlert(5000, 1000, 4000), true);
});
