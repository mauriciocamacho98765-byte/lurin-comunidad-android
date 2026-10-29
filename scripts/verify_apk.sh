#!/usr/bin/env bash
set -euo pipefail
apk="${1:-app/build/outputs/apk/debug/app-debug.apk}"
test -s "$apk" || { echo 'No existe APK'; exit 1; }
# The APK from CI must be independently installable, signed and correctly namespaced.
: "${ANDROID_HOME:=${ANDROID_SDK_ROOT:-}}"
BUILD_TOOLS="${ANDROID_HOME}/build-tools/35.0.0"
test -x "${BUILD_TOOLS}/aapt" || { echo 'No existe aapt (SDK 35.0.0)'; exit 1; }
test -x "${BUILD_TOOLS}/apksigner" || { echo 'No existe apksigner'; exit 1; }
INFO="$("${BUILD_TOOLS}/aapt" dump badging "$apk")"
printf '%s\n' "$INFO" | grep -E "^package: name='pe\.lurin\.comunidad'" >/dev/null || { echo 'packageId incorrecto'; exit 1; }
printf '%s\n' "$INFO" | grep "versionName='0.8.0-beta'" >/dev/null || { echo 'versionName incorrecto'; exit 1; }
printf '%s\n' "$INFO" | grep "launchable-activity: name='pe.lurin.comunidad.MainActivity'" >/dev/null || { echo 'MainActivity ausente'; exit 1; }
"${BUILD_TOOLS}/apksigner" verify --verbose "$apk"
sha256sum "$apk" > SHA256SUMS.txt
printf '%s\n' "APK VERIFICADO: $apk"
