# Going native, screen by screen

Status: plan. Written 2026-09-22, after the owner asked for "more native" iOS
and Android apps and a gradual switch from the current shell.

## Where we are

The app is one TypeScript codebase in a Capacitor shell. Everything the reader
sees is a web view; the engines, the visuals and the reading pipeline are the
same code on the web, on iPhone and on Android. That is why one afternoon can
add a practice to all three at once, and it should not be given up lightly.

## Why native is nonetheless worth it

Four things the web view cannot do well, in the order they hurt:

1. **The on-device model.** A web view gets a fraction of the phone's memory,
   and loading a model needs the file about three times over, because Safari
   on iOS cannot transfer a buffer to a worker and clones it instead. That is
   exactly what defeated the iPhone SE. A native process can memory-map the
   weights, keep one copy, and use Metal on iOS or NNAPI on Android, which is
   the difference between a 300 MB model that barely runs and a 1.7B model
   that answers in a second.
2. **Widgets and daily presence.** The almanac is the reason to open the app
   every morning, and it belongs on the home screen: a WidgetKit widget on
   iOS, a Glance widget on Android, showing today's 宜 and 忌. A web view
   cannot draw either.
3. **The camera.** Palmistry and face reading currently take a still photo and
   measure it. Native gives a live preview with the landmarks drawn as the
   hand moves, using Vision on iOS and ML Kit on Android, which turns an
   awkward step into the best part of the app.
4. **Notifications and small surfaces.** A morning almanac notification, a
   Live Activity for a long model download, Apple Watch for the daily hexagram.

## The approach: replace screens, not the app

A rewrite would stop feature work for months and would fork the engines. The
alternative is to keep one shell and swap screens into native one at a time,
each behind a flag, with the web version staying as the fallback until the
native one is better. The engines stay where they are.

### What stays shared, and how

The engines are pure TypeScript with no interface code, which makes them the
crown jewels: `src/engines/` holds tarot, BaZi, the I Ching, astrology, feng
shui, palmistry, face reading, the almanac and the books. Three options for
using them from native code:

| Option | What it means | Verdict |
| --- | --- | --- |
| Port to Swift and Kotlin | Two more copies of every rule | No: the rules would drift, and the tests would too |
| Run the TypeScript in an embedded JS engine | JavaScriptCore on iOS, QuickJS or V8 on Android, loading the same bundle | **Yes**, for the engines; they are pure functions with JSON in and out |
| Compile to WebAssembly | One artefact, but an awkward bridge on both platforms | Only if the JS engine proves too slow, which it will not for these |

So: native interface, native model runtime, shared engine bundle called
through a thin bridge. Every engine already returns plain data, so the bridge
is one function: `evaluate(engine, input) -> json`.

The golden-file tests that exist today become the contract: the same inputs
must give the same JSON from the web and from the bridge, checked in CI.

## Order of work

**Phase 1, the model runtime.** The largest gain and the one the owner has
already felt. Ship `llama.cpp` natively: `llama.cpp` via Swift package on iOS
with Metal, and via JNI on Android with NNAPI or Vulkan. Keep wllama for the
web. Acceptance: Tianji Pro (1.1 GB) loads and answers on an iPhone SE 3
without the web view being killed, and a reading streams in under ten seconds.

**Phase 2, the almanac widget.** Small, self-contained, and the daily habit.
WidgetKit and Glance, reading a cached JSON the app writes each midnight, so
the widget never needs the engine at run time. Acceptance: the widget shows
today's 宜 and 忌 with no app launch, and updates by 00:05 local time.

**Phase 3, the camera screens.** Palmistry and face reading as native capture
with a live overlay, handing landmarks to the shared engines. Acceptance: the
overlay tracks at 30 frames a second on a four-year-old phone, and the reading
matches the web version's numbers for the same still frame.

**Phase 4, the reading and chat screens.** SwiftUI and Compose versions of the
practice screens, one at a time, starting with tarot because its animation
gains most. The chat last, because streaming, tool calls and the saved
conversations are the most intricate part and the web version works well.

**Phase 5, the small surfaces.** Morning notification, Live Activity for a
download, Apple Watch daily hexagram.

## What would make this a mistake

- Porting the engines by hand. If a rule is ever written twice, the two apps
  will disagree about someone's day master, and no test will catch it unless
  the golden files are shared.
- Rewriting the visuals before the model runtime. The wheel and the bagua rose
  look good already; the memory ceiling is what loses people.
- Running two release trains at different speeds. Each phase ships to both
  stores together, or the store listings start describing different apps.

## Effort, honestly

Phase 1 is the expensive one: a week of careful work per platform, mostly
build configuration and memory behaviour rather than code. Phases 2 and 3 are
two or three days each per platform. Phase 4 is open-ended and should be done
screen by screen, only where the native version is clearly better. Phase 5 is
a day each.

Nothing here blocks the current release. The shell as it stands is a complete
product, and every phase above can ship as an ordinary update.
