# TTC BLE App — Build Guide
### MAX30205 on Seeed Studio nRF → Android APK via EAS Build

---

## Project Structure

```
ttc-ble-app/
├── app/
│   ├── _layout.tsx          ← Expo Router root layout
│   └── index.tsx            ← Main screen (scan + connect + display)
├── src/
│   ├── hooks/
│   │   └── useBLE.ts        ← All BLE logic (scan, connect, stream)
│   └── utils/
│       ├── bleConstants.ts  ← UUIDs & config
│       └── tempParser.ts    ← IEEE-11073 temperature decoder
├── app.json                 ← Expo config + Android BLE permissions
├── eas.json                 ← EAS Build profiles
└── package.json
```

---

## Step 1 — Set up your environment

You only need Node.js and npm. No Android Studio required.

```bash
# Install Expo CLI and EAS CLI globally
npm install -g expo-cli eas-cli

# Verify EAS
eas --version
```

---

## Step 2 — Install dependencies

```bash
cd ttc-ble-app
npm install
```

---

## Step 3 — Log in to Expo (free account required for EAS Build)

```bash
eas login
# Enter your expo.dev credentials
# Sign up free at https://expo.dev if you don't have an account
```

---

## Step 4 — Configure your project on Expo

```bash
eas build:configure
# When asked "Which platforms?", choose: Android
# This generates/updates eas.json (already included)
```

---

## Step 5 — (Optional) Update device name prefix

If your nRF firmware advertises under a specific name, open:

```
src/utils/bleConstants.ts
```

Change `DEVICE_NAME_PREFIX` to match your device's advertisement name.
The app scans by **Health Thermometer Service UUID** so this is optional —
it works without the name filter.

---

## Step 6 — Build the APK

```bash
npm run build:android
# or equivalently:
eas build --platform android --profile preview
```

- EAS uploads your code to Expo's cloud servers
- They build the APK remotely (takes ~5–10 min)
- When done, you get a **download link** for the `.apk` file

---

## Step 7 — Install on your Android phone

1. Download the `.apk` from the EAS link
2. On your phone: **Settings → Security → Install unknown apps → allow your browser**
3. Open the downloaded APK and tap Install

---

## How the app works

1. **Tap "SCAN FOR DEVICE"** — scans for BLE devices advertising the Health Thermometer Service UUID (`0x1809`)
2. **Tap your nRF device** from the list — connects and discovers services
3. **Live temperature appears** — streamed via BLE notifications from the MAX30205
4. **Toggle °C / °F** — converts on the fly, raw data always stored as Celsius
5. **Disconnect button** — cleanly terminates the BLE connection

---

## nRF Firmware Requirements

Your Seeed Studio nRF firmware must:
- Advertise **Health Thermometer Service** (`0x1809`)
- Expose **Temperature Measurement Characteristic** (`0x2A1C`) with **Indicate** or **Notify** property
- Send temperature in **IEEE-11073 FLOAT** format (standard for this characteristic)

This matches the standard nRF Connect SDK `ble_hts` sample and most Health Thermometer implementations.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| No devices found | Make sure Bluetooth & Location are ON; nRF is powered & advertising |
| "Permissions denied" | Go to phone Settings → Apps → TTC BLE → Permissions → enable all |
| Connects but no temperature | Check nRF firmware sends Indicate/Notify on `0x2A1C` |
| Build fails on EAS | Run `eas diagnostics` and check the build logs URL it prints |

---

## Making changes and rebuilding

After any code change:
```bash
eas build --platform android --profile preview
```
EAS handles everything in the cloud — no local Android toolchain needed.
