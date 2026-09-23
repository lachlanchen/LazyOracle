# Auspice 宜时 — the native apps

Auspice is the native sibling of LazyOracle: the same nine practices, drawn in
SwiftUI on iOS and Jetpack Compose on Android, with no web view anywhere in
either app. It is a separate product with its own name, its own bundle
identifier (`art.lazying.auspice`) and its own store records, so work here
never disturbs a LazyOracle review in flight.

```
native/
  shared/    the payload both apps carry (generated, not tracked)
  ios/       the SwiftUI app, and the Xcode project
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

iOS loads it into **JavaScriptCore**; Android into **androidx.javascriptengine**,
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

**iOS** — the project is hand-written and needs no generator. MediaPipe's
frameworks live outside the tree (they are 1.2 GB) and are fetched once on the
Mac build host:

```bash
tools/auspice-sync.sh      # rules into Resources, then rsync to the Mac
ssh echomind-kvm-macos 'cd ~/Projects/Auspice && xcodebuild -scheme Auspice \
  -destination "generic/platform=iOS" -configuration Release build'
```

**Android** — everything is local:

```bash
cp native/shared/lazyoracle-engines.js native/android/app/src/main/assets/
cp native/shared/models/*.task native/android/app/src/main/assets/
cd native/android && ./gradlew :app:assembleDebug     # or :app:bundleRelease
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

TestFlight and Play internal testing while the app grows; no formal store
release yet. Paid from the first day at USD 0.99 and the equivalent tier
elsewhere, as every LazyingArt app is.

Current decisions and unfinished work are in
[`docs/handoffs/2026-09-23-codex-takeover.md`](../docs/handoffs/2026-09-23-codex-takeover.md).
The older native/local-model roadmap is historical; on-device LLM work is deferred.
