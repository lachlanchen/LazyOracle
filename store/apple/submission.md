# App Store submission log

## 2026-09-22 — 1.0.0 (build 1) submitted, TestFlight open

- App record `LazyOracle: Tarot BaZi I Ching` (app id 6814663937, bundle `art.lazying.lazyoracle`, SKU `lazyoracle-1`) created in the App Store Connect web UI from the signed-in store browser; the API cannot create app records.
- Build 1 (marketing version 1.0.0, IPA SHA-256 `b0a8ead096ac58683e55661038b598dc72f2ef0364dca2bfb939f62838ac4d83`, delivery `6165cf04-c825-4b63-a6f0-176e4c43295c`) uploaded from the Mac with `release/upload1.sh`, processed `VALID`, export compliance set to no non-exempt encryption.
- TestFlight: internal group `LazyOracle Internal` (all builds), public group `LazyOracle Public Beta` with public link https://testflight.apple.com/join/JZJM3PFb, beta app review submitted (WAITING_FOR_REVIEW), beta description and contact set.
- App Store version `1.0.0` (`1e287ce1-6004-4964-85cd-4b6ae2445be5`): build 1 attached; description, keywords, promotional text, support and marketing URLs from `store/apple/metadata.md`; subtitle "Readings made on your phone"; privacy policy URL; categories Lifestyle / Entertainment; price tier US$0.99 (base territory USA, price point `…MTAwMTAifQ`); age rating all "none"; content rights: no third-party content; App Privacy published as "Data Not Collected"; App Review contact copied from the owner's L & N record; screenshots: six iPhone 6.7" and five iPad 12.9" from `store/screenshots/`.
- Review submission `dfc3a1fa-8043-49a9-a77b-281e8a58e1b0` submitted; version state **WAITING_FOR_REVIEW**, automatic release after approval.

- 2026-09-22 07:35: the account holder (lachlan.mia.chan@gmail.com) was added to `LazyOracle Internal` through the App Store Connect TestFlight page (internal groups take team members, not API beta-tester records; the API returned "Tester(s) cannot be assigned"), and as an external tester of `LazyOracle Public Beta`. Internal groups only notify people who are in the group, which is why no TestFlight mail had arrived; the external invite is sent once beta review approves build 1.

## 2026-09-23 — recovered review state and cloud-default test build

- Read-only API verification: App Store 1.0.0 still `WAITING_FOR_REVIEW`,
  attached to build 12. The takeover did not cancel, replace or resubmit it.
- Build 13 (1.0.0) validates and uploaded successfully, delivery
  `91c33549-0cb8-4d5b-833a-69ec9c242296`. It makes cloud narration the fresh-install
  default, removes local LLM startup/download paths, and keeps deterministic
  offline readings and existing explicit cloud opt-outs.
- `ios/App/ExportOptions.plist` is now retained in source so sync cannot remove
  the manual export configuration. The export reused the successful archive
  after restoring the plist and unlocking the existing release keychain.
- Final processing/group state and hashes are in `store/release.yaml` and
  `store/artifacts/takeover-2026-09-23.json`.


## 2026-09-23 — latest-message navigation, TestFlight build 14

- LazyOracle **14 (1.0.0)**, delivery `764e1235-3be3-4779-a4ea-7982e639bc00`,
  is `VALID` and `IN_BETA_TESTING` in the automatic internal group. The API
  rejects manual assignment to that automatic group; its build list confirms
  build 14 is already included.
- Build 14 is attached to the existing public beta group and submitted for
  beta review (`WAITING_FOR_REVIEW`). Existing public build 12 remains usable.
- Its chat opens at the latest message, offers a return button, and leaves
  the reading position alone while reviewing older messages.
- The formal App Store submission remains build 12, WAITING_FOR_REVIEW.
  Auspice's formal version still has no build attached and was not submitted.
- The owner subsequently reported an Auspice crash. That investigation is
  open; do not treat passing build/chat tests as proof that the crash is fixed.


## 2026-09-23 — crash diagnosis resolved, Auspice TestFlight build 8

The reported iPhone SE 3 crash was symbolicated to the Feng Shui compass's
scalar JSON result, reproduced with the production Swift bridge, and fixed.
Auspice build **8** is `VALID` and available in its internal TestFlight group;
see `store/artifacts/auspice-crashfix-2026-09-23.json`. No Auspice App Store
submission was made. The owner should update from build 7 to verify on device.

LazyOracle build 14's public beta has also reached `IN_BETA_TESTING`, verified
by API at 18:50 HKT; its earlier beta-review wait is complete.

## 2026-09-24 — stability and explanations, internal TestFlight

- Auspice **9 (0.1.0)** and LazyOracle **15 (1.0.0)** passed archive validation,
  upload and processing. Both are `VALID` / `IN_BETA_TESTING`; internal group
  membership was verified through the API.
- Auspice addresses the build-8 face/palm lifecycle failure, mixed tarot rank
  types, language labels, home sends and new-session layout. Both apps add
  backend explanations/follow-ups for their existing computed readings.
- LazyOracle public beta remains 14; formal build 12 is still
  `WAITING_FOR_REVIEW`. Auspice's formal version remains
  `PREPARE_FOR_SUBMISSION` with no build attached.
- Artifact hashes and delivery IDs: `store/artifacts/stability-2026-09-24.json`.
  Physical iPhone SE 3 camera verification is pending; simulator stress and
  native UI tests passed.
