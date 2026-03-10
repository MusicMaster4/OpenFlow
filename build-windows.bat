@echo off
setlocal

cd /d "%~dp0"

echo [MegaFala] Iniciando compilacao Windows...
echo [MegaFala] A pasta dist sera recriada automaticamente.

npm run dist:win
if errorlevel 1 (
  echo [MegaFala] Falha na compilacao.
  exit /b 1
)

echo.
echo [MegaFala] Compilacao concluida.
echo [MegaFala] Instalador: "%~dp0dist\MegaFala Setup 0.1.0.exe"
echo [MegaFala] App desempacotado: "%~dp0dist\win-unpacked"

exit /b 0
