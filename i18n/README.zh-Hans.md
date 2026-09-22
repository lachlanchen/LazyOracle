[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://lazying.art)

![LazyOracle banner](../docs/images/banner.svg)

# LazyOracle

**八种占卜术数，全部在你自己的设备上推算，并用平实的话讲清楚。**

[打开网页版](https://oracle.lazying.art) · [镜像站](https://oracle-fast.lazying.art) · [TestFlight 测试版](https://testflight.apple.com/join/JZJM3PFb) · [Google Play 内部测试](https://play.google.com/apps/internaltest/4701677916092886102) · [隐私政策](https://oracle.lazying.art/privacy.html) · [支持](https://oracle.lazying.art/support.html)

<p align="center"><img src="../docs/screenshots/home-practices.png" width="30%" alt="八种术数"> <img src="../docs/screenshots/tarot-three-model-reading.png" width="30%" alt="三张牌的解读"> <img src="../docs/screenshots/chat-agent.png" width="30%" alt="问天机起卦中"></p>

塔罗、四柱八字、周易、星座、风水、手相与面相，各自都有一套精确的规则体系——即便它们并非科学，规则本身依然严整。LazyOracle 严格地在设备上实现这些规则，然后交由语言模型把结果写成句子。模型只负责叙述，从不负责判断。网页版免费；手机应用一次性收费 0.99 美元，没有订阅，也没有持续开销，因为没有任何东西需要在服务器上计算。

## 它能做什么

- **塔罗** —— 全部 78 张牌，附中英文关键词，三种牌阵，以及带种子的洗牌，因此任何一次抽牌都能凭旁边印出的种子复现。
- **八字（四柱八字）** —— 四柱连同藏干、十神、纳音与大运，以按经度和均时差校正过的真太阳时推算。
- **易经（周易）** —— 铜钱起卦或蓍草揲卦、动爻、之卦，以及 互卦、错卦 与 综卦，并依古法判定究竟由哪一爻或哪一断辞作答。
- **占星（星座）** —— 依天文星历生成的本命盘，整宫制宫位、上升点与中天、带容许度的相位，以及当日行运。
- **风水** —— 八宅派：你的 命卦 与住宅的八个方位，可借手机罗盘定位。
- **手相** —— 在设备上从照片测量手部：五行手型、各指与中指的比例、拇指的张开角度，以及掌中八宫。
- **面相** —— 三停、三庭五眼中的五眼比例、对称度、五行面型，以及 十二宫 中的八宫，全部在设备上测得。
- **答案之书与问题之书** —— 两部原创语料，依你的提问翻到某一页。
- **问天机** —— 一场对话，可以把上面任何一个引擎当作工具调用：它会真的抽牌、真的起卦，而不是告诉你可以怎么做。

## 一次解读是怎样生成的

每一种术数都会产出一组结构化的事实：牌落在哪些牌位、四柱及其生克关系、卦象与动爻。这些事实由普通的、经过测试的代码算出，因此在每台设备、每一次运行中都完全一致。之后才会请模型写成文字，并且以这些事实为唯一依据，同时明确要求不得增添、替换或违背其中任何一条。当没有可用的模型时，应用会自己依据同样的事实拼出解读，所以解读总会出现。

三个来源依次尝试：

| 来源 | 是什么 | 何时启用 |
| --- | --- | --- |
| 已下载的天机模型 | 天机快速版 / Tianji Fast（约 400 MB）或 天机专业版 / Tianji Pro（约 1.1 GB），通过编译为 WebAssembly 的 llama.cpp 在应用内运行 | 只要下载过其中之一 |
| Tianji Cloud（天机云端） | 我们自建的中继，持有服务商密钥，且不保留任何内容 | 仅在设置中开启时；默认关闭 |
| 离线拼写 | 由确定性引擎自行写出解读 | 以上两者都不可用时 |

## 隐私

牌、星盘、卦象与各项测量都在设备上计算。手相与面相所用的照片在内存中完成测量，绝不存储、上传，也绝不与任何数据比对。出生信息只留在该设备浏览器的本地存储中。没有账号，没有分析统计，也没有广告标识符。开启 Tianji Cloud 后，会有一次请求把结构化事实与你的问题送到我们的中继，由它转发给语言模型，并且不留副本；关闭时，没有任何内容离开设备。完整政策见 [oracle.lazying.art/privacy.html](https://oracle.lazying.art/privacy.html)。

## 平台

| 平台 | 实现方式 | 验证方式 |
| --- | --- | --- |
| Web/PWA | React 19、TypeScript、Vite、Workbox | 每种术数的 Chromium 流程、离线预缓存，以及用 `tools/safari-path-test.py` 跑通的 Safari 代码路径 |
| Android | Capacitor 8 | 已签名的 bundle 与 APK，在 API 36 上安装并启动 |
| iOS | Capacitor 8 | 已签名的归档上传至 App Store Connect，通过 TestFlight 分发 |

## 构建与测试

环境要求：Node.js 22+ 与 npm；Android 端需装有 JDK 21 的 Android Studio；Apple 端需 Xcode。

```bash
npm install
npm run dev     # the PWA at http://localhost:5173
npm run check   # lint, 66 tests, production build
```

另有两项浏览器检查，针对构建好的 `dist/` 运行，使用 Playwright 的 Chromium：

```bash
python3 tools/safari-path-test.py   # on-device models still load on Safari and iOS
python3 tools/agent-chat-test.py    # the chat really runs the engines it claims to
```

## 仓库结构

- `src/engines/` —— 每种术数一个目录，纯函数，附带测试，不含界面代码。
- `src/lib/` —— 解读流水线、模型来源、智能体的工具，以及保存的对话。
- `src/components/` —— 每种术数一个界面，另有聊天与设置。
- `ops/` —— Tianji Cloud 中继，零依赖的 Python，附 systemd 单元文件。
- `store/` —— 应用商店元数据、隐私声明、截图与发布状态。
- `tools/` —— 发布、部署与浏览器验证脚本。
- `docs/` —— 产品说明与进度日志、交接记录与计划。

## 支持

如果这个项目对你有用，一个 star、一个 issue、一份翻译，或一个范围清晰的 pull request，都很有帮助。资金支持用于支付托管费用。

| 捐赠 | PayPal | Stripe |
| --- | --- | --- |
| [LazyingArt Donate](https://chat.lazying.art/donate) | [paypal.me/RongzhouChen](https://paypal.me/RongzhouChen) | [用 Stripe 支持](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

[在 GitHub 上赞助](https://github.com/sponsors/lachlanchen)

## 关于

由 LazyingArt 的 [Lachlan Chen](https://github.com/lachlanchen) 制作。姊妹项目为 [L & N](https://github.com/lachlanchen/L-And-N)，它提供了本应用的外壳与发布流水线。

这里把占卜视为一面供人反省的镜子，而非预言。本应用中的任何内容都不构成医疗、法律或财务建议。

依据 [MIT License](../LICENSE) 发布。
