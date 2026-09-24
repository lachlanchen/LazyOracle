# Native LazyOracle and classic Auspice — 2026-09-24

The owner chose a lasting swap: **LazyOracle is the main native app**, with
SwiftUI/Compose and live face/palm views. **Auspice carries the classic interface**
from the maintained React PWA. There is no interface switch in either app.
Both retain their original identifiers, store records, signing identities,
names and icons. Engines and cloud narration are shared; UI implementations
remain native and web, rather than two separate copies of business logic.

## Native LazyOracle release

Source `95dec20989fbfcf4e5837bd9ae43e0ded6cee5a9`.

- iOS **1.0.0 (16)**: Apple validation passed; internal and public TestFlight
  `IN_BETA_TESTING`. Public link: https://testflight.apple.com/join/JZJM3PFb.
- Android **1.0.0 (14)**: signed bundle published and verified **Available to
  internal testers** at https://play.google.com/apps/internaltest/4701677916092886102.
- The PWA fixes are deployed to `oracle.lazying.art` and `oracle-fast.lazying.art`.
- Receipt: [native-main-2026-09-24.json](../../store/artifacts/native-main-2026-09-24.json).

Each practice retains its inputs, exact deterministic result, follow-up
conversation and draft across navigation/relaunch. Explicit new readings remain.
Ask Tianji stays at the screen bottom; its replies appear below the computed
analysis. Camera sessions, photographs and transient loading state are not saved.

Chat now has bounded requests/exchanges, cancellation, visible failure and Retry.
Retries keep computed tool facts and do not duplicate the question or draw.
`[DONE]` terminates PWA streaming even if the server leaves its connection open.
Stale responses cannot write into a newly opened conversation. Existing classic
LazyOracle profiles, language and chat history import locally into the native
app; the original WebView data remains available for rollback.

Earlier fixes retained: native camera model lifecycle/teardown protection,
integer-or-string tarot rank decoding, blank-question tarot, home-to-chat delivery,
visible new conversation action and latest-message navigation. The reported
intermittent Chinese direction-question hang was not reproduced as a specific
root cause; the bounded recovery behavior prevents an endless loading state.

## Language

Shared relay commit `57d1117` distinguishes the reader's own words from English
engine labels. The prompt naturally respects an explicit language request,
then the reader's language, with the interface language as a fallback. There
is no script detector, forced translation or output-language filter. Live checks
on both production hosts returned Chinese for “西边怎么样” and English when
explicitly requested. Native UI supports eleven languages; the classic/PWA UI
currently offers English and Simplified Chinese.

## Validation and limits

- 118 web tests, lint, type checks and production build at native release.
- Six Android conversation tests and six Swift chat harness cases.
- Five native iOS UI tests: eleven-language navigation, home chat, explanations,
  pinned composer with keyboard/relaunch, blank/Chinese tarot questions.
- PWA real face/hand inference and 27 fixed-composer layouts at three phone sizes.
- Actual classic-to-native in-place upgrade on iOS and Android: profile, language,
  conversations, exact engine facts and original storage retained.
- Earlier unchanged engine coverage: all 78 tarot cards, 300 draws, 100 casts;
  24 real MediaPipe simulator lifecycle cycles, 144 frames.
- Physical iPhone SE 3 camera/orientation/background/memory testing is still
  pending. Simulator/browser checks do not establish physical-device stability.

Native requirements are iOS 17 and Android API 26. Play reported 1,382 previously
supported devices excluded by native Android requirements. The PWA and classic
interface remain available for older devices.

## Rollback and reviews

`rollback/lazyoracle-classic-2026-09-24` points to `9e008d5`; classic LazyOracle
signed iOS15/Android13 and native Auspice iOS9/Android6 remain retained. Shipping
a rollback requires a new higher build number; do not reuse a store build number.
Do not overwrite previous signed packages or private migration backups.

LazyOracle's separate formal Apple build12 remains `WAITING_FOR_REVIEW`, and
Play production11 remains in **Changes in review**, verified after native16/14
publication. Auspice has no formal release submitted. Test releases do not replace
these production submissions. Apple accepted LazyOracle16 for public beta testing.

The reverse Auspice swap is implemented in `d746040`, using the maintained PWA
source and a read-only native archive import. Classic iOS **0.1.0 (12)** is `VALID` and `IN_BETA_TESTING` in the existing
Auspice internal group; Android **0.1.0 (7)** is available to internal testers. The original native profile and chat
storage remains intact after import. The classic iOS status bar is adjusted for
the dark background. See [the classic receipt](../../store/artifacts/classic-swap-2026-09-24.json).

## Auspice opening crash after the swap

The owner's iPhone SE 3 report on classic iOS11 identified a SwiftUI assertion
while iOS saved a restored scene. The old native app's archived
`SwiftUI.AppSceneDelegate` was being reused by a UIKit-only entry point. The
owner's force-quit/reopen workaround fits that failure. This was saved window
state, not evidence that the user's readings or web cache were corrupted.

The initial migration check installed native9 and seeded its files but did not
launch/background it. That checked data import while missing saved scenes.
Launching native9, backgrounding it, then installing classic reproduced the
same `Missing scene item!` crash. Build12 (`94ea1c3`) hosts the classic controller
inside the original SwiftUI scene lifecycle. It also retains `App.SceneDelegate`
for existing classic10–11 scenes. No user data or caches are deleted.

The exact native9 saved-scene upgrade passed four background/resume cycles
with the same process ID. Profile, language, chat and exact engine facts imported;
the original native archive remained byte-for-byte unchanged. An existing UIKit
scene fixture passed three resume cycles, and clean installation/cold launch
passed. A classic iOS UI test verified the input remains above the keyboard
and its draft survives background/resume. `tools/verify-ios-scene-upgrade.py` preserves the regression procedure;
run it on a disposable booted simulator with explicit `--reset-fixture`,
`--device`, `--from-app`, `--to-app`, and `--output` arguments. Physical iPhone
confirmation of build12 remains pending.

Apple's [SwiftUI lifecycle migration guidance](https://developer.apple.com/documentation/swiftui/migrating-to-the-swiftui-life-cycle)
explains the lifecycle and storyboard configuration used by this fix.

Android software-renderer emulator processes crashed during initial attempts;
the host renderer completed the migration and UI checks, then was shut down.
This was a host emulator failure, not an observed app exception.
