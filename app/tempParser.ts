/**
 * Parses a Health Thermometer Measurement characteristic value.
 *
 * Byte layout (IEEE-11073 / Bluetooth SIG):
 *   Byte 0   : Flags
 *              bit 0 → 0 = Celsius, 1 = Fahrenheit
 *              bit 2 → 1 = timestamp present (skip 7 bytes after mantissa)
 *              bit 3 → 1 = temperature type present
 *   Bytes 1–4: Temperature as IEEE-11073 32-bit float (SFLOAT-style)
 *              Bytes 1-3 = 24-bit signed mantissa (little-endian)
 *              Byte 4    = signed 8-bit exponent
 *
 * MAX30205 resolution: 0.00390625 °C (1/256 °C)
 */
export function parseTempMeasurement(base64Value: string): number | null {
  try {
    const bytes = Buffer.from(base64Value, "base64");
    if (bytes.length < 5) return null;

    const flags = bytes[0];
    const isFahrenheit = (flags & 0x01) !== 0;

    // 24-bit little-endian mantissa (signed)
    let mantissa =
      bytes[1] | (bytes[2] << 8) | (bytes[3] << 16);
    // Sign-extend from 24-bit
    if (mantissa & 0x800000) mantissa -= 0x1000000;

    // Signed 8-bit exponent
    const exponent = bytes[4] > 127 ? bytes[4] - 256 : bytes[4];

    const tempValue = mantissa * Math.pow(10, exponent);

    if (isFahrenheit) {
      // Convert to Celsius for unified storage
      return (tempValue - 32) * (5 / 9);
    }
    return tempValue;
  } catch {
    return null;
  }
}

/** Format a Celsius value for display */
export function formatTemp(
  celsius: number | null,
  unit: "C" | "F" = "C"
): string {
  if (celsius === null) return "---";
  if (unit === "F") {
    return ((celsius * 9) / 5 + 32).toFixed(2) + " °F";
  }
  return celsius.toFixed(2) + " °C";
}
