#!/usr/bin/env bash
# Signed Android release: bundle (Play) and APK (direct download).
set -euo pipefail
cd "$(dirname "$0")/.."
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export LAZYORACLE_ANDROID_KEYSTORE_FILE="$HOME/.config/lazyoracle/android/upload-keystore.jks"
export LAZYORACLE_ANDROID_KEYSTORE_PASSWORD="$(cat "$HOME/.config/lazyoracle/android/upload-keystore.password")"
export LAZYORACLE_ANDROID_KEY_ALIAS=lazyoracle-upload
export LAZYORACLE_ANDROID_KEY_PASSWORD="$LAZYORACLE_ANDROID_KEYSTORE_PASSWORD"
export CLASSIC_IDENTITY="${CLASSIC_IDENTITY:-auspice}"
export VITE_APP_IDENTITY="$CLASSIC_IDENTITY"
FLAVOR="${CLASSIC_IDENTITY^}"
npm run build >/dev/null
npx cap sync android >/dev/null
cd android && ./gradlew --no-daemon --max-workers=6 -q :app:assemble${FLAVOR}Release :app:bundle${FLAVOR}Release :app:assemble${FLAVOR}Debug
echo BUILD_OK
ls -la app/build/outputs/bundle/${CLASSIC_IDENTITY}Release/*.aab app/build/outputs/apk/${CLASSIC_IDENTITY}/release/*.apk
sha256sum app/build/outputs/bundle/${CLASSIC_IDENTITY}Release/*.aab app/build/outputs/apk/${CLASSIC_IDENTITY}/release/*.apk
