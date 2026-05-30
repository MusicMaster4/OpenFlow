# Building OpenFlow

This project uses the same codebase for Windows and macOS packaging.

## macOS status

- macOS packaging is included in the repository and CI workflows.
- It has not been fully validated on a real Mac.
- The maintainer does not currently have access to macOS hardware, so the macOS path should be treated as unverified/best effort until someone tests it on-device.

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

## Environment setup

Copy [`.env.example`](./.env.example) to `.env` before running the app locally.

Suggested baseline:

```env
WHISPER_MODEL=small
WHISPER_DEVICE=auto
WHISPER_COMPUTE_TYPE=
FLOW_HOTKEY=
FLOW_PASTE_LAST_HOTKEY=
ALLOWED_LANGUAGES=en
INTERFACE_LANGUAGE=en
```

Notes:

- Leave `WHISPER_COMPUTE_TYPE` empty unless you explicitly want to force a value.
- Leave `FLOW_HOTKEY` and `FLOW_PASTE_LAST_HOTKEY` empty to use platform defaults.
- `ALLOWED_LANGUAGES` accepts comma-separated ISO codes such as `en` or `en,pt`.
- `WHISPER_MODEL_DIR` and `PYTHON_BIN` are optional advanced overrides.

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
- [`.github/workflows/release-main.yml`](./.github/workflows/release-main.yml)

On a normal branch push the platform workflows only upload CI artifacts. On a push to
`main`, the release workflow validates that the app version changed, builds Windows and
macOS, and only then creates a draft GitHub release with the generated installers and
update metadata.

Manual tag builds are still supported for recovery or one-off releases: pushing a tag
that starts with `v` (for example `v1.1.0`) makes the platform workflows publish the
installers plus the `latest.yml` / `latest-mac.yml` update metadata to the matching
GitHub release.

## Releases and in-app auto-update

OpenFlow updates itself from GitHub Releases using `electron-updater`. The repository is
configured in the `build.publish` block of [`package.json`](./package.json)
(`owner: MusicMaster4`, `repo: OpenFlow`).

Release flow:

1. Bump `version` in `package.json` and `package-lock.json` (see [`AGENTS.md`](./AGENTS.md) / [`CLAUDE.md`](./CLAUDE.md)).
2. Commit and push to `main`.
3. The release workflow builds Windows and macOS first.
4. If every build succeeds, the workflow creates tag `v<version>` and a **draft** GitHub
   release containing the generated installers and update metadata.
5. Review the draft and press **Publish release**. Once it is published, installed apps
   detect it: OpenFlow checks on startup and from **Settings → Software update**, where the
   user can download and then restart to install. `electron-updater` automatically selects
   the correct OS asset and, on macOS, the correct CPU architecture (Intel vs Apple Silicon).

To publish locally instead of via CI, set a `GH_TOKEN` with `repo` scope and run
`OPENFLOW_PUBLISH=always npm run dist:win` (Windows) or
`npm run publish:mac:arm64` / `npm run publish:mac:x64` (macOS).

### macOS multi-architecture caveat

The two macOS architectures are built on separate runners and published to the same
release, so each job writes its own `latest-mac.yml`. If both jobs publish, the last one
wins and only that architecture gets a clean auto-update entry. Until the two metadata
files are merged (or both arches are built in a single `electron-builder` invocation),
treat macOS auto-update as best effort — the Windows path is the fully supported one.

## Updating an existing installation

The Windows NSIS installer upgrades a previous install in place and keeps all user data,
because settings, history, and the dictionary live in the user data directory
(`%APPDATA%/OpenFlow/store/settings.json`), not in the install folder. `deleteAppDataOnUninstall`
is set to `false`, so even a manual uninstall/reinstall preserves preferences and rules.
