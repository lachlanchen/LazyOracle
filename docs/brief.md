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
