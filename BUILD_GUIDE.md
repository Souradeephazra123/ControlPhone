# Build Guide for ControlPhone

This specific guide explains how to generate builds for your Expo application using **EAS Build** (Expo Application Services).

## 1. Prerequisites

Before building, you need to install the EAS CLI and log in to your Expo account.

```bash
# Install the CLI globally
npm install -g eas-cli

# Login to your Expo account
eas login
```

## 2. Configuration (`eas.json`)

To configure your project for building, run:

```bash
eas build:configure
```

Select **All** (Android and iOS) when prompted. This will create an `eas.json` file in your project root.

A standard `eas.json` might look like this (you can edit it manually):

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

## 3. Build Types

### A. Development Build
*Best for: Testing native modules (if you eject) or customized development environments.*

This creates a custom version of "Expo Go" capable of running your specific project constraints.

```bash
# Android
eas build --profile development --platform android

# iOS (Requires Apple Developer Account)
eas build --profile development --platform ios
```

### B. Preview Build (Internal Distribution)
*Best for: Sharing with your team or testers without App Store review.*

*   **Android**: Generates an `.apk` file you can install directly on a device.
*   **iOS**: Generates a build for the iOS Simulator or internal distribution (Ad Hoc).

```bash
# Android APK
eas build --profile preview --platform android

# iOS Simulator
eas build --profile preview --platform ios --simulator
```

### C. Production Build
*Best for: Submitting to Google Play Store and Apple App Store.*

*   **Android**: Generates an `.aab` (Android App Bundle).
*   **iOS**: Generates an `.ipa` file.

```bash
# Android
eas build --profile production --platform android

# iOS
eas build --profile production --platform ios
```

## 4. Submitting to Stores

Once you have a production build, you can use EAS Submit to upload it automatically.

```bash
# Submit to Google Play
eas submit -p android

# Submit to App Store
eas submit -p ios
```

## Summary of Commands

| Goal | Command | Result |
| :--- | :--- | :--- |
| **Run Locally** | `npx expo start` | QR Code for Expo Go |
| **Share APK** | `eas build -p android --profile preview` | Downloadable .apk file |
| **Store Release** | `eas build -p android --profile production` | .aab bundle for Play Console |
