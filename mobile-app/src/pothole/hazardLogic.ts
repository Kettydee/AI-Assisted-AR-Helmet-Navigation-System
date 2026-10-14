/**
 * Decides when on-phone pothole detections become an alert. Mirrors the
 * Banana Pi runner (vision-ai/bpi_inference.py + avoidance.py) so the phone
 * and the helmet's edge computer behave the same way:
 *
 * 1. lane gating: only boxes whose centre is in the middle of the frame count;
 * 2. area gating: tiny (far away / noise) boxes are ignored;
 * 3. frame consensus: a hazard must show up in N of the last M frames;
 * 4. avoidance: score LEFT / CENTER / RIGHT corridors, pick the clearest.
 *
 * Pure (no React Native imports) so it is unit-tested in hazardLogic.test.ts.
 */

import type { AvoidanceDirection } from "../protocol/voicePrompts";
import type { Detection } from "./yolo";

export interface PotholeConfig {
  /** Fraction of frame width ignored on each side (bpi_inference --lane-margin). */
  laneMargin: number;
  /**
   * Minimum box area as a fraction of the frame. 0.007 matches the BPI's
   * `--area-threshold 2200` pixels on its 640x480 camera.
   */
  minAreaFraction: number;
  consensusFrames: number;
  consensusHits: number;
  /** Minimum time between two spoken/logged alerts. */
  alertCooldownMs: number;
}

export const DEFAULT_POTHOLE_CONFIG: PotholeConfig = {
  laneMargin: 0.25,
  minAreaFraction: 0.007,
  consensusFrames: 3,
  consensusHits: 2,
  alertCooldownMs: 4000,
};

/** Detections that are in the rider's lane and big enough to matter. */
export function gateDetections(detections: readonly Detection[], config: PotholeConfig): Detection[] {
  const laneMin = config.laneMargin;
  const laneMax = 1 - config.laneMargin;
  return detections.filter((d) => {
    const centerX = (d.x1 + d.x2) / 2;
    const area = Math.max(0, d.x2 - d.x1) * Math.max(0, d.y2 - d.y1);
    return centerX >= laneMin && centerX <= laneMax && area >= config.minAreaFraction;
  });
}

/**
 * Port of vision-ai/avoidance.py's choose_avoidance_direction(). Boxes are
 * [x1, y1, x2, y2] in the same units as frameWidth/frameHeight.
 *
 * Only says which part of the visible road is clearest - it knows nothing
 * about traffic beside or behind the rider.
 */
export function chooseAvoidanceDirection(
  boxes: readonly (readonly number[])[],
  frameWidth: number,
  frameHeight: number,
  laneMargin = 0.25,
): AvoidanceDirection {
  if (frameWidth <= 0 || frameHeight <= 0) {
    throw new RangeError("frame dimensions must be positive");
  }
  if (!(laneMargin >= 0 && laneMargin < 0.5)) {
    throw new RangeError("laneMargin must be between 0.0 and 0.5");
  }

  const laneLeft = frameWidth * laneMargin;
  const laneRight = frameWidth * (1 - laneMargin);
  const laneWidth = laneRight - laneLeft;
  const corridorWidth = laneWidth / 3;

  // CENTER first so an exact tie never suggests an unnecessary lateral move;
  // LEFT is the deterministic fallback if both sides tie.
  const candidates: [AvoidanceDirection, number, number][] = [
    ["CENTER", laneLeft + laneWidth * 0.5, 0],
    ["LEFT", laneLeft + laneWidth / 6, 0.03],
    ["RIGHT", laneLeft + (laneWidth * 5) / 6, 0.03],
  ];

  let best: AvoidanceDirection = "CENTER";
  let bestScore = Infinity;
  for (const [name, centerX, movementPenalty] of candidates) {
    const pathLeft = centerX - corridorWidth / 2;
    const pathRight = centerX + corridorWidth / 2;
    let score = movementPenalty;

    for (const box of boxes) {
      if (box.length < 4) continue;
      const [x1, y1, x2, y2] = box;
      const overlapWidth = Math.max(0, Math.min(pathRight, x2) - Math.max(pathLeft, x1));
      const overlapHeight = Math.max(0, Math.min(frameHeight, y2) - Math.max(0, y1));
      if (overlapWidth === 0 || overlapHeight === 0) continue;

      // Boxes lower in the image are normally closer to the rider.
      const proximity = 0.5 + 0.5 * Math.min(1, Math.max(0, y2 / frameHeight));
      score += ((overlapWidth * overlapHeight) / (corridorWidth * frameHeight)) * proximity;
    }

    if (score < bestScore) {
      best = name;
      bestScore = score;
    }
  }
  return best;
}

/** Append this frame's hit/miss to the sliding window (newest last). */
export function pushConsensus(window: readonly boolean[], hit: boolean, size: number): boolean[] {
  return [...window, hit].slice(-Math.max(1, size));
}

export function hasConsensus(window: readonly boolean[], hits: number): boolean {
  return window.filter(Boolean).length >= hits;
}

export interface PotholeAlert {
  direction: AvoidanceDirection;
  confidence: number;
  /** Largest gated box, as a fraction of the frame. */
  areaFraction: number;
}

export interface FrameVerdict {
  /** Gated boxes in this frame (what the overlay highlights). */
  hazards: Detection[];
  window: boolean[];
  /** Set when the hazard is confirmed across frames. */
  confirmed: PotholeAlert | null;
}

/** Run one frame's detections through gating, consensus and avoidance. */
export function evaluateFrame(
  detections: readonly Detection[],
  window: readonly boolean[],
  config: PotholeConfig,
): FrameVerdict {
  const hazards = gateDetections(detections, config);
  const nextWindow = pushConsensus(window, hazards.length > 0, config.consensusFrames);
  if (!hasConsensus(nextWindow, config.consensusHits) || hazards.length === 0) {
    return { hazards, window: nextWindow, confirmed: null };
  }

  let biggest = hazards[0];
  let biggestArea = -1;
  for (const d of hazards) {
    const area = (d.x2 - d.x1) * (d.y2 - d.y1);
    if (area > biggestArea) {
      biggest = d;
      biggestArea = area;
    }
  }
  const direction = chooseAvoidanceDirection(
    hazards.map((d) => [d.x1, d.y1, d.x2, d.y2]),
    1,
    1,
    config.laneMargin,
  );
  return {
    hazards,
    window: nextWindow,
    confirmed: { direction, confidence: biggest.score, areaFraction: biggestArea },
  };
}

export function shouldAlert(now: number, lastAlertAt: number | null, cooldownMs: number): boolean {
  return lastAlertAt === null || now - lastAlertAt >= cooldownMs;
}
