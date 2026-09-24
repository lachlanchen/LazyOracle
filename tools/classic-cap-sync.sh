#!/usr/bin/env bash
# The maintained classic identity is Auspice; LazyOracle is an explicit rollback.
set -euo pipefail
cd "$(dirname "$0")/.."
export CLASSIC_IDENTITY="${CLASSIC_IDENTITY:-auspice}"
export VITE_APP_IDENTITY="$CLASSIC_IDENTITY"
npm run build
npx cap sync "$@"
