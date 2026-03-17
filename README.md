# OpenFlow

OpenFlow is a desktop voice dictation app for Windows and macOS built with Electron on the UI layer and Faster-Whisper for local transcription.

It is designed for fast keyboard-free text capture, global shortcuts, a floating recording overlay, and local model execution with on-demand downloads.

## Highlights

- Local transcription powered by Faster-Whisper
- Electron desktop UI with history, diagnostics, settings, and dictionary rules
- Global dictation shortcut plus a paste-last shortcut
- Floating overlay with live activity feedback
- On-demand Whisper model downloads stored in the user data directory
- Separate Python workers for transcription and hotkey handling

## Platforms

- Windows
- macOS

## Stack

- Electron
- Node.js
- Python 3.12
- Faster-Whisper
- PyInstaller

## Quick Start

1. Install Node.js 20+ and Python 3.12.
2. Create a virtual environment: `python -m venv .venv`
3. Install Python dependencies: `.venv\Scripts\python.exe -m pip install -r python\requirements.txt` on Windows or `./.venv/bin/python -m pip install -r python/requirements.txt` on macOS
4. Install Node dependencies: `npm ci`
5. Start the app: `npm start`

## Available Scripts

- `npm start`: run the Electron app in development mode
- `npm run check`: syntax-check the tracked JavaScript files
- `npm run build:python`: package the Python workers with PyInstaller
- `npm run dist:win`: build the Windows desktop package
- `npm run dist:mac:x64`: build the macOS Intel package
- `npm run dist:mac:arm64`: build the macOS Apple Silicon package

## Repository Layout

- [`src/main`](./src/main): Electron main process, app state, worker orchestration, tray, shortcuts
- [`src/renderer`](./src/renderer): desktop UI, overlay UI, styles, translations
- [`python`](./python): transcription and hotkey worker code
- [`scripts`](./scripts): build and platform helper scripts
- [`.github/workflows`](./.github/workflows): CI packaging workflows for Windows and macOS

## Build Notes

Packaging instructions and output details are documented in [`BUILDING.md`](./BUILDING.md).

## Privacy

OpenFlow runs transcription locally on the user machine. Whisper models are downloaded when needed and then cached in the app's user data directory.

## License

This repository is source-available under the custom license in [`LICENSE`](./LICENSE). You may view, download, use, and modify the code, but you may not sell or resell OpenFlow or substantial portions of it.
