# LazyOracle product follow-up — 2026-10-03

## Google Play

Android20 (1.0.0) was submitted to production review after fixing Play's 16 KB
page-size error. The publishing overview confirms **In review** and that
automated checks have completed. Managed publishing is off, preserving automatic
release after approval. Build19 was not submitted. See
[`android-16kb-2026-10-03.json`](../../store/artifacts/android-16kb-2026-10-03.json).

## Feng Shui direction indicator

The compass previously disagreed with the measured sector: native views turned
the pointer the wrong way, while the PWA rotated the compass labels instead of
the pointer. iOS/macOS, Android and PWA now keep the compass rose fixed and turn
the pointer clockwise by the measured bearing. The text result and arrow now
use the same bearing.

Validation:

- 145 web tests passed, including an SVG pointer test at 90° and 270°.
- ESLint and the TypeScript/Vite production build passed.
- Android release Kotlin compilation and unit tests passed.
- The shared SwiftUI screen compiled in the arm64 macOS Release target on the
  LazyTunnel Mac mini. Existing Swift concurrency warnings in `MacCamera.swift`
  remain; this change did not touch that file.
- No physical compass test was run. The corrected source has not yet been
  packaged as a new iOS or Android store build.

## Face and palm capture UX

The native iOS/macOS and Android camera buttons now show ready, measuring and
completed states around the eight-frame capture. The PWA photo flow states when
a face/hand has been detected and when the result is complete. Palm crease
questions now include concise localized location guides and clarify that the
camera measures geometry, not palm creases. PWA interaction tests assert the
start message, crease guidance and completed state.

Validation after this change:

- PWA lint, all 145 tests and production build pass.
- Android LazyOracle release Kotlin compile and unit tests pass.
- Shared SwiftUI Face and Palm screens compile in the Apple Silicon Mac
  release target. Existing `Sendable` warnings in `MacCamera.swift` remain.
- The Mac mini route timed out before the later BaZi summary edit could be
  rebuilt on the Apple target; rerun that compile after the route recovers.
- No new package was signed or installed; no physical camera session was run.

## BaZi paid report decision and remaining work

- The owner confirmed the summary remains free within the current USD 0.99
  app, and each expanded BaZi report is a one-time USD 4.99 purchase. Do not
  change the app price.
- The concise free summary now appears before the detailed chart. It names the
  computed Day Master, calculated strength and favourable elements; it does not
  ask an LLM to recalculate any chart facts.
- Before showing a live $4.99 pay button, configure Apple and Google consumable
  products, native purchase flows, Google purchase verification, and a PWA
  purchase path. Preserve a delivered report in the local notebook.
- No purchase products or billing code are currently present. Apple/Play
  product setup and a secure Google verification path remain required before
  charging users. The PWA currently has no checkout backend.
- Android20 production review remains in progress. Do not replace it with a
  successor until a new version has passed these purchase flows and testing.

Continue these changes for native LazyOracle and the PWA together. The production
review for Android20 is already in progress; any later production update needs a
new Android version code and must preserve the submitted release state unless
the owner explicitly replaces it.
