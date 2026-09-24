[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://lazying.art)

![LazyOracle-Banner](../docs/images/banner.svg)

# LazyOracle

**Acht Praktiken der Weissagung, auf dem eigenen Gerät berechnet und in klaren Worten erklärt.**

[Web-App öffnen](https://oracle.lazying.art) · [Spiegel](https://oracle-fast.lazying.art) · [TestFlight-Beta](https://testflight.apple.com/join/JZJM3PFb) · [Interner Test bei Google Play](https://play.google.com/apps/internaltest/4701677916092886102) · [Datenschutz](https://oracle.lazying.art/privacy.html) · [Support](https://oracle.lazying.art/support.html)

<p align="center"><img src="../docs/screenshots/home-practices.png" width="30%" alt="Die acht Praktiken"> <img src="../docs/screenshots/tarot-three-model-reading.png" width="30%" alt="Eine Legung mit drei Karten"> <img src="../docs/screenshots/chat-agent.png" width="30%" alt="Ask Tianji wirft ein Hexagramm"></p>

Tarot, BaZi, das I Ging, Astrologie, Feng Shui, Handlesen und Gesichtsdeutung beruhen jeweils auf einem Regelwerk, das genau ist, auch wo es keine Wissenschaft ist. LazyOracle setzt diese Regeln exakt um, auf dem Gerät, und lässt anschließend ein Sprachmodell das Ergebnis in Sätze fassen. Das Modell erzählt; es entscheidet nie. Die Web-App ist kostenlos. Die Handy-Apps kosten einmalig 0,99 US$, ohne Abo und ohne laufende Kosten, weil nichts auf einem Server berechnet werden muss.

## Was sie kann

- **Tarot** — alle 78 Karten mit englischen und chinesischen Schlagwörtern, drei Legesysteme und ein Mischen mit Startwert, sodass sich jede Ziehung aus dem daneben angezeigten Startwert wiederherstellen lässt.
- **BaZi (四柱八字)** — die vier Säulen mit verborgenen Stämmen, den zehn Göttern, Nayin und den Glückszyklen, aus der wahren Sonnenzeit, korrigiert um Längengrad und Zeitgleichung.
- **I Ging (周易)** — Münzen oder Schafgarbenstängel, wandelnde Linien, das entstehende Hexagramm sowie 互卦 (Kernhexagramm), 错卦 (Gegenhexagramm) und 综卦 (umgekehrtes Hexagramm), mit der klassischen Regel dafür, welche Linie oder welches Urteil tatsächlich antwortet.
- **Astrologie (星座)** — ein Geburtshoroskop aus einer astronomischen Ephemeride, Häuser nach ganzen Zeichen, Aszendent und Medium Coeli, Aspekte mit Orben und die heutigen Transite.
- **Feng Shui (风水)** — die Acht Häuser: Ihr 命卦 (Schicksalstrigramm) und die acht Richtungen einer Wohnung, die der Kompass des Telefons auffindbar macht.
- **Handlesen (手相)** — die Hand wird auf dem Gerät aus einem Foto vermessen: die elementare Handform, jeder Finger im Verhältnis zum Mittelfinger, der Öffnungswinkel des Daumens und die acht Paläste der Handfläche.
- **Gesichtsdeutung (面相)** — die 三停 (drei Zonen des Gesichts), das Fünf-Augen-Verhältnis, die Symmetrie, der elementare Gesichtstyp und acht der 十二宫 (zwölf Paläste), alles auf dem Gerät gemessen.
- **Das Buch der Antworten und das Buch der Fragen** — zwei eigene Textsammlungen, aufgeschlagen auf einer Seite, die Ihre Frage bestimmt.
- **Ask Tianji (问天机)** — ein Gespräch, das jede der obigen Engines als Werkzeug ausführen kann: Es zieht echte Karten und wirft echte Hexagramme, statt zu beschreiben, was man tun könnte.

## Wie eine Deutung entsteht

Jede Praktik erzeugt eine strukturierte Menge von Fakten: die gezogenen Karten an ihren Positionen, die Säulen und ihre Beziehungen, das Hexagramm und seine wandelnden Linien. Diese Fakten berechnet ganz gewöhnlicher, getesteter Code, deshalb sind sie auf jedem Gerät und bei jedem Durchlauf gleich. Erst danach wird ein Modell um Prosa gebeten — mit diesen Fakten als einziger Quelle und der Anweisung, keinen davon zu ergänzen, zu ersetzen oder ihm zu widersprechen. Steht kein Modell zur Verfügung, setzt die App die Deutung selbst aus denselben Fakten zusammen, sodass immer eine Deutung erscheint.

Drei Quellen werden der Reihe nach versucht:

| Quelle | Was sie ist | Wann sie läuft |
| --- | --- | --- |
| Ein heruntergeladenes Tianji-Modell | 天机快速版 / Tianji Fast (rund 400 MB) oder 天机专业版 / Tianji Pro (rund 1,1 GB), in der App ausgeführt über llama.cpp, kompiliert nach WebAssembly | Sobald eines heruntergeladen wurde |
| Tianji Cloud (天机云端) | Unser eigenes Relay, das den Anbieterschlüssel verwahrt und nichts aufbewahrt | Nur wenn es in den Einstellungen aktiviert ist; standardmäßig aus |
| Die Offline-Komposition | Die deterministische Engine, die die Deutung selbst schreibt | Immer dann, wenn keines der beiden anderen verfügbar ist |

## Datenschutz

Karten, Horoskope, Hexagramme und Messungen werden auf dem Gerät berechnet. Fotos für Handlesen und Gesichtsdeutung werden im Arbeitsspeicher vermessen und niemals gespeichert, hochgeladen oder mit irgendetwas abgeglichen. Geburtsdaten bleiben im lokalen Speicher des Browsers auf diesem Gerät. Es gibt kein Konto, keine Analyse und keine Werbe-ID. Mit eingeschalteter Tianji Cloud trägt eine einzige Anfrage die strukturierten Fakten und Ihre Frage zu unserem Relay, das sie an ein Sprachmodell weiterreicht und keine Kopie behält; ist sie ausgeschaltet, verlässt überhaupt nichts das Gerät. Die vollständige Richtlinie steht unter [oracle.lazying.art/privacy.html](https://oracle.lazying.art/privacy.html).

## Plattformen

| Plattform | Umsetzung | Nachweis |
| --- | --- | --- |
| Web/PWA | React 19, TypeScript, Vite, Workbox | Chromium-Abläufe für jede Praktik, Offline-Precache, der Safari-Codepfad geprüft mit `tools/safari-path-test.py` |
| Android | Capacitor 8 | Signiertes Bundle und APK, installiert und gestartet auf API 36 |
| iOS | Capacitor 8 | Signiertes Archiv, hochgeladen zu App Store Connect, verteilt über TestFlight |

## Bauen und testen

Voraussetzungen: Node.js 22+ und npm; Android Studio mit JDK 21 für Android; Xcode für die Apple-Ziele.

```bash
npm install
npm run dev     # die PWA unter http://localhost:5173
npm run check   # Lint, 66 Tests, Produktions-Build
```

Zwei Browser-Prüfungen laufen gegen ein gebautes `dist/`, mit dem Chromium von Playwright:

```bash
python3 tools/safari-path-test.py   # Modelle auf dem Gerät laden weiterhin in Safari und unter iOS
python3 tools/agent-chat-test.py    # der Chat führt die Engines wirklich aus, die er nennt
```

## Aufbau des Repositorys

- `src/engines/` — ein Ordner je Praktik, reine Funktionen mit Tests und ohne Oberflächencode.
- `src/lib/` — die Deutungs-Pipeline, die Modellquellen, die Werkzeuge des Agenten und die gespeicherten Gespräche.
- `src/components/` — ein Bildschirm je Praktik, dazu der Chat und die Einstellungen.
- `ops/` — das Tianji-Cloud-Relay, abhängigkeitsfreies Python, mit seiner systemd-Unit.
- `store/` — Store-Metadaten, Datenschutzangaben, Screenshots und Veröffentlichungsstand.
- `tools/` — Skripte für Release, Deployment und Browser-Prüfungen.
- `docs/` — das Produktkonzept und das Fortschrittsprotokoll, Übergabenotizen und Pläne.

## Unterstützung

Wenn dieses Projekt nützlich ist, helfen ein Stern, ein Issue, eine Übersetzung oder ein sorgfältig umrissener Pull Request. Finanzielle Unterstützung bezahlt das Hosting.

| Spenden | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

## Über das Projekt

Erstellt von [Lachlan Chen](https://github.com/lachlanchen) bei LazyingArt. Geschwisterprojekt von [L & N](https://github.com/lachlanchen/L-And-N), das die App-Hülle und die Veröffentlichungskette beisteuert.

Weissagung gilt hier als Spiegel zum Nachdenken, nicht als Vorhersage. Nichts in dieser App ist medizinische, rechtliche oder finanzielle Beratung.

Veröffentlicht unter der [MIT-Lizenz](../LICENSE).
