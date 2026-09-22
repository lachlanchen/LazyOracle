[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://lazying.art)

![LazyOracle banner](../docs/images/banner.svg)

# LazyOracle

**8 つの占術を、あなた自身の端末で計算し、平易な言葉で説明します。**

[ウェブアプリを開く](https://oracle.lazying.art) · [ミラー](https://oracle-fast.lazying.art) · [TestFlight ベータ](https://testflight.apple.com/join/JZJM3PFb) · [Google Play 内部テスト](https://play.google.com/apps/internaltest/4701677916092886102) · [プライバシー](https://oracle.lazying.art/privacy.html) · [サポート](https://oracle.lazying.art/support.html)

<p align="center"><img src="../docs/screenshots/home-practices.png" width="30%" alt="8 つの占術"> <img src="../docs/screenshots/tarot-three-model-reading.png" width="30%" alt="スリーカードの鑑定"> <img src="../docs/screenshots/chat-agent.png" width="30%" alt="问天机が卦を立てているところ"></p>

タロット、四柱八字（しちゅうはちじ、四柱推命）、周易（えき、易経）、星座（西洋占星術）、风水（ふうすい）、手相、面相（人相）は、科学ではないにせよ、いずれも厳密な規則の体系の上に成り立っています。LazyOracle はその規則を端末上で忠実に実装し、そのうえで結果を文章にする役目だけを言語モデルに任せます。モデルは語るだけで、判断は一切しません。ウェブアプリは無料です。スマートフォンアプリは買い切りの 0.99 米ドルで、サブスクリプションはなく、サーバー側で計算するものが何もないため運用費もかかりません。

## できること

- **タロット** — 全 78 枚を英語と中国語のキーワード付きで収録。3 種類のスプレッドと、シード付きのシャッフルを備えているので、傍らに表示されるシードから同じ引きを再現できます。
- **八字（四柱八字）** — 経度と均時差で補正した真太陽時から求めた四柱に、蔵干・十神・納音・大運を添えて。
- **易（周易）** — 擲銭法または筮竹、変爻、之卦、そして 互卦（内側の爻から組み直した卦）・错卦（全爻を反転させた卦）・综卦（上下を逆さにした卦）。どの爻、どの卦辞が実際の答えになるかは古典の作法どおりに判定します。
- **占星術（星座）** — 天文暦から起こす出生図。ホールサイン・ハウス、アセンダントと MC、オーブ付きのアスペクト、そして当日のトランジット。
- **风水** — 八宅派による、あなたの 命卦（本命卦）と住まいの八方位。端末のコンパスで方位を確かめられます。
- **手相** — 写真から端末上で手を計測します。五行による手の形、中指を基準にした各指の長さ、親指の開き角度、そして掌の八宮。
- **面相** — 三停（顔を上・中・下に分けた三つの区画）、五眼の比率、左右対称性、五行による顔の型、さらに 十二宫（十二宮）のうち八宮を、すべて端末上で計測します。
- **答えの書と問いの書** — 二つのオリジナル語彙集を、あなたの問いから選ばれたページで開きます。
- **问天机（天機に問う）** — 上記のどのエンジンもツールとして呼び出せる対話。できることを説明するのではなく、実際にカードを引き、実際に卦を立てます。

## 鑑定はどう作られるか

どの占術も、構造化された事実の組を生み出します。どの位置にどのカードが出たか、四柱とその関係、卦と変爻、といったものです。これらの事実はごく普通の、テスト済みのコードで計算されるため、どの端末でも、何度実行しても同じ結果になります。文章を書かせるために言語モデルが呼ばれるのはその後で、モデルにはこれらの事実だけを典拠とし、何も付け加えず、置き換えず、矛盾もさせないよう指示されます。利用できるモデルがないときは、アプリ自身が同じ事実から鑑定文を組み立てるので、鑑定が出ないことはありません。

3 つの供給元が順に試されます。

| 供給元 | 何であるか | 使われる条件 |
| --- | --- | --- |
| ダウンロード済みの天機モデル | 天机快速版（天機の高速版）/ Tianji Fast（約 400 MB）または 天机专业版（天機のプロ版）/ Tianji Pro（約 1.1 GB）。WebAssembly にコンパイルした llama.cpp でアプリ内で動作します | いずれかをダウンロード済みのとき |
| Tianji Cloud（天机云端、天機クラウド） | プロバイダーの鍵を預かり、何も保存しない自前の中継サーバー | 設定でオンにしたときのみ。既定はオフ |
| オフライン生成 | 決定論的なエンジンが自ら鑑定文を書きます | 上の 2 つがどちらも使えないとき |

## プライバシー

カード、チャート、卦、各種の計測はすべて端末上で計算されます。手相と面相に使う写真はメモリ上で計測されるだけで、保存も送信もされず、何かと照合されることもありません。生年月日などの情報はその端末のブラウザのローカルストレージに留まります。アカウントも、アクセス解析も、広告識別子もありません。Tianji Cloud をオンにすると、構造化された事実とあなたの問いを載せたリクエストが 1 回だけ当方の中継サーバーに送られ、そこから言語モデルへ転送されます。中継サーバーは控えを残しません。オフのときは、端末から出ていくものは何もありません。方針の全文は [oracle.lazying.art/privacy.html](https://oracle.lazying.art/privacy.html) にあります。

## 対応プラットフォーム

| プラットフォーム | 実装 | 検証 |
| --- | --- | --- |
| Web/PWA | React 19、TypeScript、Vite、Workbox | 全占術の Chromium での動作確認、オフラインのプリキャッシュ、`tools/safari-path-test.py` による Safari 用コードパスの実行 |
| Android | Capacitor 8 | 署名済みの bundle と APK を API 36 でインストールして起動 |
| iOS | Capacitor 8 | 署名済みのアーカイブを App Store Connect にアップロードし、TestFlight で配布 |

## ビルドとテスト

必要なもの: Node.js 22 以上と npm。Android には JDK 21 を備えた Android Studio、Apple 向けには Xcode。

```bash
npm install
npm run dev     # the PWA at http://localhost:5173
npm run check   # lint, 66 tests, production build
```

ビルド済みの `dist/` に対して、Playwright の Chromium でブラウザ側の確認を 2 つ実行します。

```bash
python3 tools/safari-path-test.py   # on-device models still load on Safari and iOS
python3 tools/agent-chat-test.py    # the chat really runs the engines it claims to
```

## リポジトリの構成

- `src/engines/` — 占術ごとに 1 フォルダ。純粋関数とテストのみで、UI のコードは含みません。
- `src/lib/` — 鑑定のパイプライン、モデルの供給元、エージェントのツール、保存された会話。
- `src/components/` — 占術ごとに 1 画面。ほかにチャットと設定。
- `ops/` — Tianji Cloud の中継サーバー。依存関係のない Python と systemd ユニット。
- `store/` — ストア用のメタデータ、プライバシー申告、スクリーンショット、リリース状況。
- `tools/` — リリース、デプロイ、ブラウザ検証のスクリプト。
- `docs/` — プロダクト概要と進捗ログ、引き継ぎメモ、計画。

## サポート

このプロジェクトが役に立ったなら、スター、issue、翻訳、あるいは範囲を絞ったプルリクエストのいずれもありがたく思います。金銭的な支援はホスティング費用に充てられます。

| 寄付 | PayPal | Stripe |
| --- | --- | --- |
| [LazyingArt Donate](https://chat.lazying.art/donate) | [paypal.me/RongzhouChen](https://paypal.me/RongzhouChen) | [Stripe で支援する](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

[GitHub でスポンサーになる](https://github.com/sponsors/lachlanchen)

## このプロジェクトについて

LazyingArt の [Lachlan Chen](https://github.com/lachlanchen) が制作。姉妹プロジェクトの [L & N](https://github.com/lachlanchen/L-And-N) が、アプリの外枠と公開パイプラインを提供しています。

ここでは占いを、予言ではなく、自分を映して考えるための鏡として扱っています。このアプリのいかなる内容も、医療・法律・財務に関する助言ではありません。

[MIT License](../LICENSE) のもとで公開しています。
