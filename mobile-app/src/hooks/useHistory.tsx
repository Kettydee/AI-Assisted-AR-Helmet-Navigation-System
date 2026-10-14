import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  hazardRecordFrom,
  MAX_HAZARDS,
  MAX_RIDES,
  parseList,
  prepend,
  type HazardRecord,
  type HazardSource,
  type RideRecord,
} from "../history/records";
import type { HazardEvent } from "../protocol/hazardProtocol";
import { useHelmetConnection } from "./useHelmetConnection";

const HAZARDS_KEY = "vizor.hazards.v1";
const RIDES_KEY = "vizor.rides.v1";

interface HistoryContextValue {
  hazards: HazardRecord[];
  rides: RideRecord[];
  addRide: (ride: RideRecord) => void;
  addHazard: {
    (hazard: HazardRecord): void;
    (event: HazardEvent, source: HazardSource): void;
  };
  clearHazards: () => void;
  clearRides: () => void;
}

const HistoryContext = createContext<HistoryContextValue | null>(null);

/** Local hazard log + ride history. Every helmet hazard event is recorded here automatically. */
export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const { connection } = useHelmetConnection();
  const [hazards, setHazards] = useState<HazardRecord[]>([]);
  const [rides, setRides] = useState<RideRecord[]>([]);

  useEffect(() => {
    AsyncStorage.multiGet([HAZARDS_KEY, RIDES_KEY])
      .then(([[, h], [, r]]) => {
        setHazards(parseList<HazardRecord>(h));
        setRides(parseList<RideRecord>(r));
      })
      .catch(() => undefined);
  }, []);

  const addHazard = useCallback(
    ((hazardOrEvent: HazardRecord | HazardEvent, source?: HazardSource) => {
      const record = "id" in hazardOrEvent
        ? hazardOrEvent
        : hazardRecordFrom(hazardOrEvent, Date.now(), source ?? "helmet");
      setHazards((prev) => {
        const next = prepend(prev, record, MAX_HAZARDS);
        void AsyncStorage.setItem(HAZARDS_KEY, JSON.stringify(next)).catch(() => undefined);
        return next;
      });
    }) as HistoryContextValue["addHazard"],
    [],
  );

  useEffect(() => connection.onHazardEvent.on((event) => addHazard(event, "helmet")), [connection, addHazard]);

  const addRide = useCallback((ride: RideRecord) => {
    setRides((prev) => {
      const next = prepend(prev, ride, MAX_RIDES);
      void AsyncStorage.setItem(RIDES_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const clearHazards = useCallback(() => {
    setHazards([]);
    void AsyncStorage.removeItem(HAZARDS_KEY).catch(() => undefined);
  }, []);

  const clearRides = useCallback(() => {
    setRides([]);
    void AsyncStorage.removeItem(RIDES_KEY).catch(() => undefined);
  }, []);

  return (
    <HistoryContext.Provider value={{ hazards, rides, addRide, addHazard, clearHazards, clearRides }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory(): HistoryContextValue {
  const value = useContext(HistoryContext);
  if (!value) {
    throw new Error("useHistory must be used within a HistoryProvider");
  }
  return value;
}
