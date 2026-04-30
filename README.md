# Chess Clock

A mobile chess timer application built with Ionic and Angular for two-player games with customizable time controls.

## Overview

Chess Clock is a fully-featured chess timer designed for over-the-board games. Players tap their side of the screen to switch turns, with support for the most common time control formats used in competitive and casual play. Includes increment modes, custom configurations, visual personalization, and multilanguage support.

## Features

- **Two-player layout**: Top and bottom clock panels — tap your panel to pass the turn
- **Increment modes**:
  - **Fischer**: Fixed time added after each move
  - **Bronstein**: Unused time carries over (capped at the increment limit)
  - **Turn limit**: Time budget per individual turn with a dedicated turn clock
  - **None**: Straight countdown with no increment
- **Pre-configured modes**: Bullet, Blitz Pro, Blitz Casual, Rapid Social, Rapid Club and Classic
- **Custom modes**: Create, save, edit and delete your own time controls
- **Visual personalization**: Custom player names and panel colors with automatic contrast-aware text
- **Sound effects**: Click sound on turn switch and alarm on timeout
- **Multilanguage**: Spanish, English and Galician (auto-detected from device language)
- **Persistent settings**: All preferences and saved modes stored in localStorage

## Pre-configured Modes

| Mode | Time | Increment |
|---|---|---|
| Bullet | 1 min | — |
| Blitz Pro | 3 min | +2s Fischer |
| Blitz Casual | 5 min | — |
| Rapid Social | 10 min | — |
| Rapid Club | 15 min | +10s Fischer |
| Classic | 60 min | +30s Fischer |

## Technologies

- **Ionic Framework** 8.0.0
- **Angular** 20.0.0
- **Capacitor** 8.3.1
- **TypeScript** 5.9.0
- **RxJS** 7.8.0
- **ngx-translate** 17.0.0

## Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- npm
- Ionic CLI: `npm install -g @ionic/cli`

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd chess-clock
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
ionic serve
```

4. Open your browser at `http://localhost:8100`

### Building for Production

#### Android
```bash
ionic build
npx cap sync android

# Update version in android/app/build.gradle

cd android
./gradlew clean
./gradlew assembleRelease    # generates APK
./gradlew bundleRelease      # generates AAB for Google Play
```

Output files:
- `android/app/build/outputs/apk/release/app-release.apk`
- `android/app/build/outputs/bundle/release/app-release.aab`

## Project Structure

```
src/
├── app/
│   ├── pages/
│   │   ├── home/        # Main clock screen
│   │   ├── settings/    # Time and increment configuration
│   │   └── theme/       # Visual customization, sounds and language
│   └── services/
│       ├── settings.service.ts    # Game modes and time controls
│       ├── theme.service.ts       # Colors and player names
│       └── language.service.ts   # i18n management
└── assets/
    └── i18n/            # Translation files (en, es, gl)
```

## Usage

1. **Configure the game**: Go to Settings and choose a pre-configured mode or set a custom time and increment
2. **Personalize**: Go to Theme to set player names, panel colors and sounds
3. **Start playing**: Tap your panel to start the clock and pass the turn after each move
4. **Pause**: Tap the middle strip to pause and resume
5. **Reset**: Use the reset button to return to the settings and start a new game

## Data Persistence

The app uses browser LocalStorage to persist:
- Selected game mode and time controls
- Custom saved modes
- Player names and panel colors
- Sound and language preferences

## Mobile Platform Support

- **Android**: Full support via Capacitor
- **iOS**: Not tested (theoretically compatible, requires Xcode for building)

## Author

**Santiago González Lago**

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.
