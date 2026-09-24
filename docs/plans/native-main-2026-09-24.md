# Native LazyOracle as the main product — 2026-09-24

The owner now chooses LazyOracle as the main app with the shared native
SwiftUI/Compose implementation, including live hand/face camera views. The owner subsequently requested the reverse migration for Auspice: it now
carries the classic React/Capacitor interface built from the maintained PWA.
This lasting swap preserves both app IDs and previous signed builds. There is one native UI,
not an in-app classic/native switch. This supersedes the earlier product split.

- Keep the existing bundle/application IDs, store records and signing accounts.
  Share screens, deterministic engines, language catalogues and fixes; vary
  branding, signing profile, app version/build and bundle ID through build config.
- Preserve classic code and signed builds. Rollback tag:
  `rollback/lazyoracle-classic-2026-09-24` (`9e008d5`). Previous TestFlight15 and
  Play13 are the classic release; shipping a rollback requires a new build number.
- Import existing LazyOracle language, profile and chat data locally, without
  removing the original WebView storage or overwriting native data.
- Diagnose the reported Chinese “how about west” chat hang; bound network waits,
  support cancellation/retry and show recoverable failure instead of endless busy.
- Keep each practice's inputs, computed result and follow-up conversation across
  navigation/relaunch. Only an explicit new draw/cast/reading replaces it. Keep
  transient camera sessions, images and loading flags out of persistence.
- Pin the contextual Ask Tianji composer at the screen bottom. Place its
  explanations and replies below the deterministic analysis.
- Keep Android, iOS and the PWA aligned. Deprecate the old LazyOracle classic
  wrapper; ship the maintained classic interface as Auspice.
- Validate upgrade/migration, both brand builds, native UI restoration, camera
  lifecycle and live chat. Publish to test tracks and submit both apps for beta
  review when needed. Preserve the pending formal production submissions.

Store identity references:
[Apple build association](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds),
[Android update identity/signing](https://developer.android.com/build/configure-app-module).
