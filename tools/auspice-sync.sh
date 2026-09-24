#!/usr/bin/env bash
# Put the shared rules where the native iOS app can load them, then copy the
# project to the Mac build host.
#
# The rules are built from the same TypeScript the web app runs, so this is the
# only step that keeps the two in step; there is no second implementation to
# update.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"
python3 tools/auspice-build-strings.py
node tools/build-engine-bundle.mjs
mkdir -p native/ios/Auspice/Resources
cp native/shared/lazyoracle-engines.js native/ios/Auspice/Resources/
rsync -az --delete --exclude Frameworks --exclude build.sh --exclude release -e ssh native/ios/ echomind-kvm-macos:~/Projects/Auspice/
echo "synced $(wc -c < native/ios/Auspice/Resources/lazyoracle-engines.js) bytes of rules"
