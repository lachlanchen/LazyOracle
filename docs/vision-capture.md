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
- Use explicit ambiguity bands around traditional shape cutoffs. A reading
  near a boundary lists candidates instead of alternating definite labels.
  These bands are engineering tolerances, not calibrated probabilities.
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
rather than manufacture certainty.

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
