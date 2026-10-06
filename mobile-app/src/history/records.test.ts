import { test } from "node:test";
import assert from "node:assert/strict";
import { hazardRecordFrom, hazardsToCsv, parseList, prepend, rideTotals, type RideRecord } from "./records";
import { HazardEventType } from "../protocol/hazardProtocol";

test("prepend keeps newest first and caps the list", () => {
  assert.deepEqual(prepend([2, 1], 3, 2), [3, 2]);
});

test("hazardsToCsv writes a header and one row per record", () => {
  const rec = hazardRecordFrom(
    { type: HazardEventType.POTHOLE_BUMP, gForce: 2.456, lat: 12.5, lon: 77.25, hasGpsFix: true },
    Date.UTC(2026, 0, 2, 3, 4, 5),
  );
  const csv = hazardsToCsv([rec]).split("\n");
  assert.equal(csv[0], "time_iso,type,g_force,lat,lon,has_gps_fix");
  assert.equal(csv[1], "2026-01-02T03:04:05.000Z,Pothole / bump,2.46,12.5,77.25,true");
});

test("rideTotals sums rides", () => {
  const rides: RideRecord[] = [
    { id: "a", startedAt: 0, endedAt: 60_000, distanceMeters: 1000, maxSpeedMps: 10, destination: null, hazardCount: 0 },
    { id: "b", startedAt: 0, endedAt: 120_000, distanceMeters: 500, maxSpeedMps: 15, destination: "X", hazardCount: 2 },
  ];
  assert.deepEqual(rideTotals(rides), { rides: 2, distanceMeters: 1500, durationSeconds: 180, maxSpeedMps: 15 });
});

test("parseList tolerates junk", () => {
  assert.deepEqual(parseList(null), []);
  assert.deepEqual(parseList("not json"), []);
  assert.deepEqual(parseList('[{"id":"1"},{"x":2},null]'), [{ id: "1" }]);
});
