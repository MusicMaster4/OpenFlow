@echo off
setlocal

cd /d "%~dp0"

echo [OpenFlow] Starting Windows build...
echo [OpenFlow] The dist folder will be recreated automatically.

npm run dist:win
if errorlevel 1 (
  echo [OpenFlow] Build failed.
  exit /b 1
)

echo.
echo [OpenFlow] Build completed.
echo [OpenFlow] Installer: "%~dp0dist\OpenFlow Setup 0.1.0.exe"
echo [OpenFlow] Unpacked app: "%~dp0dist\win-unpacked"

exit /b 0
