# Auspice stability and reading explanations — 2026-09-24

The owner reported Auspice 8 crashing after face analysis on iPhone SE 3,
palm reading freezing, tarot decoding failures, mixed interface languages,
and a home question being lost when opening an existing conversation.

## Changes

- The matching build 8 crash report places the failure in a MediaPipe graph
  callback while the main thread destroys the camera session. Model creation,
  video-mode inference and teardown now share one serial background worker.
  Leaving a screen, changing camera and backgrounding cannot race outstanding
  inference; stale updates and permission replies are discarded. Capture is
  bounded to VGA and ten processed frames per second.
- Tarot numbered ranks are JSON numbers, while ace/court ranks are strings.
  Swift now decodes and encodes both forms; Android preserves their JSON type.
  Empty questions remain valid.
- A home question sends once into existing chat history. Busy conversations
  cannot be replaced or deleted mid-response. The new-session action has a
  visible icon and label, and the home practice grid ends with Ask Tianji.
- Interface and reading labels follow the selected language, including tarot
  spreads, cards, classical judgements, calendar terms and tool status. The
  bundled catalogue covers eleven languages; engine facts stay unchanged.
- All nine native practices and all LazyOracle reading panels can request a
  backend explanation of the displayed result, with an optional follow-up.
  These requests have no engine tools: they cannot redraw or recast. Changing
  the result cancels/discards the old explanation. Replies primarily follow
  the selected language and explain unfamiliar terms briefly.
- Missing almanac dictionary entries are restored from the upstream table.
- Live tests found the relay's reasoning mode could spend the output budget
  before returning visible text. DeepSeek requests now explicitly disable it,
  preserving the selected Fast/Pro model and complete tool history. The
  provider's supported switch is documented at
  <https://api-docs.deepseek.com/guides/thinking_mode/>.

## Validation

- Web lint, TypeScript and production build; 108 tests pass, including all
  deterministic engines, chat scrolling, explanation request ownership, and
  catalogue coverage for all cards/hexagrams/books plus 400 almanac days.
- Actual Swift/JavaScriptCore bridge: all 78 tarot cards across 300 draws,
  blank/Chinese questions, 100 coin/yarrow casts, BaZi, astrology, almanac,
  books and Feng Shui model contracts. The production chat loop passes
  batched/repeated tools, empty-response recovery and its step limit.
- Real MediaPipe simulator frameworks: 24 alternating face/hand lifecycle
  cycles, 144 recorded frames, native feature decoding/encoding and complete
  cleanup, with a responsive main actor throughout.
- Native UI automation covers eleven language choices, repeated face/palm
  screen navigation, home sends into existing history, blank/Chinese tarot,
  live I Ching explanation, and remaining practice screens.
- Android build and JVM tests cover conversation continuation, busy-state
  protection, tool facts and empty-response recovery.
- Live backend explanation and relay HTTP tests preserve computed facts and
  visible answers. Raw reports and detailed runtime evidence remain private.

The simulator does not replace physical camera, orientation and memory testing
on the owner's iPhone SE 3. No physical-device retest is claimed.

## Published test releases

Source fixes are committed as `2808c60`, with the final explanation prompt and
shared release scheme in `7dde5ab`. Auspice **0.1.0 (9)** and LazyOracle
**1.0.0 (15)** are `VALID` and `IN_BETA_TESTING` in their internal TestFlight
groups. Play Console confirms Auspice **6** and LazyOracle **13** are available
to internal testers. Signed artifact hashes and validation results are in
[the release receipt](../../store/artifacts/stability-2026-09-24.json).

Both live web hosts serve `assets/index-lsWaNgfz.js`; its hash also matches both
signed LazyOracle mobile packages. Auspice's iOS and Android packages have
identical engine and language bundle hashes. A live production I Ching follow-up
preserved the original cast context and returned a backend answer at phone size.

LazyOracle's formal Apple build 12 and Play build 11 remain in review. Public
TestFlight retains build 14. No Auspice formal submission was made. The next
device check is face/palm use, camera switching, background/resume and repeated
navigation on the owner's iPhone SE 3 with Auspice 9.

For unsigned simulator UI tests, remove the project's test runner app before
`test-without-building`: CoreSimulator reused an older test runner despite a
new binary. Do not uninstall the product app or touch another project's device.
Use `AuspiceValidation`, the existing project-owned simulator, and
`-parallel-testing-enabled NO`. The source generator for the test target is
`tools/auspice-ui-test-project.rb`.
