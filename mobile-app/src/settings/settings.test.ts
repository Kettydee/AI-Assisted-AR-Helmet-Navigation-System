import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, parseSettings } from "./settings";

test("missing or corrupt settings fall back to defaults", () => {
  assert.deepEqual(parseSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(parseSettings("{nope"), DEFAULT_SETTINGS);
});

test("valid fields are kept, invalid ones ignored", () => {
  const s = parseSettings(
    JSON.stringify({ units: "imperial", voicePrompts: false, speedLimitKmh: 999, lastDeviceId: "AA:BB", junk: 1 }),
  );
  assert.equal(s.units, "imperial");
  assert.equal(s.voicePrompts, false);
  assert.equal(s.speedLimitKmh, DEFAULT_SETTINGS.speedLimitKmh);
  assert.equal(s.lastDeviceId, "AA:BB");
});
