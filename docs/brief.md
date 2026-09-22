# LazyOracle product brief

Written 2026-09-21 from the owner's request (chat with the L & N session). Treat this as the contract; refine it in place as decisions are made and record the date of each change.

## 1. What we are building

A fortune-telling app that is **beautiful first, simple second, complete third**: one screen per practice, no clutter, every common practice included.

| Practice | Deterministic engine (code, tested) | What the LLM adds |
| --- | --- | --- |
| Tarot 塔罗 | 78-card deck, upright/reversed, spreads (one card, three card, Celtic cross), seeded RNG | narrative reading that cites each card's position meaning |
| BaZi 四柱八字 | Gregorian → lunar/solar-term conversion, true solar time by longitude, four pillars, hidden stems, ten gods, five-element balance, luck cycles (大运), current year (流年) | interpretation grounded in classical rules; never recomputes pillars |
| I Ching 周易 | three-coin and yarrow-stalk casting, 64 hexagrams, changing lines, resulting hexagram, King Wen text + 象/彖 | answer to the question in plain language, quoting the lines that moved |
| Astrology 星座 | natal chart from time + place (astronomy-engine or Swiss Ephemeris port): planets, houses (Placidus/Whole sign), aspects; daily transit horoscope | chart reading, transit-of-the-day note |
| Feng Shui 风水 | compass from device magnetometer, Bagua overlay on a photo or floor sketch, Eight Mansions (八宅) by birth year, optional Flying Stars (玄空) | room-by-room suggestions from the computed sectors |
| Palmistry 手相 | camera capture, on-device hand landmarks (MediaPipe Hands or Vision framework), heuristic line extraction (heart, head, life, fate) with confidence | reading phrased as entertainment, tied to the detected features |
| Book of Answers 答案之书 | structured editions already built for Local Knowledge Terminal (`../LocalKnowledgeTerminal`, `lkt prepare` builds `var/book-of-answers.sqlite3` and `var/book-of-questions.sqlite3` from the sources in `../Books/library`; a copy also sits in the owner's Nutstore) | one-line answer, optional expansion |

Not in v1: Zi Wei Dou Shu 紫微斗数 (add after BaZi is solid), numerology, dream dictionary.

## 2. Architecture

```
question / birth data / photo
        ↓
deterministic engine (TypeScript, unit-tested, runs everywhere)
        ↓ structured JSON
visualization (natal wheel, four-pillar grid, hexagram, spread, bagua)
        ↓ same JSON as the prompt context
local LLM on the phone  ──fallback──▶  workstation LocalLLM via LazyEdge  ──optional──▶  cloud API
        ↓
narrative reading, cited to the structured facts
```

- **Shell:** React + TypeScript + Vite PWA inside Capacitor for Android and iOS, exactly like `../L-And-N` (copy its `tools/`, `store/` layout, i18n pattern, Android flavors, iOS project conventions). Interface languages: zh-Hans, zh-Hant, yue, en (ja later).
- **Engines** live in `src/engines/<practice>/` with golden tests against known charts (e.g. published BaZi examples, Swiss Ephemeris reference positions). This is where errors are prevented; the model never calculates.
- **On-device LLM:** llama.cpp. iOS: llama.cpp Swift package with Metal; Android: llama.cpp JNI with Vulkan/CPU (ExecuTorch or MediaPipe LLM Inference are acceptable alternatives if faster on the MIX 2S / Mi 10 Pro test phones). Default model Qwen3-4B Q4_K_M (~2.5 GB) with Qwen3-1.7B Q4 as the small option; the app downloads the model on first use from our own host (`lazying.art` CDN path, mirrored from Hugging Face) and shows size and speed before downloading. Target: first token under 2 s and >8 tok/s on a 2020 flagship.
- **Domain:** `oracle.lazying.art` → 179.236.105.35 (Huanayun, the LazyEdge/LazyTunnel public edge), set by the owner on 2026-09-21.
- **Fallback:** the owner's workstation (two RTX 4090 D) runs `../LocalLLM`; `../LazyEdge` publishes it through a reviewed HTTPS route. The app accepts a LazyEdge client token in settings; when present it can use the 8B/30B model for long readings. Off by default; the phone never uploads birth data unless this is on.
- **Knowledge (RAG):** a small curated corpus per practice (card meanings, hexagram texts, ten-god rules, planet/house/sign meanings), shipped as JSON in the app; retrieval by key, not by embedding, so it is deterministic too.

## 3. Model work (uses the workstation GPUs)

1. Download and benchmark: `Qwen/Qwen3-4B` and `Qwen/Qwen3-1.7B` (GGUF Q4_K_M and Q5_K_M), `tellang/yeji-4b-instruct-v9` (Korean fortune-telling fine-tune, benchmark only). Downloads go to `models/` (git-ignored); the L & N session started them on 2026-09-21, see `models/DOWNLOADS.md`.
2. Data: `tellang/yeji-meta` (八字 21,798 / 西方占星 13,120 / Tarot 5,847 / 紫微 2,939), `tellang/yeji-iching`, `jakeveo05/tcm-divination-training` (~215k rows, zh/en/vi), `jakeveo05/divination-combined` (~41k). First job: check each license, language quality, AI-synthesis share and duplication; write the verdict into `data/curated/SOURCES.md`. Only keep rows whose license allows an app.
3. Training: LoRA on Qwen3-4B (and 1.7B) with the curated rows reformatted to our JSON-context → reading format, so the model learns to narrate from engine output rather than from raw birth data. Evaluate on a held-out set and on 50 hand-checked cases per practice. Export GGUF, quantize, measure on both test phones.

## 4. Design

- Dark celestial theme with warm gold accents, generous whitespace, one focal illustration per practice, subtle motion (card flip, hexagram lines drawing in, chart wheel rotating into place). Use a distinctive display face for headings and a highly legible CJK body face.
- Every reading screen: the visual (chart/spread/hexagram) on top, the structured facts as chips, the narrative below, a share card at the end.
- Onboarding asks for birth data once, stores it on device only, and explains that nothing is uploaded.
- Copy is warm and non-deterministic ("this suggests", "a good season for"); a permanent entertainment disclaimer sits in Settings and in the store listing.

## 5. Publishing and price

- Paid app at US$0.99 (Apple tier 1: CNY 8, HKD 8) on both stores. On Google Play the app must be created as **paid from the first upload** because Play cannot convert a free app to paid later (the L & N lesson). PWA stays free.
- Store guidance to respect: Apple treats fortune-telling as entertainment (label it so; avoid medical/financial promises), Google Play's "Inappropriate content" and "Misleading claims" policies. No real-money predictions.
- Reuse the L & N publishing pipeline: store docs layout (`store/release.yaml`, `store/apple/`, `store/google-play/`, `store/operator-handoff.md`), the CDP/noVNC store browser stack, the App Store Connect API helper, the Mac build host, Google Payments merchant profile (already verified; W-8BEN filed; 15% service tier). The L & N session is the publishing partner: ask it through a file under `docs/handoffs/` when a store action is needed, or do it directly using the same procedures.
- Test devices: MIX 2S (local USB) and Mi 10 Pro (over LazyTunnel to lazy-7090).

## 6. Milestones

1. Repo scaffold from L & N shell, theme, i18n, one practice end to end (Tarot: engine, spread visual, local LLM reading) on PWA. Screenshots for review.
2. BaZi and I Ching engines with golden tests and visuals.
3. On-device LLM in Android and iOS shells; model download flow; LazyEdge fallback.
4. Astrology, Feng Shui, Palmistry, Book of Answers.
5. Store assets, listings in four languages, TestFlight and Play internal, then paid production release.

## 7. Open questions for the owner

- Display name: "LazyOracle" is the repo; the store name can be shorter (proposed: **Tianji · 天机**, "heaven's secret", with LazyOracle as the developer line). Confirm or pick another.
- Whether palmistry needs a camera at all in v1 or can start from a guided sketch.

## 8. Progress log

- **2026-09-21, milestone 1 done (commit series up to this note).** Shell scaffolded from L & N (Vite + React 19 + TypeScript, vite-plugin-pwa, Capacitor config `art.lazying.lazyoracle`, same lint/test/build gates). Celestial theme: night gradient with a drifting starfield, gold accents, Cinzel for headings, Cormorant Garamond for reading text (Latin subsets bundled, OFL), system CJK for Chinese. Tarot end to end on the PWA: 78-card deck with English and Chinese keywords (`src/engines/tarot/deck.ts`), three spreads, mulberry32 seeded shuffle so every draw is reproducible from its seed (shown on the reading panel), flip-to-reveal cards, structured card facts, then a reading. Readings come from an OpenAI-compatible endpoint when the user enables one in Settings (tested with the workstation's Ollama `qwen3:4b-q4_K_M`, streaming, `<think>` blocks hidden) and otherwise from a deterministic composition of the card meanings, which is also the baseline the model must agree with. Interface copy in en, zh-Hans, zh-Hant and yue; engine data is written once in Simplified and converted for the Traditional and Cantonese interfaces with a generated character table (`tools/gen-hant.py` → `src/lib/hant.ts`). Screenshots in `docs/screenshots/`.
- **Observed:** Qwen3-4B narrates well in English and Simplified Chinese; in Traditional Chinese it mixes scripts and occasionally leaks an English token (`-move`). That is the first target for the LoRA in section 3, together with a "Traditional characters only" instruction.
- **Next:** milestone 2, BaZi and I Ching engines with golden tests and visuals.
- **2026-09-21, app complete and first submissions.** All seven practices work on the PWA and in the Capacitor shells; interface is English and Simplified Chinese (Traditional Chinese and Cantonese dropped at the owner's request). On-device model: wllama (llama.cpp WebAssembly) inside the web view, Qwen3 0.6B Q8 or 1.7B Q4 downloaded from Hugging Face (hf-mirror fallback), chosen in Settings; endpoint and offline composition remain. Google Play: app created as paid (USD 0.99), every dashboard task done, listing with icon/feature graphic/screenshots, internal testing release 1 published to the tester lists, production release 1 sent for review. Apple: bundle id, profile and signed IPA ready; the App Store Connect app record still needs the owner's sign-in. Web: release staged on the Aliyun host; DNS for oracle.lazying.art must move to 47.84.190.118 before HTTPS can be issued.
- **2026-09-22, published everywhere.** https://oracle.lazying.art is live on the Aliyun host with a Let's Encrypt certificate (the Huanayun edge blocks foreign ACME validators, so DNS was moved). Google Play: internal release 1 published, production 1 in review (paid). Apple: app record created in the signed-in browser, build 1 in TestFlight (internal group with the owner; public beta link pending beta review), App Store 1.0.0 submitted and waiting for review. Records: `store/release.yaml`, `store/apple/submission.md`, `store/google-play/submission.md`.

### 2026-09-22 — model naming, Tianji Cloud relay, local-first release
- On-device models are shown as 天机快速版 / Tianji Fast (Qwen3 0.6B Q8) and 天机专业版 / Tianji Pro (Qwen3 1.7B Q4); the Qwen names are not user-facing.
- The custom endpoint option (URL / token) is gone. Settings has one switch, Tianji Cloud (天机云端), off by default. Reading order: downloaded Tianji model → Tianji Cloud if switched on → deterministic composition.
- Tianji Cloud is `ops/oracle_gateway.py` behind `https://oracle.lazying.art/v1` (Caddy route in `store/lazyoracle.caddy`, systemd unit `ops/oracle-gateway.service`, secrets in `/etc/lazyoracle/gateway.env` on the Aliyun host). Providers are tried in order: DeepSeek (`DEEPSEEK_API_KEY`), then a LazyEdge upstream. With no provider configured it answers 503 and the app falls back to the offline composition.
- The app asks the relay for a tier, not a vendor model: `tianji-fast` or `tianji-pro`, matching the tier the user chose on the device. Each provider maps the tier to one of its own models (`DEEPSEEK_MODEL_FAST` / `DEEPSEEK_MODEL_PRO`), so a tier keeps its name wherever the reading is written.
- Owner's plan: the first store release is the fully local version, which is what is in review now. Later, Tianji Fast = DeepSeek V4.1 Flash and Tianji Pro = DeepSeek V4.1 Pro through the relay, enabled by filling in `/etc/lazyoracle/gateway.env` and turning the switch on by default in a later app version.
- DeepSeek's current Flash model (`deepseek-flash`) does accept images; the Pro model (`deepseek-v4-pro`) does not. The relay routes any request carrying a photo to the vision model whatever tier was asked for. The shipping app still sends no photo: palmistry runs on the device with MediaPipe Hand Landmarker, and the model narrates the derived features only. A real photo reading is a Pro feature and an explicit opt-in.
- The local-endpoint allowance (`http://127.0.0.1:*`, `http://localhost:*`) is gone from the site's `connect-src`; nothing in the app talks to a local server any more.
- The changes reach the test tracks only. Play internal testing release "2 (1.0.0) local-only default" is published to the tester lists. On iOS build 2 was abandoned mid-upload because it predated the Safari fix; build 3 (1.0.0) uploaded successfully, delivery 9871a608-d8a9-4f06-a67d-8ed1ed01a270, and the internal group takes every build automatically. The reviews already running are untouched: App Store 1.0.0 with build 1 WAITING_FOR_REVIEW, TestFlight external WAITING_FOR_BETA_REVIEW on build 1, Play production release 1 in review in 172 countries.
- A Pro edition with DeepSeek behind the tiers is planned in `docs/plans/pro-version.md`: a separate paid app built from this repo with a build flag, cloud on by default, and entitlement plus quotas added to the relay before it ships.
- iOS fix found while answering a question about vision models: Safari has neither WebAssembly JSPI nor Memory64, so wllama falls back to a compatibility build that it fetches from a public CDN. Our content security policy blocks that, so on-device models would never have worked on iPhone. The compatibility build is now served from our own origin (`public/wllama/compat/`, set through `setCompat`), and `tools/safari-path-test.py` simulates Safari in Chromium to prove it: the build loads from our origin, no CDN request is made, and the model reaches Ready.
- 面相 (face reading) added as the eighth practice: MediaPipe Face Landmarker (3.8 MB, bundled) measures 三停, the five-eye proportion, symmetry, the elemental face type and eight of the 十二宫, all on the device, and the model narrates only those measurements. Verified end to end in a browser against a test face.
- 手相 deepened: the four fingers against the middle finger, the thumb's opening angle, how widely the fingers are held, the eight palaces of the palm from landmark depth, and a fate-line question.
- 周易 deepened: 互卦, 错卦 and 综卦, plus the classical rule (Zhu Xi's) for which line or judgement answers, shown on screen and given to the model.
- New "问天机 / Ask Tianji" chat screen, and a card that offers Tianji Fast, Tianji Pro or Tianji Cloud when nothing is set up yet.
- On-device models are now Unsloth dynamic quantisations (UD-Q4_K_XL): better quality at the same size, 405 MB and 1135 MB.
- The chat is agentic: `src/lib/agent.ts` exposes every engine as a tool the model can call through a small text protocol that works with both the on-device model and the cloud, so it draws real cards and casts real hexagrams instead of describing what the reader could do. Proved end to end by `tools/agent-chat-test.py`, which runs the app against a stub reading service and checks that the draw reached the model.
- An ask bar sits at the bottom of every screen; typing there opens the chat with that question. Conversations are saved on the device (up to 20) and reachable from a history list.
- Model download hardened after the owner hit an infinite reload: the mirror is no longer retried once the file is downloaded (that was re-downloading a gigabyte and restarting the progress bar), free space is checked before starting, the crash marker is written only at the risky step, a crashed model's cached file is purged before the next attempt, and the service worker now claims clients immediately so a fix reaches installed apps on the next launch.
- README rewritten with the eleven-language header, a new banner (`docs/images/banner.svg`), screenshots, a donation panel and an about section; repository description, homepage and twenty topics set on GitHub; MIT LICENSE and CITATION.cff added.
- Root cause of the download loop, found by reading wllama's source: it offloads every layer to the GPU by default (`n_gpu_layers` 99999). On a phone the GPU process refuses several hundred megabytes and the web view is killed, which looks like a white screen and a reload, and the warm-up then repeats it. On-device models now run on the processor.
- Why TestFlight kept showing build 1: every iOS build after it was uploaded without an export-compliance answer, and Apple holds such a build back from testers entirely. Build 6 has now been answered through the API (`usesNonExemptEncryption: false`) and is IN_BETA_TESTING for the internal group, with auto-notify on; builds 2 and 3 were expired as superseded. The public link still serves build 1 because build 1 is queued for beta review and Apple allows only one build of a train in review at a time; the API refuses to withdraw it (403), so build 6 goes to the public group once that review finishes. Build 6 is already attached to the public group. `ITSAppUsesNonExemptEncryption` is now declared in `ios/App/App/Info.plist`, so future builds reach testers as soon as they finish processing.
- Test tracks carry all of it: Play internal release "5 (1.0.0) face reading, chat, download fix" is live to the tester lists, and iOS build 6 was uploaded for TestFlight. Builds 2 to 5 were superseded before distribution.
- Verified in the iOS Simulator (iPhone 17, iOS 26, WebKit reporting as iOS 18.7) with the new `/model-check.html` page: Safari has neither JSPI nor Memory64, so the self-hosted compatibility build is used; Tianji Fast downloaded (405 MB), loaded at 171.7 s and wrote a sentence at 191.0 s, with no reload and no crash. Opening the app afterwards showed "Already on this device · Use" rather than offering the download again, which was the owner's second complaint.
- A downloaded model is now recognised: `downloadedModelIds()` asks the runtime which files are cached and valid, Settings and the prompt card say "Already on this device" and offer "Use", and the cache is no longer purged after a crash, because re-downloading a gigabyte is the wrong cure for a phone running out of memory.
- Layout: nothing can widen the page any more. Long words, links and identifiers wrap, flex rows may shrink and wrap, figures are capped at full width, the page reserves room for the ask bar and scrolls content clear of it. `tools/layout-audit.py` walks every screen with real content at 320, 360 and 390 pixels and fails on any sideways scroll.
- iOS build 7 uploaded (delivery 1f0ed8e9-f3c9-47a0-88d0-dd1290e087fd) with the cached-model and layout fixes, and Play internal release "6 (1.0.0) download fix" is published. A Play release name is limited to 50 characters, which silently blocks the Next button; keep it short.
- Evidence from the simulator is kept in `docs/screenshots/ios-model-check.png` (the device check finishing on iOS) and `docs/screenshots/ios-model-cached.png` (the app offering "Use" for a model already on the device).
- Tianji Cloud now actually answers. It had no provider at all, so every cloud reading returned 503; the relay is now pointed at the owner's own workstation through the LazyEdge compatibility listener already present on the Aliyun host (`http://127.0.0.1:18080/v1/chat/completions`, bearer token from `~/.config/lazyedge/secrets/llm-lazying-art-client-token`, never printed or committed). Tiers map to `qwen3:4b-q4_K_M` (fast, 5.7 s end to end), `qwen3:30b-a3b-instruct-2507-q4_K_M` (pro, 64 s cold while the weights load, 3.1 s warm) and `qwen3-vl:8b-instruct-q4_K_M` for anything carrying a photo. DeepSeek stays unset and takes over the moment a key is added.
- That route is shared with EchoMind and allows two concurrent requests, so the other sessions were told.
- The iPhone SE 3 could not run Tianji Fast: a four-gigabyte phone gives its web view a fraction of that memory, and loading needs the file several times over, because Safari on iOS cannot transfer a buffer to a worker and clones it instead. Two changes follow. The app now reserves the memory before loading and, if the reservation fails, says so plainly instead of letting the system kill the web view. And a third tier, 天机轻量版 / Tianji Mini (Qwen3 0.6B UD-Q2_K_XL, 302 MB, 1024-token context), gives small phones something that fits.
- The service worker was answering every navigation with the app shell, which hid `/privacy.html`, `/support.html`, the new `/model-check.html` and anything under `/downloads/`. A navigation denylist fixes it; found while trying to open the device check on an iPhone, where the app kept appearing instead.
- The device check now measures the largest block the browser will reserve, which is the real ceiling for an on-device model and is far below a phone's RAM. The simulator reports 2688 MB; a four-gigabyte iPhone will report much less, and that number decides which tier can run.
- TestFlight is current at last: build 1's beta review came back approved, which unblocked the train, and build 8 went to the public group and straight to IN_BETA_TESTING without a further wait. The public link at https://testflight.apple.com/join/JZJM3PFb now serves build 8; the internal group has 6, 7 and 8. Play internal testing is on release 7.
- Systematic layout pass, driven by `tools/ui-audit.py`, which walks every screen at 320, 360, 390 and 430 pixels with real content (a drawn spread, a computed chart, a chat reply containing a long link, a long identifier and unbroken Chinese) and reports five kinds of fault: the page scrolling sideways, any element scrolling sideways inside itself, anything crossing the viewport edge, tap targets under 40 pixels and text under 12 pixels. It found 196 faults and now finds none.
- The chat's sideways scroll came from the log itself: a box with `overflow-y: auto` also gets `overflow-x: auto`, so the panel scrolled inside while the page looked fine. The log now clips that axis, and the tool line can wrap.
- Nothing is smaller than 12 pixels any more (twenty rules were at 9 to 11), the back button, the brand and the underlined links are at least 44 pixels tall, a checkbox is judged by the label that wraps it, and the ascendant label no longer touches the edge of the chart on the narrowest phone.
- Web: both hosts carry the new build, Aliyun via `tools/deploy-web.sh` and the Huanayun mirror via the new `tools/deploy-web-fast.sh`.
