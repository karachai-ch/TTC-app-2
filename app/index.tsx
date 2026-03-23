import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Animated,
  useAnimatedValue,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Device } from "react-native-ble-plx";
import { useBLE } from "../src/hooks/useBLE";
import { formatTemp } from "../src/utils/tempParser";

type TempUnit = "C" | "F";

export default function HomeScreen() {
  const {
    status,
    temperature,
    deviceName,
    error,
    scannedDevices,
    startScan,
    stopScan,
    connectTo,
    disconnect,
  } = useBLE();

  const [unit, setUnit] = useState<TempUnit>("C");
  const pulseAnim = useAnimatedValue(1);

  // Pulse animation when a reading arrives
  React.useEffect(() => {
    if (temperature !== null) {
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 120, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [temperature]);

  const isScanning = status === "scanning";
  const isConnecting = status === "connecting";
  const isConnected = status === "connected";

  const displayTemp = formatTemp(temperature, unit);

  const renderDevice = ({ item }: { item: Device }) => (
    <TouchableOpacity
      style={styles.deviceRow}
      onPress={() => connectTo(item)}
      activeOpacity={0.7}
    >
      <View>
        <Text style={styles.deviceName}>{item.name ?? "Unknown Device"}</Text>
        <Text style={styles.deviceId}>{item.id}</Text>
      </View>
      <View style={styles.connectBadge}>
        <Text style={styles.connectBadgeText}>CONNECT</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>TTC</Text>
        <Text style={styles.subtitle}>MAX30205 · nRF BLE</Text>
      </View>

      {/* Status pill */}
      <View style={[styles.statusPill, styles[`pill_${status}`]]}>
        <View style={[styles.dot, styles[`dot_${status}`]]} />
        <Text style={styles.statusText}>{STATUS_LABELS[status]}</Text>
        {deviceName ? (
          <Text style={styles.deviceNamePill}>  ·  {deviceName}</Text>
        ) : null}
      </View>

      {/* ── Temperature card ── */}
      {isConnected && (
        <View style={styles.tempCard}>
          <Text style={styles.tempLabel}>TEMPERATURE</Text>
          <Animated.Text
            style={[styles.tempValue, { transform: [{ scale: pulseAnim }] }]}
          >
            {displayTemp}
          </Animated.Text>

          {/* Unit toggle */}
          <View style={styles.unitToggle}>
            {(["C", "F"] as TempUnit[]).map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
                onPress={() => setUnit(u)}
              >
                <Text
                  style={[styles.unitBtnText, unit === u && styles.unitBtnTextActive]}
                >
                  °{u}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.disconnectBtn} onPress={disconnect}>
            <Text style={styles.disconnectText}>DISCONNECT</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Scan UI (when not connected) ── */}
      {!isConnected && (
        <View style={styles.scanSection}>
          {isConnecting ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color="#e8c100" size="large" />
              <Text style={styles.hintText}>Connecting…</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.scanBtn, isScanning && styles.scanBtnActive]}
                onPress={isScanning ? stopScan : startScan}
                activeOpacity={0.8}
              >
                {isScanning ? (
                  <ActivityIndicator color="#0a0a0f" size="small" />
                ) : null}
                <Text style={styles.scanBtnText}>
                  {isScanning ? "  SCANNING…" : "SCAN FOR DEVICE"}
                </Text>
              </TouchableOpacity>

              {scannedDevices.length > 0 && (
                <>
                  <Text style={styles.listHeader}>FOUND DEVICES</Text>
                  <FlatList
                    data={scannedDevices}
                    keyExtractor={(d) => d.id}
                    renderItem={renderDevice}
                    style={styles.list}
                    contentContainerStyle={{ gap: 8 }}
                  />
                </>
              )}

              {isScanning && scannedDevices.length === 0 && (
                <Text style={styles.hintText}>
                  Make sure your nRF device is powered on and advertising.
                </Text>
              )}
            </>
          )}
        </View>
      )}

      {/* Error */}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠ {error}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const STATUS_LABELS: Record<string, string> = {
  idle: "Ready",
  scanning: "Scanning…",
  connecting: "Connecting…",
  connected: "Connected",
  disconnected: "Disconnected",
  error: "Error",
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const C = {
  bg: "#0a0a0f",
  surface: "#13131c",
  border: "#1e1e2e",
  yellow: "#e8c100",
  yellowDim: "#fceea4",
  text: "#fffcfd",
  muted: "#6b6b8a",
  red: "#ff4d6d",
  green: "#39d98a",
  scanning: "#5b8fff",
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20 },

  header: { marginTop: 20, marginBottom: 12 },
  logo: {
    fontSize: 42,
    fontWeight: "900",
    color: C.yellow,
    letterSpacing: 8,
  },
  subtitle: { fontSize: 11, color: C.muted, letterSpacing: 3, marginTop: 2 },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    marginBottom: 24,
  },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 7 },

  // Status-specific dot colors
  dot_idle: { backgroundColor: C.muted },
  dot_scanning: { backgroundColor: C.scanning },
  dot_connecting: { backgroundColor: C.yellow },
  dot_connected: { backgroundColor: C.green },
  dot_disconnected: { backgroundColor: C.red },
  dot_error: { backgroundColor: C.red },

  // Status-specific pill border colors
  pill_idle: { borderColor: C.border },
  pill_scanning: { borderColor: C.scanning },
  pill_connecting: { borderColor: C.yellow },
  pill_connected: { borderColor: C.green },
  pill_disconnected: { borderColor: C.red },
  pill_error: { borderColor: C.red },

  statusText: { fontSize: 11, color: C.text, letterSpacing: 1 },
  deviceNamePill: { fontSize: 11, color: C.muted },

  // Temperature card
  tempCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    padding: 32,
    alignItems: "center",
    marginBottom: 24,
  },
  tempLabel: {
    fontSize: 10,
    letterSpacing: 4,
    color: C.muted,
    marginBottom: 16,
  },
  tempValue: {
    fontSize: 64,
    fontWeight: "800",
    color: C.yellowDim,
    letterSpacing: -2,
    marginBottom: 24,
  },

  unitToggle: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 28,
  },
  unitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  unitBtnActive: { backgroundColor: C.yellow, borderColor: C.yellow },
  unitBtnText: { fontSize: 13, color: C.muted, fontWeight: "700" },
  unitBtnTextActive: { color: C.bg },

  disconnectBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.red,
  },
  disconnectText: { fontSize: 11, color: C.red, letterSpacing: 2 },

  // Scan section
  scanSection: { flex: 1 },
  scanBtn: {
    backgroundColor: C.yellow,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
  },
  scanBtnActive: { backgroundColor: C.scanning },
  scanBtnText: { fontSize: 13, fontWeight: "800", color: C.bg, letterSpacing: 2 },

  listHeader: {
    fontSize: 10,
    letterSpacing: 3,
    color: C.muted,
    marginBottom: 10,
  },
  list: { flex: 1 },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  deviceName: { fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 2 },
  deviceId: { fontSize: 10, color: C.muted, letterSpacing: 1 },
  connectBadge: {
    backgroundColor: C.yellow,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  connectBadgeText: { fontSize: 10, fontWeight: "800", color: C.bg, letterSpacing: 1 },

  centerBox: { alignItems: "center", marginTop: 40, gap: 16 },
  hintText: { color: C.muted, fontSize: 13, textAlign: "center", marginTop: 12 },

  errorBox: {
    backgroundColor: "#1f0a10",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.red,
    padding: 14,
    marginBottom: 16,
  },
  errorText: { color: C.red, fontSize: 13 },
});
