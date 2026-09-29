# Native differentiation — September 29, 2026

The owner asked for distinct native LazyOracle features after Apple's similarity
rejection. The formal rejection is 4.3(b), dated September 28, against classic
1.0.0 build 12. Native TestFlight18 was not the reviewed formal build.

Source is pushed: `864eac6` adds Change Atlas and the reflection notebook;
`362f187` follows the reading direction in Arabic comparisons. The pre-change
source is tagged `rollback/native-before-study-2026-09-29`.

The new home leads with deliberate I Ching construction and a local notebook.
All nine practices can save their computed native result, with separate
reflection, action and observation fields. Calculation, saving and review work
offline. Details and limits: [native study](../native-study.md).

Android **1.0.0 (19)** is verified available to internal testers. iOS **1.0.0
(20)** is verified in internal and public TestFlight, with beta review APPROVED.
The [public TestFlight link](https://testflight.apple.com/join/JZJM3PFb) is unchanged. Earlier candidates Android18 and iOS19 were
superseded before distribution after the final RTL visual check. Previous
public/internal builds iOS18 and Android17 remain the rollback baselines.

The owner also authorized the new LazyTunnel Mac mini. Its Xcode27 toolchain is
installed and first-launch ready. The final native Mac ARM64 build and ad-hoc
signature verification pass. Intel Mac compilation also passes. Connection,
workspace and logs stay in the private runtime handoff; no credentials or signing
configuration were copied to the mini. No new Mac store release was submitted.

Validation: 144 shared tests; 10 Android tests; all 4,096 Atlas combinations;
native Swift persistence contracts; iPhone and iPad save/edit/relaunch workflows;
Chinese and Arabic UI; offline Android save/relaunch, deduplication and corrupted
archive protection. Source, lint, type checks and PWA production build pass.
Physical cameras were not retested in this feature update.

The owner subsequently authorized formal resubmission. iOS **1.0.0 (20)** is now
**WAITING_FOR_REVIEW**, submitted September 29 at 08:01 HKT with automatic release
after approval. The 4.3(b) reply was sent; both localized listings and sixteen
current native screenshots were verified. See the [formal handoff](2026-09-29-apple-formal.md).
Use screenshots from the new native candidate when updating the formal listing;
the old classic screenshots and on-device-LLM marketing copy are inappropriate.
Unique implementation details do not establish that Apple will approve 4.3(b).
Classic Auspice/PWA, unrelated app releases and optional future unified login
remain outside this feature change.

Receipt: [native-study-2026-09-29.json](../../store/artifacts/native-study-2026-09-29.json).
Raw evidence and screenshots are private in `.runtime/2026-09-29-distinctive/`.
