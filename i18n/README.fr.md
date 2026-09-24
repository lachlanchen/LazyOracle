[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://lazying.art)

![Bannière LazyOracle](../docs/images/banner.svg)

# LazyOracle

**Huit pratiques divinatoires, calculées sur votre propre appareil et expliquées en mots simples.**

[Ouvrir l'application web](https://oracle.lazying.art) · [Miroir](https://oracle-fast.lazying.art) · [Bêta TestFlight](https://testflight.apple.com/join/JZJM3PFb) · [Test interne Google Play](https://play.google.com/apps/internaltest/4701677916092886102) · [Confidentialité](https://oracle.lazying.art/privacy.html) · [Assistance](https://oracle.lazying.art/support.html)

<p align="center"><img src="../docs/screenshots/home-practices.png" width="30%" alt="Les huit pratiques"> <img src="../docs/screenshots/tarot-three-model-reading.png" width="30%" alt="Un tirage à trois cartes"> <img src="../docs/screenshots/chat-agent.png" width="30%" alt="Ask Tianji tirant un hexagramme"></p>

Le tarot, le BaZi, le Yi King, l'astrologie, le feng shui, la chiromancie et la physiognomonie reposent chacun sur un corps de règles précis, y compris là où il ne relève pas de la science. LazyOracle applique ces règles à la lettre, sur l'appareil, puis laisse un modèle de langage mettre le résultat en phrases. Le modèle raconte ; il ne décide jamais. L'application web est gratuite. Les applications mobiles coûtent 0,99 US$ une seule fois, sans abonnement ni frais récurrents, puisque rien n'a besoin d'être calculé sur un serveur.

## Ce qu'elle fait

- **Tarot** — les 78 cartes avec leurs mots-clés en anglais et en chinois, trois tirages et un battage à graine, de sorte qu'un tirage peut être reproduit à partir de la graine affichée à côté de lui.
- **BaZi (四柱八字)** — les quatre piliers avec leurs troncs cachés, les dix dieux, le nayin et les cycles de chance, à partir du temps solaire vrai corrigé de la longitude et de l'équation du temps.
- **Yi King (周易)** — pièces ou tiges d'achillée, lignes mutantes, hexagramme obtenu, ainsi que les 互卦 (hexagramme nucléaire), 错卦 (hexagramme opposé) et 综卦 (hexagramme renversé), avec la règle classique qui désigne la ligne ou le jugement qui répond vraiment.
- **Astrologie (星座)** — un thème natal calculé à partir d'une éphéméride astronomique, maisons en signes entiers, ascendant et milieu du ciel, aspects avec leurs orbes et transits du jour.
- **Feng shui (风水)** — les Huit Demeures : votre 命卦 (trigramme de destinée) et les huit directions d'un logement, la boussole du téléphone servant à les repérer.
- **Chiromancie (手相)** — la main est mesurée sur l'appareil à partir d'une photo : la forme élémentaire de la main, chaque doigt rapporté au majeur, l'angle d'ouverture du pouce et les huit palais de la paume.
- **Physiognomonie (面相)** — les 三停 (les trois étages du visage), la proportion des cinq yeux, la symétrie, le type de visage selon les éléments et huit des 十二宫 (douze palais), le tout mesuré sur l'appareil.
- **Le Livre des Réponses et le Livre des Questions** — deux corpus originaux, ouverts à une page choisie à partir de votre question.
- **Ask Tianji (问天机)** — une conversation capable d'exécuter comme outil n'importe lequel des moteurs ci-dessus : elle tire de vraies cartes et jette de vrais hexagrammes au lieu de décrire ce que vous pourriez faire.

## Comment une lecture est fabriquée

Chaque pratique produit un ensemble structuré de faits : les cartes tirées à leurs places, les piliers et leurs relations, l'hexagramme et ses lignes mutantes. Ces faits sont calculés par du code ordinaire et testé, si bien qu'ils sont identiques sur chaque appareil et à chaque exécution. Ce n'est qu'ensuite qu'on demande de la prose à un modèle, avec ces faits pour seule source et la consigne de n'en ajouter, remplacer ni contredire aucun. Lorsque aucun modèle n'est disponible, l'application compose elle-même la lecture à partir des mêmes faits, de sorte qu'une lecture apparaît toujours.

Trois sources sont essayées dans cet ordre :

| Source | Ce que c'est | Quand elle sert |
| --- | --- | --- |
| Un modèle Tianji téléchargé | 天机快速版 / Tianji Fast (environ 400 Mo) ou 天机专业版 / Tianji Pro (environ 1,1 Go), exécuté dans l'application via llama.cpp compilé en WebAssembly | Dès que l'un d'eux a été téléchargé |
| Tianji Cloud (天机云端) | Notre propre relais, qui détient la clé du fournisseur et ne conserve rien | Uniquement s'il est activé dans les Réglages ; désactivé par défaut |
| La composition hors ligne | Le moteur déterministe rédigeant lui-même la lecture | Dès qu'aucune des deux précédentes n'est disponible |

## Confidentialité

Cartes, thèmes, hexagrammes et mesures sont calculés sur l'appareil. Les photos servant à la chiromancie et à la physiognomonie sont mesurées en mémoire, jamais stockées, jamais téléversées, jamais comparées à quoi que ce soit. Les données de naissance restent dans le stockage local du navigateur, sur cet appareil. Il n'y a ni compte, ni analytique, ni identifiant publicitaire. Avec Tianji Cloud activé, une requête transporte les faits structurés et votre question jusqu'à notre relais, qui les transmet à un modèle de langage sans en garder de copie ; désactivé, rien ne quitte l'appareil. La politique complète se trouve sur [oracle.lazying.art/privacy.html](https://oracle.lazying.art/privacy.html).

## Plateformes

| Plateforme | Implémentation | Vérification |
| --- | --- | --- |
| Web/PWA | React 19, TypeScript, Vite, Workbox | Parcours Chromium pour chaque pratique, précache hors ligne, chemin de code Safari éprouvé avec `tools/safari-path-test.py` |
| Android | Capacitor 8 | Bundle et APK signés, installés et lancés sur l'API 36 |
| iOS | Capacitor 8 | Archive signée déposée sur App Store Connect, distribuée via TestFlight |

## Compilation et tests

Prérequis : Node.js 22+ et npm ; Android Studio avec JDK 21 pour Android ; Xcode pour les cibles Apple.

```bash
npm install
npm run dev     # la PWA sur http://localhost:5173
npm run check   # lint, 66 tests, build de production
```

Deux vérifications en navigateur s'exécutent sur un `dist/` déjà construit, avec le Chromium de Playwright :

```bash
python3 tools/safari-path-test.py   # les modèles embarqués se chargent toujours sur Safari et iOS
python3 tools/agent-chat-test.py    # le chat exécute bel et bien les moteurs qu'il annonce
```

## Organisation du dépôt

- `src/engines/` — un dossier par pratique, des fonctions pures avec leurs tests et aucun code d'interface.
- `src/lib/` — la chaîne de lecture, les sources de modèles, les outils de l'agent et les conversations enregistrées.
- `src/components/` — un écran par pratique, plus le chat et les réglages.
- `ops/` — le relais Tianji Cloud, en Python sans dépendances, avec son unité systemd.
- `store/` — métadonnées des boutiques, déclarations de confidentialité, captures d'écran et état des publications.
- `tools/` — scripts de publication, de déploiement et de vérification en navigateur.
- `docs/` — la note de cadrage produit et le journal d'avancement, les notes de passation et les plans.

## Soutien

Si ce projet vous est utile, une étoile, un ticket, une traduction ou une pull request bien délimitée sont autant d'aides. Le soutien financier paie l'hébergement.

| Faire un don | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

## À propos

Réalisé par [Lachlan Chen](https://github.com/lachlanchen) chez LazyingArt. Frère de [L & N](https://github.com/lachlanchen/L-And-N), qui fournit la coque applicative et la chaîne de publication.

La divination est traitée ici comme un miroir pour la réflexion, non comme une prédiction. Rien dans cette application ne constitue un conseil médical, juridique ou financier.

Publié sous [licence MIT](../LICENSE).
