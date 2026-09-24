#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export CLASSIC_IDENTITY="${CLASSIC_IDENTITY:-auspice}"
export VITE_APP_IDENTITY="$CLASSIC_IDENTITY"
npm run build
npx cap sync ios
# Reuse the Mac's existing Capacitor dependencies and signing setup.
rsync -az --delete --exclude build --exclude DerivedData ios/ echomind-kvm-macos:~/Projects/LazyOracle/ios/
scp tools/classic-ios-project.rb echomind-kvm-macos:~/Projects/LazyOracle/release/classic-ios-project.rb
ssh echomind-kvm-macos 'ruby ~/Projects/LazyOracle/release/classic-ios-project.rb ~/Projects/LazyOracle/ios/App/App.xcodeproj'
rsync -az echomind-kvm-macos:~/Projects/LazyOracle/ios/App/App.xcodeproj/ ios/App/App.xcodeproj/
