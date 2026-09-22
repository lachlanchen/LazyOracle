[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

![LazyOracle banner](../docs/images/banner.svg)

# LazyOracle

**八種占卜術數，全部在你自己的裝置上推算，並用平實的話講清楚。**

[開啟網頁版](https://oracle.lazying.art) · [鏡像站](https://oracle-fast.lazying.art) · [TestFlight 測試版](https://testflight.apple.com/join/JZJM3PFb) · [Google Play 內部測試](https://play.google.com/apps/internaltest/4701677916092886102) · [隱私政策](https://oracle.lazying.art/privacy.html) · [支援](https://oracle.lazying.art/support.html)

<p align="center"><img src="../docs/screenshots/home-practices.png" width="30%" alt="八種術數"> <img src="../docs/screenshots/tarot-three-model-reading.png" width="30%" alt="三張牌的解讀"> <img src="../docs/screenshots/chat-agent.png" width="30%" alt="問天機起卦中"></p>

塔羅、四柱八字、周易、星座、風水、手相與面相，各自都有一套精確的規則體系——即便它們並非科學，規則本身依然嚴整。LazyOracle 嚴格地在裝置上實作這些規則，然後交由語言模型把結果寫成句子。模型只負責敘述，從不負責判斷。網頁版免費；手機應用一次性收費 0.99 美元，沒有訂閱，也沒有持續開銷，因為沒有任何東西需要在伺服器上運算。

## 它能做什麼

- **塔羅** —— 全部 78 張牌，附中英文關鍵詞，三種牌陣，以及帶種子的洗牌，因此任何一次抽牌都能憑旁邊印出的種子重現。
- **八字（四柱八字）** —— 四柱連同藏干、十神、納音與大運，以按經度和均時差校正過的真太陽時推算。
- **易經（周易）** —— 銅錢起卦或蓍草揲卦、動爻、之卦，以及 互卦、錯卦 與 綜卦，並依古法判定究竟由哪一爻或哪一斷辭作答。
- **占星（星座）** —— 依天文星曆生成的本命盤，整宮制宮位、上升點與中天、帶容許度的相位，以及當日行運。
- **風水** —— 八宅派：你的 命卦 與住宅的八個方位，可藉手機羅盤定位。
- **手相** —— 在裝置上從照片測量手部：五行手型、各指與中指的比例、拇指的張開角度，以及掌中八宮。
- **面相** —— 三停、三庭五眼中的五眼比例、對稱度、五行面型，以及 十二宮 中的八宮，全部在裝置上測得。
- **答案之書與問題之書** —— 兩部原創語料，依你的提問翻到某一頁。
- **問天機** —— 一場對話，可以把上面任何一個引擎當作工具呼叫：它會真的抽牌、真的起卦，而不是告訴你可以怎麼做。

## 一次解讀是怎樣生成的

每一種術數都會產出一組結構化的事實：牌落在哪些牌位、四柱及其生剋關係、卦象與動爻。這些事實由普通的、經過測試的程式碼算出，因此在每台裝置、每一次執行中都完全一致。之後才會請模型寫成文字，並且以這些事實為唯一依據，同時明確要求不得增添、替換或違背其中任何一條。當沒有可用的模型時，應用會自己依據同樣的事實拼出解讀，所以解讀總會出現。

三個來源依序嘗試：

| 來源 | 是什麼 | 何時啟用 |
| --- | --- | --- |
| 已下載的天機模型 | 天機快速版 / Tianji Fast（約 400 MB）或 天機專業版 / Tianji Pro（約 1.1 GB），透過編譯為 WebAssembly 的 llama.cpp 在應用內執行 | 只要下載過其中之一 |
| Tianji Cloud（天機雲端） | 我們自建的中繼，持有服務商金鑰，且不保留任何內容 | 僅在設定中開啟時；預設關閉 |
| 離線拼寫 | 由確定性引擎自行寫出解讀 | 以上兩者都不可用時 |

## 隱私

牌、星盤、卦象與各項測量都在裝置上運算。手相與面相所用的照片在記憶體中完成測量，絕不儲存、上傳，也絕不與任何資料比對。出生資訊只留在該裝置瀏覽器的本機儲存空間中。沒有帳號，沒有分析統計，也沒有廣告識別碼。開啟 Tianji Cloud 後，會有一次請求把結構化事實與你的問題送到我們的中繼，由它轉發給語言模型，並且不留副本；關閉時，沒有任何內容離開裝置。完整政策見 [oracle.lazying.art/privacy.html](https://oracle.lazying.art/privacy.html)。

## 平台

| 平台 | 實作方式 | 驗證方式 |
| --- | --- | --- |
| Web/PWA | React 19、TypeScript、Vite、Workbox | 每種術數的 Chromium 流程、離線預先快取，以及用 `tools/safari-path-test.py` 跑通的 Safari 程式碼路徑 |
| Android | Capacitor 8 | 已簽署的 bundle 與 APK，在 API 36 上安裝並啟動 |
| iOS | Capacitor 8 | 已簽署的封存上傳至 App Store Connect，透過 TestFlight 發佈 |

## 建置與測試

環境需求：Node.js 22+ 與 npm；Android 端需裝有 JDK 21 的 Android Studio；Apple 端需 Xcode。

```bash
npm install
npm run dev     # the PWA at http://localhost:5173
npm run check   # lint, 66 tests, production build
```

另有兩項瀏覽器檢查，針對建置好的 `dist/` 執行，使用 Playwright 的 Chromium：

```bash
python3 tools/safari-path-test.py   # on-device models still load on Safari and iOS
python3 tools/agent-chat-test.py    # the chat really runs the engines it claims to
```

## 儲存庫結構

- `src/engines/` —— 每種術數一個目錄，純函式，附帶測試，不含介面程式碼。
- `src/lib/` —— 解讀流程、模型來源、代理人的工具，以及已儲存的對話。
- `src/components/` —— 每種術數一個畫面，另有聊天與設定。
- `ops/` —— Tianji Cloud 中繼，零相依的 Python，附 systemd 單元檔。
- `store/` —— 商店中繼資料、隱私聲明、截圖與發佈狀態。
- `tools/` —— 發佈、部署與瀏覽器驗證指令碼。
- `docs/` —— 產品說明與進度紀錄、交接筆記與計畫。

## 支持

如果這個專案對你有用，一個 star、一個 issue、一份翻譯，或一個範圍清晰的 pull request，都很有幫助。資金支持用於支付主機費用。

| 捐贈 | PayPal | Stripe |
| --- | --- | --- |
| [LazyingArt Donate](https://chat.lazying.art/donate) | [paypal.me/RongzhouChen](https://paypal.me/RongzhouChen) | [用 Stripe 支持](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

[在 GitHub 上贊助](https://github.com/sponsors/lachlanchen)

## 關於

由 LazyingArt 的 [Lachlan Chen](https://github.com/lachlanchen) 製作。姊妹專案為 [L & N](https://github.com/lachlanchen/L-And-N)，它提供了本應用的外殼與發佈流程。

這裡把占卜視為一面供人反省的鏡子，而非預言。本應用中的任何內容都不構成醫療、法律或財務建議。

依據 [MIT License](../LICENSE) 發佈。
