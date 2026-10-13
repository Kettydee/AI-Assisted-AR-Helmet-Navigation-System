import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { Linking } from "react-native";
import { fetchRoute, type Place } from "../nav/osrmClient";
import { computeProgress, promptBandFor, type Route, type RouteProgress } from "../nav/route";
import { formatDistance, haversineMeters, mpsToKmh, type LatLon } from "../nav/geo";
import { NavigationDirection } from "../protocol/navigationProtocol";
import { useHelmetConnection } from "./useHelmetConnection";
import { useHistory } from "./useHistory";
import { useSettings } from "./useSettings";
import { startBackgroundTracking, stopBackgroundTracking } from "../nav/backgroundLocation";

export type RidePhase = "idle" | "starting" | "active";

interface RideContextValue {
  phase: RidePhase;
  destination: Place | null;
  route: Route | null;
  progress: RouteProgress | null;
  position: LatLon | null;
  speedMps: number;
  distanceTravelled: number;
  maxSpeedMps: number;
  startedAt: number | null;
  overspeed: boolean;
  rerouting: boolean;
  error: string | null;
  /** True when location permission was permanently denied (needs system settings). */
  locationBlocked: boolean;
  /** HUD frame currently shown on the helmet (or that would be, if connected). */
  hudFrame: { direction: NavigationDirection; distance: number } | null;
  startRide: (destination: Place | null) => Promise<void>;
  endRide: () => void;
  getCurrentPosition: () => Promise<LatLon | null>;
  openLocationSettings: () => void;
}

const RideContext = createContext<RideContextValue | null>(null);

const KEEP_AWAKE_TAG = "ride";
const SEND_INTERVAL_MS = 2000;
const SEND_MIN_DELTA_M = 10;
const REROUTE_COOLDOWN_MS = 15_000;
const OVERSPEED_REPEAT_MS = 20_000;
const MIN_ACCURACY_M = 50;

function speak(enabled: boolean, text: string) {
  if (enabled) {
    Speech.stop();
    Speech.speak(text);
  }
}

export function RideProvider({ children }: { children: React.ReactNode }) {
  const { connection, status } = useHelmetConnection();
  const { addRide, hazards } = useHistory();
  const { settings } = useSettings();

  const [phase, setPhase] = useState<RidePhase>("idle");
  const [destination, setDestination] = useState<Place | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [progress, setProgress] = useState<RouteProgress | null>(null);
  const [position, setPosition] = useState<LatLon | null>(null);
  const [speedMps, setSpeedMps] = useState(0);
  const [distanceTravelled, setDistanceTravelled] = useState(0);
  const [maxSpeedMps, setMaxSpeedMps] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [overspeed, setOverspeed] = useState(false);
  const [rerouting, setRerouting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationBlocked, setLocationBlocked] = useState(false);
  const [hudFrame, setHudFrame] = useState<RideContextValue["hudFrame"]>(null);

  // Mutable ride state read inside the location callback.
  const r = useRef({
    sub: null as Location.LocationSubscription | null,
    route: null as Route | null,
    destination: null as Place | null,
    nextStep: 1,
    announced: new Set<number>(),
    lastPos: null as LatLon | null,
    distance: 0,
    maxSpeed: 0,
    lastSendAt: 0,
    lastSentDist: -1,
    lastSentStep: -1,
    lastRerouteAt: 0,
    lastOverspeedAt: 0,
    arrivedSpoken: false,
    startedAt: 0,
  });
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const connectedRef = useRef(status === "connected");
  connectedRef.current = status === "connected";

  const sendToHelmet = useCallback(
    (direction: NavigationDirection, distance: number) => {
      setHudFrame({ direction, distance });
      if (connectedRef.current) {
        connection.sendNavigation(direction, distance).catch(() => undefined);
      }
    },
    [connection],
  );

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.granted) {
      setLocationBlocked(false);
      return true;
    }
    const asked = await Location.requestForegroundPermissionsAsync();
    setLocationBlocked(!asked.granted && !asked.canAskAgain);
    if (!asked.granted) {
      setError("Location permission is needed for navigation and ride tracking.");
      return false;
    }
    if (!(await Location.hasServicesEnabledAsync())) {
      setError("Location (GPS) is turned off. Turn it on in your phone's quick settings.");
      return false;
    }
    return true;
  }, []);

  const getCurrentPosition = useCallback(async (): Promise<LatLon | null> => {
    if (!(await ensurePermission())) {
      return null;
    }
    try {
      const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
      const loc = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      return { lat: loc.coords.latitude, lon: loc.coords.longitude };
    } catch {
      setError("Couldn't get your location. Make sure GPS is on.");
      return null;
    }
  }, [ensurePermission]);

  const reroute = useCallback(async (from: LatLon) => {
    const s = r.current;
    if (!s.destination) return;
    s.lastRerouteAt = Date.now();
    setRerouting(true);
    speak(settingsRef.current.voicePrompts, "Recalculating route.");
    try {
      const next = await fetchRoute(from, s.destination.location);
      s.route = next;
      s.nextStep = 1;
      s.announced = new Set();
      s.lastSentStep = -1;
      setRoute(next);
    } catch {
      // Keep the old route; another attempt happens after the cooldown.
    } finally {
      setRerouting(false);
    }
  }, []);

  const onLocation = useCallback(
    (loc: Location.LocationObject) => {
      const s = r.current;
      const pos = { lat: loc.coords.latitude, lon: loc.coords.longitude };
      const accuracy = loc.coords.accuracy ?? 0;
      const speed = Math.max(0, loc.coords.speed ?? 0);
      const now = Date.now();
      const cfg = settingsRef.current;

      setPosition(pos);
      setSpeedMps(speed);

      if (accuracy <= MIN_ACCURACY_M) {
        if (s.lastPos) {
          const step = haversineMeters(s.lastPos, pos);
          // Ignore GPS jitter while standing still.
          if (step > 3) {
            s.distance += step;
            setDistanceTravelled(s.distance);
            s.lastPos = pos;
          }
        } else {
          s.lastPos = pos;
        }
        if (speed > s.maxSpeed) {
          s.maxSpeed = speed;
          setMaxSpeedMps(speed);
        }
      }

      const over = cfg.speedLimitKmh > 0 && mpsToKmh(speed) > cfg.speedLimitKmh;
      setOverspeed(over);
      if (over && now - s.lastOverspeedAt > OVERSPEED_REPEAT_MS) {
        s.lastOverspeedAt = now;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
        speak(cfg.voicePrompts, "Slow down. You are over your speed limit.");
      }

      if (!s.route) {
        return;
      }

      const p = computeProgress(s.route, pos, s.nextStep);
      if (p.nextStepIndex !== s.nextStep) {
        s.nextStep = p.nextStepIndex;
        s.announced = new Set();
      }
      setProgress(p);

      if (p.arrived) {
        if (!s.arrivedSpoken) {
          s.arrivedSpoken = true;
          sendToHelmet(NavigationDirection.DESTINATION, 0);
          speak(cfg.voicePrompts, "You have arrived at your destination.");
        }
        return;
      }

      if (p.offRoute && accuracy <= MIN_ACCURACY_M && now - s.lastRerouteAt > REROUTE_COOLDOWN_MS) {
        void reroute(pos);
        return;
      }

      const stepChanged = s.lastSentStep !== p.nextStepIndex;
      const moved = Math.abs(p.distanceToManeuver - s.lastSentDist) >= SEND_MIN_DELTA_M;
      if (stepChanged || (moved && now - s.lastSendAt >= SEND_INTERVAL_MS)) {
        s.lastSendAt = now;
        s.lastSentDist = p.distanceToManeuver;
        s.lastSentStep = p.nextStepIndex;
        sendToHelmet(p.direction, p.distanceToManeuver);
      }

      const band = promptBandFor(p.distanceToManeuver, s.announced);
      if (band !== null) {
        s.announced.add(band);
        const step = s.route.steps[p.nextStepIndex];
        if (step) {
          const text =
            band === 50 ? `${step.instruction}.` : `In ${formatDistance(p.distanceToManeuver, cfg.units)}, ${step.instruction}.`;
          speak(cfg.voicePrompts, text.replace(" km", " kilometres").replace(" m,", " metres,"));
        }
      }
    },
    [reroute, sendToHelmet],
  );

  const endRide = useCallback(() => {
    const s = r.current;
    s.sub?.remove();
    s.sub = null;
    void stopBackgroundTracking();
    deactivateKeepAwake(KEEP_AWAKE_TAG);
    Speech.stop();

    if (s.startedAt) {
      const endedAt = Date.now();
      if (s.distance > 50 || endedAt - s.startedAt > 60_000) {
        addRide({
          id: String(s.startedAt),
          startedAt: s.startedAt,
          endedAt,
          distanceMeters: Math.round(s.distance),
          maxSpeedMps: s.maxSpeed,
          destination: s.destination?.name ?? null,
          hazardCount: hazards.filter((h) => h.at >= s.startedAt).length,
        });
      }
    }

    s.route = null;
    s.destination = null;
    s.startedAt = 0;
    setPhase("idle");
    setRoute(null);
    setProgress(null);
    setDestination(null);
    setHudFrame(null);
    setOverspeed(false);
    setStartedAt(null);
  }, [addRide, hazards]);

  const startRide = useCallback(
    async (dest: Place | null) => {
      setError(null);
      setPhase("starting");
      const here = await getCurrentPosition();
      if (!here) {
        setPhase("idle");
        return;
      }

      let planned: Route | null = null;
      if (dest) {
        try {
          planned = await fetchRoute(here, dest.location);
        } catch (e) {
          setError((e as Error).message);
          setPhase("idle");
          return;
        }
      }

      const s = r.current;
      s.sub?.remove();
      Object.assign(s, {
        route: planned,
        destination: dest,
        nextStep: 1,
        announced: new Set<number>(),
        lastPos: here,
        distance: 0,
        maxSpeed: 0,
        lastSendAt: 0,
        lastSentDist: -1,
        lastSentStep: -1,
        lastRerouteAt: Date.now(),
        lastOverspeedAt: 0,
        arrivedSpoken: false,
        startedAt: Date.now(),
      });

      setDestination(dest);
      setRoute(planned);
      setPosition(here);
      setDistanceTravelled(0);
      setMaxSpeedMps(0);
      setStartedAt(s.startedAt);
      setProgress(planned ? computeProgress(planned, here) : null);

      try {
        s.sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 3 },
          onLocation,
        );
        void startBackgroundTracking(onLocation);
      } catch {
        setError("Couldn't start GPS tracking.");
        setPhase("idle");
        return;
      }

      await activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
      setPhase("active");
      if (planned && planned.steps[1]) {
        const first = computeProgress(planned, here);
        sendToHelmet(first.direction, first.distanceToManeuver);
        speak(
          settingsRef.current.voicePrompts,
          `Starting navigation to ${dest?.name}. ${planned.steps[1].instruction} in ${formatDistance(first.distanceToManeuver, settingsRef.current.units)}.`,
        );
      } else {
        speak(settingsRef.current.voicePrompts, "Ride started.");
      }
    },
    [getCurrentPosition, onLocation, sendToHelmet],
  );

  // Push the current arrow again whenever the helmet (re)connects mid-ride.
  useEffect(() => {
    if (status === "connected" && hudFrame) {
      connection.sendNavigation(hudFrame.direction, hudFrame.distance).catch(() => undefined);
    }
    // Only on connection changes, not on every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => () => {
    r.current.sub?.remove();
    void stopBackgroundTracking();
  }, []);

  return (
    <RideContext.Provider
      value={{
        phase,
        destination,
        route,
        progress,
        position,
        speedMps,
        distanceTravelled,
        maxSpeedMps,
        startedAt,
        overspeed,
        rerouting,
        error,
        locationBlocked,
        hudFrame,
        startRide,
        endRide,
        getCurrentPosition,
        openLocationSettings: () => void Linking.openSettings(),
      }}
    >
      {children}
    </RideContext.Provider>
  );
}

export function useRide(): RideContextValue {
  const value = useContext(RideContext);
  if (!value) {
    throw new Error("useRide must be used within a RideProvider");
  }
  return value;
}
