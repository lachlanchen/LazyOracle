# LazyOracle and Auspice — recovered decisions and takeover

Updated 2026-09-23. This is a curated recap, not a copy of private chat logs.
Read with `docs/brief.md`, `native/README.md`, and the Auspice store handoff.
The original session was named L-And-N but forked into this repository on
2026-09-21. Its last task stopped during the cloud-default change. Codex
preserved the eight-file working diff before continuing it.

## Latest instructions take precedence

The owner's last request was to set local LLM work aside, mainly use DeepSeek
Flash, preserve the good live hand/face measurements, fix both products, and
push their latest versions to TestFlight and Play internal testing. DeepSeek
should work on first launch without finding a setup switch. Only LazyOracle
has a formal release in review. Wait for that review; do not submit Auspice to
production. Whether Auspice eventually replaces LazyOracle's implementation
or remains a separate product is undecided.

The downloaded Qwen experiment and Apple Foundation Models are deferred.
This does **not** remove the small MediaPipe landmark models: those measure
hands/faces locally and are part of the features the owner liked.

## Product map

| | LazyOracle / Tianji | Auspice / 宜时 |
| --- | --- | --- |
| Identity | `art.lazying.lazyoracle` | `art.lazying.auspice` |
| UI | React PWA plus Capacitor iOS/Android | SwiftUI iOS, Compose Android, no web view |
| Engine | Tested TypeScript engines | The same compiled engine bundle through JavaScriptCore / Android JavaScriptEngine |
| Languages present | English and Simplified Chinese | Eleven, selected in Settings, with system-language matching |
| Reading service | Hosted PWA uses its own relay; packaged apps use Huanayun | Huanayun `oracle-fast.lazying.art/v1` |
| Price decision | Paid mobile app, USD 0.99 equivalent; free PWA | Paid mobile app, USD 0.99 equivalent |
| Release boundary | Latest tests; existing formal review continues | Testing only |

Auspice's eleven languages are English, Simplified Chinese, Traditional
Chinese, Japanese, Korean, Vietnamese, Spanish, French, German, Russian and
Arabic. The common catalogue generates Swift/Kotlin strings. Almanac activity
terms have 113 multilingual glosses. Arabic has RTL layout.

## Recap of the request history

1. **Build the full product.** Beautiful first, simple second, complete third;
   celestial theme, gold accents, legible text, attractive icon and meaningful
   animated visuals. No reduced mobile edition. Original practices: Tarot,
   BaZi, I Ching, astrology, feng shui, palmistry and Book of Answers. Face
   reading and a daily almanac were subsequently added.
2. **Keep the rules authoritative.** Draws, charts, dates and measurements come
   from deterministic tested code. The LLM narrates them; invented cards,
   pillars, hexagrams or reversed 宜/忌 are bugs. Classical method references
   and keyed knowledge provide grounding. Seeded random operations are
   reproducible for the same inputs; new draws can use new seeds.
3. **Make the chat an agent.** Actually call the engines, including real tarot
   draws and hexagram casts. Preserve the last conversation by default, let
   the owner start/delete conversations, retain history, render older messages
   lazily, and compact context rather than impose a small message cap. Add an
   ask bar throughout the app. Native chat should open the palm/face camera
   when the question calls for it, and narrate measured results afterwards.
4. **Repair phone layout.** Repeated complaints concerned sideways scrolling,
   clipped right edges, chat panel overflow, and iOS zoom on composer focus.
   Historical fixes include a 16 px input floor, shrinking/wrapping flex items,
   keyboard-aware spacing, minimum touch/text sizes and a narrow-screen audit.
   The clear button belongs to the left of the send row; the composer should
   remain at the bottom without a second whole-page scroll. Bar animations
   were moved from width to transforms. These need continuing regression QA.
5. **Test actual devices.** MIX 2S locally, Mi 10 Pro on lazy-7090, and the iPad
   attached to the iMac/7050 route. Coordinate shared device use. The owner
   specifically preferred testing the installed TestFlight app over Safari.
   Historical Android sideload attempts hit MIUI's user restriction; browser
   checks were performed instead. They are not evidence of a new native
   build passing on those phones.
6. **Try usable local models.** Brand the choices Tianji Fast/Pro (later Mini),
   hide vendor names and custom endpoint/token fields, and make model download
   and cache recognition reliable. Phone white-screen/reload failures led to
   CPU inference, Safari compatibility hosting, cache recognition, memory
   refusal, host racing and a wake lock. The SE 3 still could not reliably run
   the larger web runtime; switching to cloud after a clear refusal was
   accepted. This work is now superseded by the cloud-first decision.
7. **Provide a working cloud reader.** Initial missing providers and overly
   strict relay message validation caused failures, especially continued
   conversations. History records fixes for assistant/tool turns, longer
   histories, DeepSeek replay handling, native tool calls and streaming.
   Aliyun hosts `oracle.lazying.art`; Huanayun hosts the faster mirror/relay.
   DeepSeek Flash is now the primary reader, with provider secrets on servers.
8. **Add a reason to open daily.** The almanac uses real traditional tables,
   suitable/avoid lists, day officers, spirits, clash, taboo and double-hour
   data. “Can I do this today?” must cite the table or state its absence,
   rather than invent a favourable day.
9. **Build genuinely native apps.** The owner accepted the existing shell but
   requested complete native implementations with shared rules, not another
   wrapped website. Auspice was accepted as the distinct brand, priced at
   USD 0.99, using oracle-fast and distributed to tests only. The earlier
   incremental replacement plan is historical, not the current product split.
10. **Keep the successful camera experience.** The owner liked live hand and
    face structure detection, requested front/back camera switching for other
    people, and keyboard dismissal while scrolling. Those changes exist in
    the native implementation; new build testing still needs device evidence.
11. **Clean up languages.** Early LazyOracle scope explicitly dropped
    Traditional Chinese/Cantonese and stayed en/zh-Hans. Later Auspice requests
    expanded to all eleven repository languages, one interface language at a
    time with a dropdown, then understandable almanac glosses. Do not mistake
    the eleven-language README for complete LazyOracle UI translation.
12. **Measure local narration quality.** The Qwen 1.7B trial first failed
    routing because its thinking consumed the output budget. Deterministic
    routing then reached 9/9, but narration inverted 宜 and 忌 and invented
    facts for a book page. The downloaded reader was withdrawn. Auspice iOS
    build 4 contains that retired experiment and must not be offered to testers.
    Apple's on-device reader was built but not verified on eligible hardware;
    the owner has no Apple Intelligence device and asked to set it aside too.
13. **Keep test distribution current.** Multiple TestFlight problems were
    separate: missing export-compliance declarations, owner/group membership,
    beta review holding back a public build, and uploaded builds not attached
    to a manual group. Upload success alone is not tester availability.
14. **Publishing and identity.** Reuse L & N's accounts, signing, Mac and store
    procedures. Mobile apps default to USD 0.99/local equivalents. Preserve
    pending review work. README needs eleven-language navigation, LazyingArt
    banner, screenshots, support/donation panel and repository metadata; most
    of this exists. Never commit credentials, browser profiles or private logs.

## Takeover changes and validation

- Finished the interrupted cloud-default patch. Removed production entry
  points for local LLM startup, local-first narration and chat downloads;
  removed Auspice's remaining Apple model choice. Existing explicit cloud
  opt-outs remain off. Retired custom endpoints/tokens and downloaded tiers
  no longer route production requests. Fresh installs use Tianji Fast.
- Corrected LazyOracle's visible English/Chinese copy and privacy page to
  disclose question, relevant conversation and computed facts, including
  birth details when present. Photos remain local. Deterministic individual
  readings still work when cloud is off/unavailable; chat needs the service.
- Hosted PWAs use their own `/v1` route, avoiding a cross-origin request blocked
  by the existing CSP. Native shells use oracle-fast directly.
- Preserved shared landmark weights when rebuilding the engine bundle, and
  fixed iOS sync exclusions to preserve the Mac's frameworks, build helper
  and release artifacts.
- Lint, 97 tests and the production build passed. New tests cover first-launch
  cloud routing, legacy settings, explicit opt-out, and service failure.
- Live sampled agent checks called `today` and `almanac_day` for contract and
  travel questions. Both verdicts matched the engine's avoid verdict for
  2026-09-23. This is limited evidence, not proof of every tool/language or
  camera action; the harness simulates camera results.

## Distribution checkpoint at takeover

Read-only App Store Connect probes on 2026-09-23 confirmed:

- LazyOracle 1.0.0: `WAITING_FOR_REVIEW`; latest uploaded build 12, `VALID`.
- Auspice 0.1.0: build 5 uploaded and `VALID`; its internal group does not
  automatically receive every build. App Store version remains
  `PREPARE_FOR_SUBMISSION`, not submitted for formal review.
- Historical Play state: LazyOracle internal/production build 11 and Auspice
  internal build 4. These are session records, not fresh Console observations.

The distribution result below is updated after new builds are verified.

## Remaining work and boundaries

- Finish latest test-track distribution and verify actual group/track access.
- Recheck installed builds on real devices: first cloud reply, continued chat,
  camera switching and camera-from-chat, keyboard dismissal, narrow layouts.
- Audit complete native/web feature parity. Web chat currently has fewer
  camera tools and only two UI languages; the native camera is live while the
  web practices use captured photos. Do not call parity proven.
- Auspice store screenshots/descriptions remain unfinished in the recovered
  record. Prepare them for testing, but do not trigger a formal submission.
- Retired local LLM training, dataset license/quality audit and LoRA work were
  planned, not completed. No `data/curated/SOURCES.md` exists. They are deferred
  with local inference, not a dependency for current cloud test releases.
- Widgets, daily notifications and watch surfaces are future native-plan work,
  not completed features. The earlier separate “Pro” proposal is superseded
  by Auspice's present testing scope and the owner's pending product decision.
- Review provider-key ownership through the existing private handoff before
  changing credentials; do not expose or independently rotate shared secrets.

## Ownership and runtime

Codex now owns LazyOracle product code and Auspice code in this repository.
The L & N publishing partner owns its own repo and the shared store desktop;
Bunko/other apps own their own store tabs. Never choose an arbitrary Play tab.
No new desktop was started for this takeover. An obsolete project-owned shell
waiting on an already-finished task was stopped. Private evidence, original
session location, inherited diff and current runtime notes live under ignored
`.runtime/takeover/`. No raw history is included here.
