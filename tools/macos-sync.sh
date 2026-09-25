#!/usr/bin/env bash
# Prepare shared resources and update only the isolated desktop workspace.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"
python3 tools/auspice-sync-prompt.py
python3 tools/auspice-build-strings.py
node tools/build-engine-bundle.mjs
mkdir -p native/ios/Auspice/Resources
cp native/shared/lazyoracle-engines.js native/ios/Auspice/Resources/
node tools/macos-resources.mjs
ssh echomind-kvm-macos 'mkdir -p ~/Projects/LazyOracleDesktop/native/ios ~/Projects/LazyOracleDesktop/tools'
rsync -az --delete --exclude Resources native/ios/Auspice/ echomind-kvm-macos:~/Projects/LazyOracleDesktop/native/ios/Auspice/
rsync -az --delete --exclude build native/macos/ echomind-kvm-macos:~/Projects/LazyOracleDesktop/native/macos/
rsync -az tools/macos-build.sh tools/macos-project.rb tools/macos-vision-test.swift echomind-kvm-macos:~/Projects/LazyOracleDesktop/tools/
