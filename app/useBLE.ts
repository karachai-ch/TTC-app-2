import { useState, useEffect, useRef, useCallback } from "react";
import { Platform, PermissionsAndroid, Alert } from "react-native";
import { BleManager, Device, State, Subscription } from "react-native-ble-plx";
import { BLE_UUIDS, DEVICE_NAME_PREFIX } from "../utils/bleConstants";
import { parseTempMeasurement } from "../utils/tempParser";

// Singleton BleManager — only one instance allowed per app lifetime
const manager = new BleManager();

export type ConnectionStatus =
  | "idle"
  | "scanning"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface BLEState {
  status: ConnectionStatus;
  temperature: number | null; // Always in Celsius
  deviceName: string | null;
  error: string | null;
  scannedDevices: Device[];
  startScan: () => void;
  stopScan: () => void;
  connectTo: (device: Device) => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useBLE(): BLEState {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [temperature, setTemperature] = useState<number | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scannedDevices, setScannedDevices] = useState<Device[]>([]);

  const connectedDevice = useRef<Device | null>(null);
  const tempSubscription = useRef<Subscription | null>(null);
  const scanTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Permissions ──────────────────────────────────────────────────────────
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== "android") return true;

    if (Platform.Version >= 31) {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return Object.values(results).every(
        (r) => r === PermissionsAndroid.RESULTS.GRANTED
      );
    } else {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
  }, []);

  // ── Scan ─────────────────────────────────────────────────────────────────
  const startScan = useCallback(async () => {
    setError(null);
    setScannedDevices([]);

    const granted = await requestPermissions();
    if (!granted) {
      setError("Bluetooth permissions denied.");
      setStatus("error");
      return;
    }

    const btState = await manager.state();
    if (btState !== State.PoweredOn) {
      setError("Bluetooth is off. Please enable it and try again.");
      setStatus("error");
      return;
    }

    setStatus("scanning");
    const seen = new Set<string>();

    manager.startDeviceScan(
      [BLE_UUIDS.HEALTH_THERMOMETER_SERVICE],
      { allowDuplicates: false },
      (err, device) => {
        if (err) {
          setError(err.message);
          setStatus("error");
          return;
        }
        if (device && !seen.has(device.id)) {
          seen.add(device.id);
          setScannedDevices((prev) => [...prev, device]);
        }
      }
    );

    // Auto-stop after 15 s
    scanTimeout.current = setTimeout(() => {
      manager.stopDeviceScan();
      setStatus((s) => (s === "scanning" ? "idle" : s));
    }, 15000);
  }, [requestPermissions]);

  const stopScan = useCallback(() => {
    manager.stopDeviceScan();
    if (scanTimeout.current) clearTimeout(scanTimeout.current);
    setStatus("idle");
  }, []);

  // ── Connect ───────────────────────────────────────────────────────────────
  const connectTo = useCallback(async (device: Device) => {
    stopScan();
    setStatus("connecting");
    setError(null);

    try {
      const connected = await device.connect({ timeout: 10000 });
      await connected.discoverAllServicesAndCharacteristics();

      connectedDevice.current = connected;
      setDeviceName(connected.name ?? connected.id);
      setStatus("connected");

      // Subscribe to temperature notifications
      tempSubscription.current = connected.monitorCharacteristicForService(
        BLE_UUIDS.HEALTH_THERMOMETER_SERVICE,
        BLE_UUIDS.TEMPERATURE_MEASUREMENT,
        (err, characteristic) => {
          if (err) {
            // Device disconnected or error
            setStatus("disconnected");
            setTemperature(null);
            return;
          }
          if (characteristic?.value) {
            const parsed = parseTempMeasurement(characteristic.value);
            if (parsed !== null) setTemperature(parsed);
          }
        }
      );

      // Handle unexpected disconnection
      connected.onDisconnected(() => {
        setStatus("disconnected");
        setTemperature(null);
        tempSubscription.current?.remove();
      });
    } catch (e: any) {
      setError(e.message ?? "Connection failed");
      setStatus("error");
    }
  }, [stopScan]);

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    tempSubscription.current?.remove();
    if (connectedDevice.current) {
      try {
        await connectedDevice.current.cancelConnection();
      } catch { /* already disconnected */ }
      connectedDevice.current = null;
    }
    setStatus("idle");
    setTemperature(null);
    setDeviceName(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      tempSubscription.current?.remove();
      connectedDevice.current?.cancelConnection().catch(() => {});
      if (scanTimeout.current) clearTimeout(scanTimeout.current);
    };
  }, []);

  return {
    status,
    temperature,
    deviceName,
    error,
    scannedDevices,
    startScan,
    stopScan,
    connectTo,
    disconnect,
  };
}
