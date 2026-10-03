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

## Remaining owner requests

- Make face/hand capture phases obvious so people know when measurement begins
  and finishes.
- Add a clear palm diagram or equivalent labels explaining the heart, head,
  life and fate lines before readers confirm their observations.
- Show a useful simple BaZi summary first and offer a paid detailed analysis
  only when a reader asks for more depth.
- The owner has not selected one-time-per-report versus subscription or the
  detailed-report price. The current LazyOracle listing is USD 0.99. It is also
  unclear whether only the simple BaZi summary or the whole app should be free.
  Store pricing and billing remain unchanged while those choices are pending.

Continue these changes for native LazyOracle and the PWA together. The production
review for Android20 is already in progress; any later production update needs a
new Android version code and must preserve the submitted release state unless
the owner explicitly replaces it.
