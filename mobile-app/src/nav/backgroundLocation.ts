/**
 * Background location tracking and Android foreground service for AR Helmet Nav.
 *
 * Keeps GPS tracking, speed monitoring, and Bluetooth HUD streaming active
 * even when the phone screen is off or the app is minimized.
 */

import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

export const BACKGROUND_LOCATION_TASK = "AR_HELMET_BACKGROUND_LOCATION_TASK";

type LocationListener = (location: Location.LocationObject) => void;
const listeners = new Set<LocationListener>();

/** Global task defined at top level for Expo TaskManager. */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn("[BackgroundLocation] Task error:", error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locations && locations.length > 0) {
      const latest = locations[locations.length - 1];
      for (const listener of listeners) {
        try {
          listener(latest);
        } catch (e) {
          console.error("[BackgroundLocation] Listener callback error:", e);
        }
      }
    }
  }
});

export async function isBackgroundTrackingActive(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
}

export async function startBackgroundTracking(onLocation: LocationListener): Promise<boolean> {
  listeners.add(onLocation);

  try {
    const bgPermission = await Location.requestBackgroundPermissionsAsync();
    if (!bgPermission.granted) {
      console.warn("[BackgroundLocation] Background permission not granted. Foreground tracking will be used.");
    }

    const alreadyRunning = await isBackgroundTrackingActive();
    if (!alreadyRunning) {
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 2,
        showsBackgroundLocationIndicator: true,
        pausesUpdatesAutomatically: false,
        foregroundService: {
          notificationTitle: "AR Helmet Navigation Active",
          notificationBody: "Monitoring speed, route, and road hazards.",
          notificationColor: "#00E5FF",
        },
      });
    }
    return true;
  } catch (err) {
    console.warn("[BackgroundLocation] Failed to start background location service:", err);
    return false;
  }
}

export async function stopBackgroundTracking(onLocation?: LocationListener): Promise<void> {
  if (onLocation) {
    listeners.delete(onLocation);
  } else {
    listeners.clear();
  }

  if (listeners.size === 0) {
    try {
      const active = await isBackgroundTrackingActive();
      if (active) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
    } catch (err) {
      console.warn("[BackgroundLocation] Failed to stop background location updates:", err);
    }
  }
}
