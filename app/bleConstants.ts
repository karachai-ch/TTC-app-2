// MAX30205 on nRF uses standard Bluetooth SIG Health Thermometer Service
// These UUIDs are universal — no changes needed for different nRF firmware builds.

export const BLE_UUIDS = {
  // Standard Health Thermometer Service
  HEALTH_THERMOMETER_SERVICE: "00001809-0000-1000-8000-00805f9b34fb",
  // Temperature Measurement Characteristic (notify/indicate)
  TEMPERATURE_MEASUREMENT: "00002a1c-0000-1000-8000-00805f9b34fb",
  // Temperature Type Characteristic (optional, read only)
  TEMPERATURE_TYPE: "00002a1d-0000-1000-8000-00805f9b34fb",
};

// How often (ms) to poll if notifications aren't supported
export const POLL_INTERVAL_MS = 1000;

// Device name prefix — adjust to match your nRF firmware advertisement name
// e.g. if your device advertises as "TTC_001", set this to "TTC"
export const DEVICE_NAME_PREFIX = "TTC";
