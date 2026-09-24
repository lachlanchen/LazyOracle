# Native face and palm measurement — 2026-09-24

LazyOracle's SwiftUI and Compose screens now use `face.capture` and
`palm.capture`. The classic PWA single-frame endpoints remain compatible.
This measures visible proportions; it does not identify people or establish
personality, health, wealth, relationships or future events from appearance.

## What changed

- Collect eight suitable frames spanning at least 650 ms, from a transient
  buffer bounded to twelve frames / 1.8 seconds. A stopped camera, tracking
  loss, lens change, size change or timestamp gap clears that buffer. A read
  cannot use frames received more than half a second ago.
- Convert the separately normalized image axes to pixel units before ratios.
  Align the face/palm axis, normalize scale and take a coordinate median.
  Translation, camera distance, image aspect ratio and head roll therefore
  do not directly change the underlying proportions.
- Reject cropped, distant, turned, moving or incomplete captures. Ask for a
  relaxed mouth or an open, front-facing palm when those proportions would
  otherwise be distorted. The last frame must be suitable; old good frames
  cannot conceal a currently unsuitable pose.
- Face readings resolve one primary silhouette using the five fixed templates
  documented below; palm readings retain ambiguity bands near their cutoffs.
  These are engineering rules, not calibrated probabilities.
- Correct Android image rotation/mirroring and both preview overlays' aspect
  fill geometry. Serialize Android detector creation, video inference and
  teardown off the UI thread, following the existing iOS worker design.
- Manual palm-line edits preserve the captured geometry. Unanswered lines
  start as unknown. Skeletal joints no longer masquerade as measured palm
  surface/mount fullness in native results.
- Native narration receives limitations with the measurements and explains
  observable geometry and symbolic conventions without inventing personal
  characteristics. Previously saved readings remain accessible and invite a
  fresh measurement using the updated method.

No photograph or identity template is saved. The bounded buffer stays in
memory; saved readings contain derived results, as before. Scanning another
person never reuses a previous person's classification as a prior.

## Validation

- 129 shared tests pass, including aspect ratio/roll/mirror invariance, 100
  perturbed bursts, category boundaries, quality rejection, stale timestamps,
  single outlier resistance and unknown manual observations.
- Nine Android unit tests pass, including capture-window minimum duration,
  bounded memory, freshness and reset conditions. Debug and signed release
  builds succeed. An Intel emulator exposed an unavailable MediaPipe JNI
  library; detector initialisation now catches linkage failures and keeps the
  app usable with a camera-unavailable state. Android16 supersedes the
  unpublished Android15 upload. Six fallback navigation/resume visits passed.
  The ARM64 model path also passed four face/palm preview, lens-switch and
  resume visits on the emulator with ARM translation, without crashes.
  This is not a substitute for physical-device camera testing.
- The production iOS worker and JavaScriptCore/Codable bridge pass 24
  create/infer/stop cycles (288 frames) with small real pixel translations,
  rotations and scale changes. Twelve face bursts retain one candidate set,
  with height ratio 1.11–1.12; twelve palm bursts retain one shape, with width
  ratio 0.77–0.78. Main-actor heartbeat continues throughout. Swift capture
  buffer tests also pass.
- Native iOS camera screen checks pass in English and Simplified Chinese;
  captures remain disabled without fresh frames and unknown line choices
  are visible.
- A separate broad-smile fixture is correctly rejected by the relaxed-mouth
  check. These fixture checks do not establish population-wide accuracy.

Physical iPhone SE 3 testing under varied lighting, perspective and repeated
background/foreground use remains necessary. Landmarks can still vary with
expression, occlusion and camera perspective; the app must show uncertainty
without suggesting these numerical templates establish facts about a person.

## Sources and reproduction

MediaPipe reports x/y in image-width/image-height units; its hand landmarks
are joints, not traced palm lines or a measured skin surface:
[hand guide](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/ios).
Face tracking uses the official
[face landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker).

`npm test`, `npm run lint`, `npm run build`; Android
`:app:testLazyoracleDebugUnitTest` / `:app:assembleLazyoracleDebug`.
Generate the iOS real-model harness with `tools/auspice-camera-swift-test.py`;
run it on the dedicated simulator with the existing MediaPipe frameworks,
model directory, a neutral frontal face image and an open-palm image.
The neutral portrait fixture comes from
[Matplotlib's sample data](https://github.com/matplotlib/matplotlib/blob/main/lib/matplotlib/mpl-data/sample_data/grace_hopper.jpg);
models, photographs and raw detected landmarks stay in ignored runtime files.


## Native face interpretation update — iOS18 / Android17

The previous face reader exposed all boundary candidates (for example Fire /
Metal / Water) and told Tianji not to resolve them. This produced a mixed card
and a lengthy explanation of limitations. Native `face.capture` now calls the
same `face.resolve` rule used to upgrade saved version-2 measurements. Measured
ratios, courts and regions stay unchanged; one primary classification and its
symbolic theme travel together to both native cards and Tianji. Pre-version-2
snapshots still invite a new capture because their image geometry was different.
No photos or identity matching are involved.

The rule minimizes squared normalized distance from these templates, using
height/width, jaw/cheekbones and upper-width/cheekbones in that order. Inputs are
rounded to 0.05 bands for classification only; distance scales are 0.20, 0.12,
0.10. An exact tie follows the table order. This is a reproducible app convention,
not a claim that traditional texts specify numerical thresholds or that a label
cannot change near a template boundary.

| Form | Height / width | Jaw / cheekbones | Upper width / cheekbones |
| --- | ---: | ---: | ---: |
| Wood | 1.55 | 0.72 | 0.85 |
| Fire | 1.35 | 0.95 | 0.80 |
| Earth | 1.25 | 0.98 | 0.97 |
| Metal | 1.35 | 0.88 | 0.90 |
| Water | 1.15 | 0.80 | 0.89 |

The outline vocabulary is inspired by [太清神鑑, 卷4, 五形](https://zh.wikisource.org/zh-hans/太清神鑑_(四庫全書本)/卷4).
In particular its Fire description is narrower above and broader below, the
reverse of the older app heuristic. The source describes broader bodily forms;
these face-only templates are explicitly our approximation. General element
imagery comes from [尚書·洪範](https://zh.wikisource.org/zh-hans/尚書/洪範).
Neither source is used to attribute character, health, fortune or relationship
outcomes to a photographed person.

Both native apps show a localized short symbolic reflection before the detailed
measurements. Tianji receives the canonical form/theme and develops an optional
activity, without repeatedly reciting limitations. The interface, the reader's
language and explicit language requests remain conversational defaults. One
shared reading prompt now generates the Swift and Kotlin implementations.

Validation: 138 shared tests, including all five forms, Fire orientation,
saved-result migration, small perturbations and existing capture invariance.
Replaying twelve previously captured real-model portrait bursts resolves Water
in all twelve, retaining the exact measured height ratios of 1.11–1.12. This is
one fixture, not population-wide validation. The production Swift model and
JavaScriptCore bridge pass old-snapshot decoding, reclassification and encoding
round trips. Live Chinese, English, explicit-English and practical-follow-up
requests were reviewed against a synthetic saved mixed-type fixture. Physical
iPhone SE 3 repeatability remains pending.
