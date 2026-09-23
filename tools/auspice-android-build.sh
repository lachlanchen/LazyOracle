#!/usr/bin/env bash
# Build the Auspice Android app, rules and landmark models included.
#
#   tools/auspice-android-build.sh            # debug APK, for a device on adb
#   tools/auspice-android-build.sh release    # signed AAB, for Play
#
# The signing key is the LazyingArt upload key under ~/.config/lazyoracle/android;
# it never appears in the repository or in this script's output.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

node tools/build-engine-bundle.mjs
install -m 644 native/shared/lazyoracle-engines.js native/android/app/src/main/assets/
install -m 644 native/shared/models/hand_landmarker.task native/android/app/src/main/assets/
install -m 644 native/shared/models/face_landmarker.task native/android/app/src/main/assets/

cd native/android
if [[ "${1:-debug}" == "release" ]]; then
    ./gradlew :app:bundleRelease
    BUNDLE=app/build/outputs/bundle/release/app-release.aab
    # Gradle signs the bundle a moment after it reports success, so give the
    # file a few seconds to settle before deciding it came out unsigned.
    for _ in 1 2 3 4 5 6; do
        if unzip -l "$BUNDLE" | grep -q 'META-INF/.*\.RSA'; then signed=yes; break; fi
        signed=no
        sleep 2
    done
    [[ "$signed" == yes ]] || { echo "the bundle is not signed" >&2; exit 1; }
    echo "signed bundle: $REPO/native/android/$BUNDLE"
else
    ./gradlew :app:assembleDebug
    echo "apk: $REPO/native/android/app/build/outputs/apk/debug/app-debug.apk"
fi
