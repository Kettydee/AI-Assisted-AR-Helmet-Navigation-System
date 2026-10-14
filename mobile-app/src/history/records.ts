/**
 * Hazard log + ride history records. Pure (no AsyncStorage) so the
 * list-capping and CSV export are unit-tested in records.test.ts.
 */

import { HazardEventType, type HazardEvent } from "../protocol/hazardProtocol";

export interface HazardRecord {
  id: string;
  at: number;
  type: HazardEventType;
  gForce: number;
  lat: number;
  lon: number;
  hasGpsFix: boolean;
  /**
   * Where the hazard came from. Missing on records saved before the phone
   * camera detector existed, which were all from the helmet.
   */
  source?: HazardSource;
}

/** "helmet": the helmet's IMU felt a bump. "camera": the phone camera saw a pothole ahead. */
export type HazardSource = "helmet" | "camera";

export interface RideRecord {
  id: string;
  startedAt: number;
  endedAt: number;
  distanceMeters: number;
  maxSpeedMps: number;
  destination: string | null;
  hazardCount: number;
}

export const MAX_HAZARDS = 500;
export const MAX_RIDES = 200;

export const HAZARD_LABEL: Record<HazardEventType, string> = {
  [HazardEventType.POTHOLE_BUMP]: "Pothole / bump",
  [HazardEventType.CRASH_DETECTED]: "Crash detected",
  [HazardEventType.SOS_CANCELLED]: "SOS cancelled",
};

export function hazardRecordFrom(event: HazardEvent, at: number, source: HazardSource = "helmet"): HazardRecord {
  return { id: `${at}-${event.type}-${source}`, at, ...event, source };
}

/** Display label, telling camera sightings apart from bumps the helmet felt. */
export function hazardLabel(record: Pick<HazardRecord, "type" | "source">): string {
  if (record.source === "camera" && record.type === HazardEventType.POTHOLE_BUMP) {
    return "Pothole (camera)";
  }
  return HAZARD_LABEL[record.type] ?? String(record.type);
}

/** Newest first, capped so storage can't grow forever. */
export function prepend<T>(list: readonly T[], item: T, cap: number): T[] {
  return [item, ...list].slice(0, cap);
}

function csvCell(value: string | number | boolean): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function hazardsToCsv(records: readonly HazardRecord[]): string {
  const header = "time_iso,type,g_force,lat,lon,has_gps_fix,source";
  const rows = records.map((r) =>
    [new Date(r.at).toISOString(), hazardLabel(r), r.gForce.toFixed(2), r.lat, r.lon, r.hasGpsFix, r.source ?? "helmet"]
      .map(csvCell)
      .join(","),
  );
  return [header, ...rows].join("\n");
}

export interface RideTotals {
  rides: number;
  distanceMeters: number;
  durationSeconds: number;
  maxSpeedMps: number;
}

export function rideTotals(rides: readonly RideRecord[]): RideTotals {
  return rides.reduce<RideTotals>(
    (acc, r) => ({
      rides: acc.rides + 1,
      distanceMeters: acc.distanceMeters + r.distanceMeters,
      durationSeconds: acc.durationSeconds + Math.max(0, (r.endedAt - r.startedAt) / 1000),
      maxSpeedMps: Math.max(acc.maxSpeedMps, r.maxSpeedMps),
    }),
    { rides: 0, distanceMeters: 0, durationSeconds: 0, maxSpeedMps: 0 },
  );
}

export function parseList<T extends { id: string }>(raw: string | null): T[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed.filter((x) => x && typeof x.id === "string") as T[]) : [];
  } catch {
    return [];
  }
}
