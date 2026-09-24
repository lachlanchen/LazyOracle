# Google Play submission log

## 2026-09-21 — app created and configured

- App `LazyOracle: Tarot BaZi I Ching` (`art.lazying.lazyoracle`, Play app id 4975413590951100628) created as a **paid** app.
- Dashboard tasks completed: privacy policy (https://oracle.lazying.art/privacy.html), sign-in details (no restricted parts), ads (none), content rating (IARC, "All Other App Types", online/generated content Yes, everything else No), target audience (18 and over), data safety (no data collected or shared), government apps (no), financial features (none), health (none), category Lifestyle, contact email `echomind@lazying.art`, website https://oracle.lazying.art.
- Store listing (en-US): name, 80-character short description, full description from `store/google-play/metadata.md`, icon `store/assets/play-icon-512.png`, feature graphic `store/assets/feature-graphic-1024x500.png`, seven phone screenshots from `store/screenshots/play-phone-en/`.
- Pricing: USD 0.99 applied to all countries/regions (local prices converted by Play), tax category Digital app sales.
- Bundle 1 (1.0.0) SHA-256 `bf4bc97346de215ba75f9c040a554680dc857d2964fde3d31e22af7a79d01b09` uploaded to internal testing (see below for the result).

## 2026-09-21 — internal testing release 1 (1.0.0) published

- Internal track: release `1 (1.0.0)` published ("Available to internal testers"); the track shows the temporary app name until the first review completes. Play flagged one warning only (no native debug symbols in the bundle).
- Testers: email lists `EchoMind Internal Testers`, `L & N license testers`, `L & N phone testers`; join link https://play.google.com/apps/internaltest/4701677916092886102
- Production: release `1 (1.0.0)` promoted from internal, 172 countries/regions added, saved.
- Advertising ID declaration: does not use the advertising ID (Play's quick check required it).
- 2026-09-21 23:40: **Submit 10 changes for review → Send changes for review** confirmed; Publishing overview shows "Changes in review" (Play forwards them once its quick checks finish). This is the first, paid production submission; the internal track stays available to the tester lists meanwhile.

## 2026-09-23 — chat fixes published to internal testing

- LazyOracle **12 (1.0.0)** is available to internal testers (17:02 HKT).
  Chats open at the latest message; a return-to-bottom button appears while
  browsing earlier messages. Cloud narration is the fresh-install default.
- Auspice **5 (0.1.0)** is available to internal testers (17:00 HKT).
  Fixes the lost tool-results loop behind repeated “Already computed” rows
  and missing answers, and adds the same latest-message navigation.
- Both signed AABs passed verification. Exact hashes and UI-observed release
  states are in `store/artifacts/takeover-2026-09-23.json`.
- The owner explicitly authorized the existing CDP browser. Dedicated tabs
  were used in L & N's shared desktop; no other project's tabs were changed.
- Fresh Console verification corrected the historical internal-track claim:
  LazyOracle was on build **8**, Auspice on **4**, before these updates.
- LazyOracle production **11** remains under “Changes in review”, verified
  after publishing the internal update. No production change was made.
  Auspice remains internal-only; no formal release was submitted.

## 2026-09-24 — stability and explanations, internal testing

- Auspice **6 (0.1.0)** and LazyOracle **13 (1.0.0)** are available to internal
  testers, verified in Play Console after publication. Both signed bundles
  passed verification, with no loss of supported devices.
- Auspice includes tarot rank handling, home-to-chat delivery, a visible new
  conversation action, and eleven-language reading labels. Both apps include
  plain-language backend explanations and follow-up questions for the current
  computed result.
- LazyOracle production **11** remains under “Changes in review”, verified
  after this internal release. No Auspice production submission was made.
- Artifact hashes and validation: `store/artifacts/stability-2026-09-24.json`.
