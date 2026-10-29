#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo '[Lurín] QA estático'
python3 scripts/check_project.py
echo '[Lurín] Compilación Android (requiere Android SDK 36 y Gradle 8.13)'
gradle :app:assembleDebug --no-daemon --stacktrace
bash scripts/verify_apk.sh app/build/outputs/apk/debug/app-debug.apk
echo '[Lurín] APK listo en app/build/outputs/apk/debug/app-debug.apk'
