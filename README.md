[English](README.md) · [العربية](i18n/README.ar.md) · [Español](i18n/README.es.md) · [Français](i18n/README.fr.md) · [日本語](i18n/README.ja.md) · [한국어](i18n/README.ko.md) · [Tiếng Việt](i18n/README.vi.md) · [中文 (简体)](i18n/README.zh-Hans.md) · [中文（繁體）](i18n/README.zh-Hant.md) · [Deutsch](i18n/README.de.md) · [Русский](i18n/README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://lazying.art)

![LazyOracle banner](docs/images/banner.svg)

# LazyOracle

**Eight divination practices, computed on your own device and explained in plain words.**

[Open the web app](https://oracle.lazying.art) · [Mirror](https://oracle-fast.lazying.art) · [TestFlight beta](https://testflight.apple.com/join/JZJM3PFb) · [Google Play internal test](https://play.google.com/apps/internaltest/4701677916092886102) · [Privacy](https://oracle.lazying.art/privacy.html) · [Support](https://oracle.lazying.art/support.html)

<p align="center"><img src="docs/screenshots/home-practices.png" width="30%" alt="The eight practices"> <img src="docs/screenshots/tarot-three-model-reading.png" width="30%" alt="A three-card reading"> <img src="docs/screenshots/chat-agent.png" width="30%" alt="Ask Tianji casting a hexagram"></p>

Tarot, BaZi, the I Ching, astrology, feng shui, palmistry and face reading each rest on a body of rules that is precise, even where it is not science. LazyOracle implements those rules exactly, on the device, and then lets a language model put the result into sentences. The model narrates; it never decides. The web app is free. The phone apps are a one-off US$0.99, with no subscription. Charts run on the device; cloud narration is provided through our reading relay.

## What it does

- **Tarot** — all 78 cards with English and Chinese keywords, three spreads, and a seeded shuffle, so a draw can be reproduced from the seed printed beside it.
- **BaZi (四柱八字)** — the four pillars with hidden stems, ten gods, nayin and luck cycles, from true solar time corrected for longitude and the equation of time.
- **I Ching (周易)** — coins or yarrow stalks, moving lines, the resulting hexagram, and 互卦, 错卦 and 综卦, with the classical rule for which line or judgement actually answers.
- **Astrology (星座)** — a natal chart from an astronomical ephemeris, whole-sign houses, ascendant and midheaven, aspects with orbs, and today's transits.
- **Feng shui (风水)** — the Eight Mansions: your 命卦 and the eight directions of a home, with the phone's compass to find them.
- **Palmistry (手相)** — the hand is measured from a photo on the device: elemental hand shape, each finger against the middle finger, the thumb's opening angle, and the eight palaces of the palm.
- **Face reading (面相)** — 三停, the five-eye proportion, symmetry, the elemental face type, and eight of the 十二宫, all measured on the device.
- **Book of Answers and Book of Questions** — two original corpora, opened at a page chosen from your question.
- **Ask Tianji (问天机)** — a conversation that can run any of the engines above as a tool: it draws real cards and casts real hexagrams rather than describing what you could do.

## How a reading is made

Every practice produces a structured set of facts: the cards drawn in their positions, the pillars and their relations, the hexagram and its moving lines. Those facts are computed by ordinary, tested code, so they are identical on every device and every run. Only then is a model asked for prose, with the facts as its only source and instructions not to add, replace or contradict any of them. When no model is available, the app composes the reading from the same facts itself, so a reading always appears.

The current testing builds use two reading sources:

| Source | What it is | When it runs |
| --- | --- | --- |
| Tianji Cloud (天机云端) | DeepSeek Flash through our relay; provider credentials stay on the server | Enabled by default; can be switched off in Settings |
| The offline composition | A reading composed from the deterministic facts | When the cloud is disabled or unavailable; chat needs a connection |

## Privacy

Cards, charts, hexagrams and measurements are computed on the device. Photos for palmistry and face reading are measured in memory and never stored, uploaded or matched against anything. Birth profiles are saved in local storage. There is no account, no analytics and no advertising identifier. With Tianji Cloud switched on, requests carry your question, relevant conversation history or its summary, and structured reading facts (which may include birth details) through our relay to the model provider. Turning it off stops cloud reading requests. The full policy is at [oracle.lazying.art/privacy.html](https://oracle.lazying.art/privacy.html).

LazyOracle now uses the native SwiftUI and Compose implementation developed as Auspice / 宜时, with eleven interface languages and live hand/face landmarks. The PWA shares its deterministic engines and receives corresponding fixes. Classic Capacitor builds remain available for rollback. See [the native migration plan](docs/plans/native-main-2026-09-24.md).

## Platforms

| Platform | Implementation | Verification |
| --- | --- | --- |
| Web/PWA | React 19, TypeScript, Vite, Workbox | Chromium flows for every practice, offline precache, the Safari code path exercised with `tools/safari-path-test.py` |
| Android | Jetpack Compose, CameraX | Signed bundle, conversation regressions, emulator UI and upgrade checks |
| iOS | SwiftUI, AVFoundation | Native UI, camera lifecycle, conversation and upgrade checks; TestFlight distribution |

## Build and test

Requirements: Node.js 22+ and npm; Android Studio with JDK 21 for Android; Xcode for Apple targets.

```bash
npm install
npm run dev     # the PWA at http://localhost:5173
npm run check   # lint, regression tests, production PWA build
```

Two browser checks run against a built `dist/`, with Playwright's Chromium:

```bash
python3 tools/safari-path-test.py   # retained classic-model compatibility check
python3 tools/agent-chat-test.py    # the chat really runs the engines it claims to
```

Native build commands and platform requirements are in [native/README.md](native/README.md).

## Repository layout

- `src/engines/` — one folder per practice, pure functions with tests and no interface code.
- `src/lib/` — the reading pipeline, the model sources, the agent's tools and the saved conversations.
- `src/components/` — one screen per practice, plus the chat and settings.
- `ops/` — the Tianji Cloud relay, dependency-free Python, with its systemd unit.
- `store/` — store metadata, privacy declarations, screenshots and release status.
- `tools/` — release, deployment and browser-verification scripts.
- `docs/` — the product brief and progress log, handoff notes and plans.

## Support

If this project is useful, a star, an issue, a translation or a carefully scoped pull request all help. Financial support pays for hosting.

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [LazyingArt Donate](https://chat.lazying.art/donate) | [paypal.me/RongzhouChen](https://paypal.me/RongzhouChen) | [Support with Stripe](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

[Sponsor on GitHub](https://github.com/sponsors/lachlanchen)

## About

Made by [Lachlan Chen](https://github.com/lachlanchen) at LazyingArt. Sibling of [L & N](https://github.com/lachlanchen/L-And-N), which supplies the app shell and the publishing pipeline.

Divination is treated here as a mirror for reflection, not as prediction. Nothing in this app is medical, legal or financial advice.

Released under the [MIT License](LICENSE).
