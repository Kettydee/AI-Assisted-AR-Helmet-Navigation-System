import { parseOsrmRoute, type Route } from "./route";
import type { LatLon } from "./geo";

/**
 * Network side of routing. Uses the free public OSRM and Nominatim
 * (OpenStreetMap) servers so the app works without any API keys. Both are
 * fair-use services: search only runs on submit, never per keystroke.
 */

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const HEADERS = { "User-Agent": "ARHelmetNav/1.1 (github.com/Kettydee/AI-Assisted-AR-Helmet-Navigation-System)" };

export interface Place {
  id: string;
  name: string;
  address: string;
  location: LatLon;
}

async function getJson(url: string, timeoutMs = 12_000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    if (!res.ok && res.status !== 400) {
      throw new Error(`Server error (${res.status}). Try again in a moment.`);
    }
    return await res.json();
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new Error("The request timed out. Check your internet connection.");
    }
    if ((error as Error).message.includes("Network request failed")) {
      throw new Error("No internet connection.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchRoute(from: LatLon, to: LatLon): Promise<Route> {
  const coords = `${from.lon},${from.lat};${to.lon},${to.lat}`;
  const json = await getJson(`${OSRM_BASE}/${coords}?overview=full&geometries=geojson&steps=true`);
  return parseOsrmRoute(json);
}

type NominatimResult = { place_id: number; display_name: string; name?: string; lat: string; lon: string };

export async function searchPlaces(query: string, near?: LatLon | null): Promise<Place[]> {
  const params = [`q=${encodeURIComponent(query)}`, "format=jsonv2", "limit=8", "addressdetails=0"];
  if (near) {
    // Prefer (but don't restrict to) results around the rider.
    const d = 0.5;
    params.push(`viewbox=${near.lon - d},${near.lat + d},${near.lon + d},${near.lat - d}`);
  }
  const json = (await getJson(`${NOMINATIM_BASE}?${params.join("&")}`)) as NominatimResult[];
  if (!Array.isArray(json)) {
    return [];
  }
  return json.map((r) => {
    const parts = r.display_name.split(", ");
    return {
      id: String(r.place_id),
      name: r.name || parts[0],
      address: parts.slice(r.name ? 0 : 1).join(", "),
      location: { lat: Number(r.lat), lon: Number(r.lon) },
    };
  });
}
