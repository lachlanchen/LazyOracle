# Native LazyOracle

LazyOracle is the main app: shared SwiftUI on iOS/macOS and Jetpack Compose on Android,
with native face/palm capture. Auspice now carries the classic interface from
the PWA source under `ios/` and `android/`. The old native Auspice configuration
is retained for rollback only; do not publish it over the classic release.
The interface is native; a hidden local WebView runs once to import the classic
app's local data. The original storage is retained for rollback.

```
native/
  shared/    the payload both apps carry (generated, not tracked)
  ios/       the SwiftUI app, and the Xcode project
  macos/     desktop target referencing the same SwiftUI screens
  android/   the Compose app, and its Gradle build
```

## The one thing that is shared

The rules. `shared/lazyoracle-engines.js` is built from the same TypeScript the
web app runs — `src/engines/`, with its golden-file tests — into one bundle
with no DOM and no network:

```js
LazyOracle.evaluateJson('{"engine":"almanac.day","input":{"date":"2026-09-23"}}')
// {"ok":true,"version":1,"engine":"almanac.day","data":{ ... }}
```

iOS and macOS load it into **JavaScriptCore**; Android into **androidx.javascriptengine**,
a sandbox in its own process. Both call one function with JSON in and JSON out.

Writing the four pillars or the almanac a second time in Swift and a third in
Kotlin would look like less work for a week and then quietly disagree with the
web app about someone's day master, with no test able to catch it. So: native
interface, native camera, DeepSeek Flash narration through the relay — one set of rules.

Rebuild the bundle whenever an engine changes:

```bash
node tools/build-engine-bundle.mjs
```

## Building

**macOS 14+** — `bash tools/macos-sync.sh`, then run
`bash tools/macos-build.sh` in `~/Projects/LazyOracleDesktop` on the Mac host.
The universal development package and camera adapter are documented in
[the macOS guide](../docs/macos.md).

**iOS** — the project is hand-written and needs no generator. MediaPipe's
frameworks live outside the tree (they are 1.2 GB) and are fetched once on the
Mac build host:

```bash
tools/auspice-sync.sh      # rules into Resources, then rsync to the Mac
ssh echomind-kvm-macos 'cd ~/Projects/Auspice && xcodebuild -scheme LazyOracle \
  -destination "generic/platform=iOS" -configuration "LazyOracle Release" build'
```

**Android** — everything is local:

```bash
cp native/shared/lazyoracle-engines.js native/android/app/src/main/assets/
cp native/shared/models/*.task native/android/app/src/main/assets/
tools/auspice-android-build.sh debug lazyoracle
tools/auspice-android-build.sh release lazyoracle
```

The release bundle is signed with the LazyOracle upload key
(`~/.config/lazyoracle/android/`, alias `lazyoracle-upload`); one publisher key
serves both apps, and Play distinguishes them by application id.

## What each app carries

| | iOS | Android |
| --- | --- | --- |
| Interface | SwiftUI | Jetpack Compose |
| Rules | JavaScriptCore | androidx.javascriptengine |
| Camera | AVFoundation | CameraX |
| Landmarks | MediaPipeTasksVision | com.google.mediapipe:tasks-vision |
| Compass | CoreLocation | `TYPE_ROTATION_VECTOR` |
| Readings | our relay at `oracle-fast.lazying.art/v1` | the same |

## Distribution

LazyOracle test builds retain `art.lazying.lazyoracle`; Auspice retains
`art.lazying.auspice`. Existing formal LazyOracle reviews remain separate from
the native testing rollout. Paid from the first day at USD 0.99 and the equivalent tier
elsewhere, as every LazyingArt app is.

Current decisions and unfinished work are in
[`docs/handoffs/2026-09-23-codex-takeover.md`](../docs/handoffs/2026-09-23-codex-takeover.md).
The older native/local-model roadmap is historical; on-device LLM work is deferred.


Native targets require iOS 17 or Android 8 (API 26). The PWA remains available
for older devices. The classic rollback is tagged
`rollback/lazyoracle-classic-2026-09-24`; classic mobile source remains under
`ios/` and `android/`. Re-publishing a rollback requires a higher build number.
Use the committed `LazyOracle` / `LazyOracleValidation` schemes on iOS and the
`lazyoracle` flavor on Android. `Auspice` / `auspice` are retained native rollback configurations.

Classic Auspice: `npm run android:classic` builds the signed `auspice` flavor;
`npm run ios:classic` synchronizes the web assets and `AuspiceClassic` scheme to
the existing Mac project. `CLASSIC_IDENTITY=lazyoracle` selects the deprecated
classic identity for reproduction only; publishing requires a new build number.

`tools/native-ios-project.rb` reproduces the identity configurations if the
Xcode project is regenerated. `tools/auspice-build-strings.py` builds native
catalogues and the PWA reading vocabulary from the same source translations.
