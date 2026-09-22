[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://lazying.art)

![LazyOracle banner](../docs/images/banner.svg)

# LazyOracle

**여덟 가지 점술을 내 기기에서 직접 계산하고, 쉬운 말로 풀어 설명합니다.**

[웹 앱 열기](https://oracle.lazying.art) · [미러](https://oracle-fast.lazying.art) · [TestFlight 베타](https://testflight.apple.com/join/JZJM3PFb) · [Google Play 내부 테스트](https://play.google.com/apps/internaltest/4701677916092886102) · [개인정보 처리방침](https://oracle.lazying.art/privacy.html) · [지원](https://oracle.lazying.art/support.html)

<p align="center"><img src="../docs/screenshots/home-practices.png" width="30%" alt="여덟 가지 점술"> <img src="../docs/screenshots/tarot-three-model-reading.png" width="30%" alt="카드 세 장 리딩"> <img src="../docs/screenshots/chat-agent.png" width="30%" alt="问天机가 괘를 뽑는 모습"></p>

타로, 四柱八字(사주팔자), 周易(주역), 星座(서양 점성술), 风水(풍수), 手相(손금), 面相(관상)은 과학은 아닐지라도 저마다 정밀한 규칙 체계 위에 서 있습니다. LazyOracle은 그 규칙을 기기 안에서 그대로 구현한 뒤, 결과를 문장으로 옮기는 일만 언어 모델에 맡깁니다. 모델은 서술할 뿐, 결코 판단하지 않습니다. 웹 앱은 무료입니다. 휴대폰 앱은 한 번만 내는 0.99달러이며, 구독도 없고 유지 비용도 없습니다. 서버에서 계산할 것이 하나도 없기 때문입니다.

## 무엇을 하는가

- **타로** — 78장 전부를 영어와 중국어 키워드와 함께 수록했습니다. 세 가지 스프레드와 시드 기반 셔플을 지원하므로, 옆에 표시된 시드만 있으면 같은 뽑기를 그대로 재현할 수 있습니다.
- **사주(四柱八字)** — 경도와 균시차로 보정한 진태양시에서 뽑은 네 기둥에 지장간, 십신, 납음, 대운까지.
- **주역(周易)** — 동전점 또는 시초점, 동효, 지괘, 그리고 互卦(호괘, 안쪽 효로 다시 세운 괘) · 错卦(착괘, 모든 효를 뒤집은 괘) · 综卦(종괘, 위아래를 뒤집은 괘). 어느 효 또는 어느 괘사가 실제 답이 되는지는 고전의 원칙대로 가립니다.
- **점성술(星座)** — 천문 역표로 세운 출생 차트, 홀사인 하우스, 상승점과 중천점, 오브를 적용한 각, 그리고 오늘의 트랜싯.
- **风水(풍수)** — 팔택풍수: 당신의 命卦(명괘, 본명괘)와 집의 여덟 방위를, 휴대폰 나침반으로 찾아가며.
- **手相(손금)** — 사진에서 기기 안으로 손을 측정합니다. 오행에 따른 손 모양, 가운뎃손가락을 기준으로 한 각 손가락의 길이, 엄지의 벌어진 각도, 그리고 손바닥의 여덟 궁.
- **面相(관상)** — 三停(삼정, 얼굴을 상·중·하로 나눈 세 구획), 오안 비율, 대칭성, 오행에 따른 얼굴 유형, 그리고 十二宫(십이궁) 가운데 여덟 궁을 모두 기기에서 측정합니다.
- **답의 책과 물음의 책** — 직접 쓴 두 권의 문장 모음을, 당신의 질문이 고른 쪽에서 펼칩니다.
- **问天机(문천기, 천기에 묻다)** — 위의 어떤 엔진이든 도구로 불러 쓰는 대화입니다. 무엇을 할 수 있는지 설명하는 대신, 실제로 카드를 뽑고 실제로 괘를 세웁니다.

## 하나의 풀이가 만들어지는 과정

모든 점술은 구조화된 사실의 묶음을 내놓습니다. 어느 자리에 어떤 카드가 놓였는지, 네 기둥과 그 관계는 어떠한지, 괘와 동효는 무엇인지 같은 것들입니다. 이 사실들은 평범하고 검증된 코드로 계산되므로 어느 기기에서든, 몇 번을 돌리든 똑같습니다. 모델에게 문장을 청하는 것은 그다음이며, 이때 이 사실들만을 유일한 근거로 삼고 무엇도 덧붙이거나 바꾸거나 거스르지 말라는 지시가 함께 주어집니다. 쓸 수 있는 모델이 없을 때는 앱이 같은 사실로 직접 풀이를 엮어 내므로, 풀이는 언제나 나옵니다.

세 가지 공급원을 차례로 시도합니다.

| 공급원 | 무엇인가 | 언제 쓰이는가 |
| --- | --- | --- |
| 내려받은 천기 모델 | 天机快速版(천기 빠른 버전) / Tianji Fast(약 400 MB) 또는 天机专业版(천기 전문가 버전) / Tianji Pro(약 1.1 GB). WebAssembly로 컴파일한 llama.cpp를 통해 앱 안에서 돕니다 | 둘 중 하나를 내려받아 두었을 때 |
| Tianji Cloud(天机云端, 천기 클라우드) | 공급자 키를 보관하고 아무것도 남기지 않는 자체 중계 서버 | 설정에서 켠 경우에만. 기본값은 꺼짐 |
| 오프라인 작성 | 결정론적 엔진이 풀이를 직접 씁니다 | 위의 둘 다 쓸 수 없을 때 |

## 개인정보

카드, 차트, 괘, 각종 측정값은 모두 기기에서 계산됩니다. 손금과 관상에 쓰이는 사진은 메모리 안에서 측정될 뿐 저장되거나 업로드되지 않으며, 무엇과도 대조되지 않습니다. 생년월일 등의 정보는 그 기기 브라우저의 로컬 저장소에 머뭅니다. 계정도, 분석 도구도, 광고 식별자도 없습니다. Tianji Cloud를 켜면 구조화된 사실과 당신의 질문을 담은 요청 하나가 저희 중계 서버로 가고, 중계 서버는 그것을 언어 모델에 전달한 뒤 사본을 남기지 않습니다. 꺼 두면 기기를 떠나는 것은 아무것도 없습니다. 전문은 [oracle.lazying.art/privacy.html](https://oracle.lazying.art/privacy.html)에 있습니다.

## 플랫폼

| 플랫폼 | 구현 | 검증 |
| --- | --- | --- |
| Web/PWA | React 19, TypeScript, Vite, Workbox | 모든 점술에 대한 Chromium 시나리오, 오프라인 프리캐시, `tools/safari-path-test.py`로 실행해 본 Safari 코드 경로 |
| Android | Capacitor 8 | 서명된 번들과 APK를 API 36에서 설치하고 실행 |
| iOS | Capacitor 8 | 서명된 아카이브를 App Store Connect에 업로드하고 TestFlight으로 배포 |

## 빌드와 테스트

준비물: Node.js 22 이상과 npm, Android에는 JDK 21이 설치된 Android Studio, Apple 타깃에는 Xcode.

```bash
npm install
npm run dev     # the PWA at http://localhost:5173
npm run check   # lint, 66 tests, production build
```

빌드된 `dist/`를 대상으로 Playwright의 Chromium을 써서 브라우저 점검 두 가지를 돌립니다.

```bash
python3 tools/safari-path-test.py   # on-device models still load on Safari and iOS
python3 tools/agent-chat-test.py    # the chat really runs the engines it claims to
```

## 저장소 구조

- `src/engines/` — 점술마다 폴더 하나. 테스트가 딸린 순수 함수뿐이며 인터페이스 코드는 없습니다.
- `src/lib/` — 풀이 파이프라인, 모델 공급원, 에이전트의 도구, 저장된 대화.
- `src/components/` — 점술마다 화면 하나, 그리고 채팅과 설정.
- `ops/` — Tianji Cloud 중계 서버. 의존성 없는 Python과 systemd 유닛.
- `store/` — 스토어 메타데이터, 개인정보 신고 내용, 스크린샷, 출시 상태.
- `tools/` — 릴리스, 배포, 브라우저 검증 스크립트.
- `docs/` — 제품 개요와 진행 기록, 인수인계 메모와 계획.

## 후원

이 프로젝트가 쓸모 있었다면 스타, 이슈, 번역, 또는 범위를 잘 좁힌 풀 리퀘스트 모두 큰 힘이 됩니다. 금전적 후원은 호스팅 비용에 씁니다.

| 기부 | PayPal | Stripe |
| --- | --- | --- |
| [LazyingArt Donate](https://chat.lazying.art/donate) | [paypal.me/RongzhouChen](https://paypal.me/RongzhouChen) | [Stripe로 후원하기](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

[GitHub에서 후원하기](https://github.com/sponsors/lachlanchen)

## 소개

LazyingArt의 [Lachlan Chen](https://github.com/lachlanchen)이 만들었습니다. 자매 프로젝트인 [L & N](https://github.com/lachlanchen/L-And-N)이 앱 셸과 배포 파이프라인을 제공합니다.

여기서 점술은 예언이 아니라 자신을 비춰 보는 거울로 다룹니다. 이 앱의 어떤 내용도 의료, 법률, 재무 자문이 아닙니다.

[MIT License](../LICENSE)로 배포합니다.
