# Praxi Mobile ðŸ¾

**Praxi** â€” a friendly companion app for Android: daily goals, quiet-time journaling, reminders, the Rhapsody reader, and the growing **Praxi Arcade** â€” offline-first and no account required.

> This repository deliberately ships only the **mobile app** (the Android project plus the web assets it wraps). The Electron desktop companion lives in its own separate repository.

## Features

- **Home** â€” your daily snapshot in one place.
- **Daily Goals** â€” set the day's goals, track progress, roll over automatically each day, and keep a history.
- **Pray-A-Thon** â€” pray along, right in the app.
- **Rhapsody** â€” read the day's Rhapsody of Realities inside the app; reading history and your streak are stored on-device.
- **Quick Notes** â€” capture notes in a flash, each with its own colour theme.
- **Notifications & Reminders** â€” native Android alarms and notifications that work even when the app is closed, with a schedule and quiet hours.
- **Quiet Moments** â€” a reflection journal that records quiet times and key moments.
- **Praxi Arcade** ðŸŽ® â€” *Play. Progress. Grow.*
  - **Word Scramble Â· Rhapsody Edition** â€” fully playable, offline. 45+ devotional words with original hints, 10 puzzles per round, hints that cost points, case-insensitive validation, replay, and a saved best score.
  - **SOAR** â€” an endless-runner adventure, **in development** (the card opens a coming-soon dialog).
- **Settings** â€” theme, reminder schedule, and more.

## Offline & privacy

- The core companion features work fully **offline** â€” no account, ads, or cloud backend required.
- Rhapsody and Pray-A-Thon can additionally load live content from the published sites when you are online.
- All persisted data is stored on the device, written through a single-writer store (`PraxiStore`) so it stays consistent across features.

## Tech stack

- **Capacitor 8.5** Android wrapper â€” app id `com.praxi.mobile`
- **Android** â€” minSdk 24, compile/target SDK 36
- **Web UI** â€” plain HTML/CSS/JS in `www/` (no framework)
- **Storage** â€” `www/js/store.js` (single writer). Keys: `praxi.settings`, `praxi.dailyGoals`, `praxi.momentLedger`, `praxi.rhapsody`, `praxi.customConfessions`, `praxi.arcade`
- **Notifications** â€” native Android code (`AlarmManager`, `NotificationChannel`, `NotificationManager`); no plugin needed.

## Repository layout

```
android/                     Android project (Capacitor wrapper)
www/                         Web app source (where the app is actually built)
â”œâ”€â”€ index.html               App shell (all pages)
â”œâ”€â”€ home.js / home.css       Main UI and navigation
â”œâ”€â”€ daily-goals.js           Daily goals feature
â”œâ”€â”€ games.js / games.css     Praxi Arcade (Word Scramble + SOAR card)
â”œâ”€â”€ js/
â”‚   â”œâ”€â”€ store.js             Single-writer data store
â”‚   â”œâ”€â”€ bridge.js            Native bridge (notifications, widgets, chat)
â”‚   â”œâ”€â”€ word-bank.js         Word Scramble word bank
â”‚   â””â”€â”€ scramble-core.js     Pure word-scramble/game logic (unit-tested)
â”œâ”€â”€ config/                  settings, messages, personality, confessions
â”œâ”€â”€ css/                     Mobile navigation and widgets
â””â”€â”€ assets/                  Images
capacitor.config.json        Capacitor app config
```

## Building from source

Prerequisites: **Node â‰¥ 18**, **JDK 21**, **Android SDK** (platform 36).

```bash
npm install
npx cap sync android          # copies www/ into android/app/src/main/assets/public
cd android
./gradlew assembleDebug       # Windows: gradlew.bat
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.

## Installing the APK

Prebuilt APKs are attached to the [Releases](https://github.com/Xav3r24/Praxi-Mobile-App/releases) page.

1. Download the `.apk` (for example straight from your phone's browser).
2. When prompted, allow **"install unknown apps"** for the app you are using to open it.
3. Tap to install. Builds are debug-signed, so Android may show a safety warning â€” that is expected.
4. Installing over an older build keeps your existing data.

## Maintainer

Built with â¤ï¸ by Xavier (Xav3r24).

## License

MIT
