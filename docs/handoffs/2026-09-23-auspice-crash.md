# Auspice build 7 crash: scalar engine result

The owner reported build 7 crashing on an iPhone SE (3rd generation), during
normal use, possibly chat. The submitted TestFlight report became available
later: iOS 26.3.1, foreground, approximately 94 seconds after launch.
The raw report and symbolication output stay in ignored private runtime storage.

## Confirmed cause

Build 7's archive dSYM UUID matches the binary in the report. Symbolication
identifies this path:

- `FengShuiScreen`'s compass-heading `onChange` (`FengShui.swift:116`).
- `Engines.evaluate(_:_:as:)`, requesting a `String` for `fengshui.sector`.
- `Engines.evaluate(_:_:)`, reserializing the result at `Engines.swift:113`.
- Foundation `NSJSONSerialization`, raising an Objective-C exception.

The engine correctly returns a scalar direction such as `"N"`. The iOS bridge
assumed every successful result was an object or array and serialized with no
fragment option. A physical heading update therefore terminated the app;
`try?` cannot catch this Objective-C exception. The reported crash is in the
compass path, rather than the streamed-chat or scroll code. A simulator without
heading events did not naturally exercise that path.

## Fix and regression evidence

The bridge now uses `.fragmentsAllowed` when reserializing an engine result.
The engine output and deterministic rules are unchanged. Android's bridge
already preserves JSON primitives and does not use this Foundation path;
LazyOracle uses the TypeScript engine directly.

`tools/auspice-engine-swift-test.py` compiles the **production Swift bridge**
with the real JSCore engine bundle. Only the bundle URL is supplied by the CLI.
The first compass call crashes the unpatched bridge on Darwin and the iOS
simulator. The patched bridge passes:

- All eight compass sectors.
- 1,441 consecutive heading updates, including negative angles and wraparound.
- Array and object engine results, including exact almanac 宜/忌 values.
- A failed engine call remaining a catchable Swift error.

The simulator executable is an `IOSSIMULATOR` binary (minimum iOS 17), run in
the existing iOS 26.3 simulator. No additional simulator or GUI stack was
launched. This reproduces the serialization failure, without simulating a
physical magnetometer. The live production chat loop was also rerun successfully after the change.
TestFlight build 8 is the replacement build; its final
availability and artifact hash are recorded in `store/release.yaml`.


## Released replacement

At 19:02 HKT, Apple reports build **8** as `VALID` and `IN_BETA_TESTING`.
Its membership in the existing Auspice internal group was separately verified.
TestFlight notes ask testers to open Feng Shui, rotate the phone, return to
chat and send a question. Exact IPA identity/hash and delivery UUID are in
`store/artifacts/auspice-crashfix-2026-09-23.json`. No Auspice formal release
was submitted. The owner can now update build 7 to build 8 for physical-device
confirmation; the original build 7 archive/dSYM is retained for diagnostics.
