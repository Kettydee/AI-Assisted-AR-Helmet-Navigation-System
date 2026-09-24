import { BleManager, type Device, type Subscription, type State as BleState } from "react-native-ble-plx";
import { bytesToBase64, base64ToBytes } from "./base64";
import { SERVICE_UUID, NAV_CHAR_UUID, HAZARD_CHAR_UUID, CALL_CHAR_UUID, CALL_ACTION_CHAR_UUID } from "./uuids";
import type { NavigationDirection } from "../protocol/navigationProtocol";
import { encodeNavigationPacket } from "../protocol/navigationProtocol";
import type { CallEventType, CallAction } from "../protocol/callAlertProtocol";
import { encodeCallAlertPacket, decodeCallAction } from "../protocol/callAlertProtocol";
import type { HazardEvent } from "../protocol/hazardProtocol";
import { decodeHazardEvent } from "../protocol/hazardProtocol";

export type ConnectionStatus = "disconnected" | "scanning" | "connecting" | "connected";

export interface ScannedHelmet {
  id: string;
  name: string | null;
  rssi: number | null;
}

type Listener<T> = (value: T) => void;

/** Minimal pub-sub, kept dependency-free rather than pulling in an event-emitter package. */
class TinyEmitter<T> {
  private listeners: Listener<T>[] = [];

  on(listener: Listener<T>): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  emit(value: T): void {
    for (const listener of this.listeners) {
      listener(value);
    }
  }
}

/**
 * Owns the single BLE connection to the helmet's ESP32-S3
 * ("AR-Helmet-Nav" in firmware/src/main.cpp's BLEDevice::init call).
 * See useHelmetConnection.tsx for the app-facing React hook/provider around
 * this class - nothing in here is React-specific.
 *
 * Not unit-tested: react-native-ble-plx needs a real BLE stack (and a real
 * helmet to talk to) to meaningfully exercise. The pure logic it calls into
 * (base64, packet encode/decode) is tested in isolation instead - see
 * base64.test.ts and src/protocol/*.test.ts.
 */
export class HelmetConnection {
  private manager = new BleManager();
  private device: Device | null = null;
  private subscriptions: Subscription[] = [];

  status: ConnectionStatus = "disconnected";
  lastError: string | null = null;

  readonly onStatusChange = new TinyEmitter<ConnectionStatus>();
  readonly onHazardEvent = new TinyEmitter<HazardEvent>();
  readonly onCallAction = new TinyEmitter<CallAction>();
  readonly onError = new TinyEmitter<string>();

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.onStatusChange.emit(status);
  }

  private reportError(message: string): void {
    this.lastError = message;
    this.onError.emit(message);
  }

  bluetoothState(): Promise<BleState> {
    return this.manager.state();
  }

  onBluetoothStateChange(listener: (state: BleState) => void): () => void {
    const subscription = this.manager.onStateChange(listener, true);
    return () => subscription.remove();
  }

  /** Scans for helmets (filtered to devices advertising SERVICE_UUID) until stopScan(). */
  scan(onDeviceFound: (device: ScannedHelmet) => void): void {
    this.setStatus("scanning");
    const seen = new Set<string>();
    this.manager.startDeviceScan([SERVICE_UUID], null, (error, device) => {
      if (error) {
        this.reportError(`Scan failed: ${error.message}`);
        this.setStatus("disconnected");
        return;
      }
      if (!device || seen.has(device.id)) {
        return;
      }
      seen.add(device.id);
      onDeviceFound({ id: device.id, name: device.name, rssi: device.rssi });
    });
  }

  stopScan(): void {
    this.manager.stopDeviceScan();
    if (this.status === "scanning") {
      this.setStatus("disconnected");
    }
  }

  async connect(deviceId: string): Promise<void> {
    this.stopScan();
    this.setStatus("connecting");
    try {
      const connected = await this.manager.connectToDevice(deviceId);
      const device = await connected.discoverAllServicesAndCharacteristics();
      this.device = device;

      this.subscriptions.push(
        device.onDisconnected(() => {
          this.device = null;
          this.clearSubscriptions();
          this.setStatus("disconnected");
        }),
      );

      this.subscriptions.push(
        device.monitorCharacteristicForService(SERVICE_UUID, HAZARD_CHAR_UUID, (error, characteristic) => {
          if (error) {
            this.reportError(`Hazard monitor error: ${error.message}`);
            return;
          }
          if (!characteristic?.value) {
            return;
          }
          const event = decodeHazardEvent(base64ToBytes(characteristic.value));
          if (event) {
            this.onHazardEvent.emit(event);
          }
        }),
      );

      this.subscriptions.push(
        device.monitorCharacteristicForService(SERVICE_UUID, CALL_ACTION_CHAR_UUID, (error, characteristic) => {
          if (error) {
            this.reportError(`Call-action monitor error: ${error.message}`);
            return;
          }
          if (!characteristic?.value) {
            return;
          }
          const action = decodeCallAction(base64ToBytes(characteristic.value));
          if (action !== null) {
            this.onCallAction.emit(action);
          }
        }),
      );

      this.setStatus("connected");
    } catch (error) {
      this.reportError(`Connect failed: ${(error as Error).message}`);
      this.setStatus("disconnected");
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    const deviceId = this.device?.id;
    this.device = null;
    this.clearSubscriptions();
    this.setStatus("disconnected");
    if (deviceId) {
      // Already-disconnected is not an error we care about here.
      await this.manager.cancelDeviceConnection(deviceId).catch(() => undefined);
    }
  }

  async sendNavigation(direction: NavigationDirection, distanceMeters: number): Promise<void> {
    await this.write(NAV_CHAR_UUID, encodeNavigationPacket(direction, distanceMeters));
  }

  async sendCallAlert(eventType: CallEventType, callerName?: string): Promise<void> {
    await this.write(CALL_CHAR_UUID, encodeCallAlertPacket(eventType, callerName));
  }

  private async write(characteristicUUID: string, bytes: Uint8Array): Promise<void> {
    if (!this.device) {
      throw new Error("Not connected to a helmet.");
    }
    await this.device.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      characteristicUUID,
      bytesToBase64(bytes),
    );
  }

  private clearSubscriptions(): void {
    for (const subscription of this.subscriptions) {
      subscription.remove();
    }
    this.subscriptions = [];
  }

  async destroy(): Promise<void> {
    this.stopScan();
    this.clearSubscriptions();
    await this.manager.destroy();
  }
}
