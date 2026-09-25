#!/usr/bin/env bash
# On the Mac, after macos-sync.sh (or resource preparation in a full checkout).
# Ad-hoc signed local test package. Distribution signing/notarization is separate.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"
[[ "$(uname -s)" == Darwin ]] || { echo 'Run this build on a Mac.' >&2; exit 1; }
mkdir -p release
xcodebuild -project native/macos/LazyOracle.xcodeproj -scheme LazyOracle \
  -configuration Release -destination 'generic/platform=macOS' \
  -derivedDataPath release/macos-derived ARCHS='arm64 x86_64' ONLY_ACTIVE_ARCH=NO build
APP="$REPO/release/macos-derived/Build/Products/Release/LazyOracle.app"
codesign --verify --deep --strict "$APP"
VERSION=$(/usr/libexec/PlistBuddy -c 'Print CFBundleShortVersionString' "$APP/Contents/Info.plist")
BUILD=$(/usr/libexec/PlistBuddy -c 'Print CFBundleVersion' "$APP/Contents/Info.plist")
ZIP="$REPO/release/LazyOracle-macOS-$VERSION-$BUILD.zip"
ditto -c -k --sequesterRsrc --keepParent "$APP" "$ZIP"
shasum -a 256 "$ZIP"
lipo -archs "$APP/Contents/MacOS/LazyOracle"
