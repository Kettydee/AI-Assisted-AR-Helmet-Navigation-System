import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { HelmetConnection, type ConnectionStatus } from "../ble/HelmetConnection";
import type { HazardEvent } from "../protocol/hazardProtocol";

interface HelmetConnectionContextValue {
  connection: HelmetConnection;
  status: ConnectionStatus;
  lastError: string | null;
  lastHazardEvent: HazardEvent | null;
}

const HelmetConnectionContext = createContext<HelmetConnectionContextValue | null>(null);

/** One HelmetConnection (one BLE link) per app run; mount this once at the root. */
export function HelmetConnectionProvider({ children }: { children: React.ReactNode }) {
  const connectionRef = useRef<HelmetConnection | null>(null);
  if (!connectionRef.current) {
    connectionRef.current = new HelmetConnection();
  }
  const connection = connectionRef.current;

  const [status, setStatus] = useState<ConnectionStatus>(connection.status);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastHazardEvent, setLastHazardEvent] = useState<HazardEvent | null>(null);

  useEffect(() => {
    const unsubscribeStatus = connection.onStatusChange.on(setStatus);
    const unsubscribeError = connection.onError.on(setLastError);
    const unsubscribeHazard = connection.onHazardEvent.on(setLastHazardEvent);
    return () => {
      unsubscribeStatus();
      unsubscribeError();
      unsubscribeHazard();
      void connection.destroy();
    };
    // connection is a ref-held singleton for this provider's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <HelmetConnectionContext.Provider value={{ connection, status, lastError, lastHazardEvent }}>
      {children}
    </HelmetConnectionContext.Provider>
  );
}

export function useHelmetConnection(): HelmetConnectionContextValue {
  const value = useContext(HelmetConnectionContext);
  if (!value) {
    throw new Error("useHelmetConnection must be used within a HelmetConnectionProvider");
  }
  return value;
}
