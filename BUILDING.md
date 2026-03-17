# Building OpenFlow

This project uses the same codebase for Windows and macOS packaging.

## How the packaged app works

- The desktop UI runs in Electron.
- Transcription runs in a separate Python worker packaged with PyInstaller.
- Global hotkey handling runs in another packaged Python worker.
- Whisper models are downloaded on demand and stored in the user's app data folder.

## Default shortcuts

### Windows

- Dictation: `Ctrl+Win`
- Hands-free: hold `Ctrl+Win` and press `Space`
- Paste last transcription: `Ctrl+Alt+V`

### macOS

- Dictation: `Option+Space`
- The macOS dictation shortcut behaves like a toggle: press once to start and once to stop/transcribe.
- Paste last transcription: `Command+Option+V`

If `FLOW_HOTKEY` is empty, OpenFlow uses the platform default automatically.

## User data locations

### Windows

- Settings and history: `%APPDATA%/OpenFlow/store/settings.json`
- Downloaded models: `%APPDATA%/OpenFlow/models`

### macOS

- Settings and history: `~/Library/Application Support/OpenFlow/store/settings.json`
- Downloaded models: `~/Library/Application Support/OpenFlow/models`

## Prerequisites

- Node.js 20+
- npm
- Python 3.12

Recommended on Windows:

- Enable Developer Mode
- Or run the terminal as administrator

This helps avoid symlink-related issues during Electron packaging.

## Install dependencies

### Windows

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r .\python\requirements.txt
.\.venv\Scripts\python.exe -m pip install pyinstaller
npm ci
```

### macOS

```bash
python3 -m venv .venv
./.venv/bin/python -m pip install --upgrade pip
./.venv/bin/python -m pip install -r python/requirements.txt
./.venv/bin/python -m pip install pyinstaller
npm ci
```

## Development

```bash
npm start
```

## Validation

```bash
npm run check
```

## Package the Python workers

```bash
npm run build:python
```

The packaged workers are written to `build/python-dist/`.

## Build Windows

Run this on Windows:

```powershell
npm run dist:win
```

Expected outputs:

- `dist/OpenFlow Setup <version>.exe`
- `dist/win-unpacked/`

## Build macOS

Run this on macOS:

```bash
npm run dist:mac:x64
npm run dist:mac:arm64
```

Expected outputs:

- `dist/*.dmg`
- `dist/*.zip`

## CI Workflows

- [`.github/workflows/build-windows.yml`](./.github/workflows/build-windows.yml)
- [`.github/workflows/build-macos.yml`](./.github/workflows/build-macos.yml)
