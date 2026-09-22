[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

![Ảnh bìa LazyOracle](../docs/images/banner.svg)

# LazyOracle

**Tám môn bói toán, tính ngay trên thiết bị của bạn và giải thích bằng lời lẽ giản dị.**

[Mở ứng dụng web](https://oracle.lazying.art) · [Bản dự phòng](https://oracle-fast.lazying.art) · [Bản beta TestFlight](https://testflight.apple.com/join/JZJM3PFb) · [Thử nghiệm nội bộ trên Google Play](https://play.google.com/apps/internaltest/4701677916092886102) · [Quyền riêng tư](https://oracle.lazying.art/privacy.html) · [Hỗ trợ](https://oracle.lazying.art/support.html)

<p align="center"><img src="../docs/screenshots/home-practices.png" width="30%" alt="Tám môn bói toán"> <img src="../docs/screenshots/tarot-three-model-reading.png" width="30%" alt="Một quẻ bài ba lá"> <img src="../docs/screenshots/chat-agent.png" width="30%" alt="Ask Tianji đang gieo một quẻ"></p>

Tarot, Bát Tự, Kinh Dịch, chiêm tinh, phong thủy, xem chỉ tay và xem tướng mặt đều dựa trên một hệ quy tắc chặt chẽ, ngay cả ở những chỗ chúng không phải là khoa học. LazyOracle thực thi đúng từng quy tắc ấy, ngay trên thiết bị, rồi mới để một mô hình ngôn ngữ diễn đạt kết quả thành câu chữ. Mô hình chỉ kể lại; nó không bao giờ quyết định. Ứng dụng web miễn phí. Ứng dụng điện thoại trả một lần 0,99 US$, không thuê bao và không chi phí duy trì, bởi chẳng có gì phải tính trên máy chủ.

## Ứng dụng làm được gì

- **Tarot** — đủ 78 lá bài kèm từ khóa tiếng Anh và tiếng Trung, ba kiểu trải bài và một phép xáo bài theo hạt giống, nên có thể dựng lại y nguyên một lần rút từ hạt giống in ngay bên cạnh.
- **Bát Tự (四柱八字)** — tứ trụ cùng tàng can, thập thần, nạp âm và các vận hạn, tính từ giờ mặt trời thật đã hiệu chỉnh theo kinh độ và phương trình thời gian.
- **Kinh Dịch (周易)** — gieo bằng đồng xu hoặc cỏ thi, hào động, quẻ biến, cùng 互卦 (quẻ hỗ), 错卦 (quẻ đối) và 综卦 (quẻ tổng), kèm quy tắc cổ điển về việc hào nào hay lời đoán nào mới thật sự trả lời câu hỏi.
- **Chiêm tinh (星座)** — lá số sinh dựng từ lịch thiên văn, hệ nhà nguyên cung, cung mọc và thiên đỉnh, các góc chiếu kèm sai số, và các chuyển dịch hôm nay.
- **Phong thủy (风水)** — Bát Trạch: 命卦 (quẻ mệnh) của bạn và tám hướng của ngôi nhà, dùng la bàn của điện thoại để xác định.
- **Xem chỉ tay (手相)** — bàn tay được đo ngay trên thiết bị từ một tấm ảnh: dạng bàn tay theo ngũ hành, từng ngón so với ngón giữa, góc mở của ngón cái, và tám cung trong lòng bàn tay.
- **Xem tướng mặt (面相)** — 三停 (ba phần của khuôn mặt), tỷ lệ năm mắt, độ cân xứng, kiểu mặt theo ngũ hành, và tám trong số 十二宫 (mười hai cung), tất cả đều đo trên thiết bị.
- **Sách Giải Đáp và Sách Câu Hỏi** — hai tuyển tập nguyên bản, mở ra ở trang mà chính câu hỏi của bạn chọn.
- **Ask Tianji (问天机)** — một cuộc trò chuyện có thể gọi bất kỳ bộ máy nào ở trên như một công cụ: nó rút bài thật và gieo quẻ thật, thay vì chỉ mô tả những gì bạn có thể làm.

## Một lời luận giải được tạo ra thế nào

Mỗi môn đều cho ra một tập dữ kiện có cấu trúc: các lá bài đã rút ở từng vị trí, các trụ và quan hệ giữa chúng, quẻ cùng các hào động của nó. Những dữ kiện ấy do mã nguồn bình thường, đã được kiểm thử tính ra, nên chúng giống hệt nhau trên mọi thiết bị và trong mọi lần chạy. Chỉ đến lúc đó mô hình mới được yêu cầu viết lời văn, với những dữ kiện ấy là nguồn duy nhất và với chỉ dẫn không được thêm, thay hay mâu thuẫn với bất kỳ dữ kiện nào. Khi không có mô hình nào khả dụng, ứng dụng tự soạn lời luận giải từ chính những dữ kiện đó, nên lúc nào cũng có một lời luận giải hiện ra.

Ba nguồn được thử lần lượt theo thứ tự:

| Nguồn | Đó là gì | Khi nào chạy |
| --- | --- | --- |
| Một mô hình Tianji đã tải về | 天机快速版 / Tianji Fast (khoảng 400 MB) hoặc 天机专业版 / Tianji Pro (khoảng 1,1 GB), chạy ngay trong ứng dụng nhờ llama.cpp biên dịch sang WebAssembly | Bất cứ khi nào đã tải về một mô hình |
| Tianji Cloud (天机云端) | Máy chủ chuyển tiếp của chúng tôi, nơi giữ khóa nhà cung cấp và không lưu lại gì cả | Chỉ khi được bật trong Cài đặt; mặc định là tắt |
| Bản soạn ngoại tuyến | Bộ máy tất định tự viết lấy lời luận giải | Bất cứ khi nào không có hai nguồn trên |

## Quyền riêng tư

Bài, lá số, quẻ và các phép đo đều được tính trên thiết bị. Ảnh dùng để xem chỉ tay và xem tướng mặt chỉ được đo trong bộ nhớ, không bao giờ bị lưu, tải lên hay đối chiếu với bất cứ thứ gì. Thông tin ngày sinh nằm lại trong bộ nhớ cục bộ của trình duyệt, ngay trên thiết bị đó. Không có tài khoản, không có phân tích hành vi, không có mã định danh quảng cáo. Khi bật Tianji Cloud, một yêu cầu duy nhất mang các dữ kiện có cấu trúc và câu hỏi của bạn tới máy chủ chuyển tiếp của chúng tôi; nó chuyển tiếp sang một mô hình ngôn ngữ và không giữ lại bản sao nào. Khi tắt, không gì rời khỏi thiết bị cả. Chính sách đầy đủ có tại [oracle.lazying.art/privacy.html](https://oracle.lazying.art/privacy.html).

## Nền tảng

| Nền tảng | Cách hiện thực | Cách kiểm chứng |
| --- | --- | --- |
| Web/PWA | React 19, TypeScript, Vite, Workbox | Chạy luồng Chromium cho từng môn, precache ngoại tuyến, nhánh mã dành cho Safari được thử bằng `tools/safari-path-test.py` |
| Android | Capacitor 8 | Bundle và APK đã ký, cài đặt và chạy thử trên API 36 |
| iOS | Capacitor 8 | Bản lưu trữ đã ký, tải lên App Store Connect và phát hành qua TestFlight |

## Dựng và kiểm thử

Yêu cầu: Node.js 22+ và npm; Android Studio kèm JDK 21 cho Android; Xcode cho các nền tảng Apple.

```bash
npm install
npm run dev     # PWA tại http://localhost:5173
npm run check   # lint, 66 bài kiểm thử, bản dựng production
```

Hai phép kiểm tra trên trình duyệt chạy với thư mục `dist/` đã dựng, dùng Chromium của Playwright:

```bash
python3 tools/safari-path-test.py   # các mô hình chạy trên thiết bị vẫn nạp được trên Safari và iOS
python3 tools/agent-chat-test.py    # cuộc trò chuyện thật sự gọi đúng những bộ máy mà nó nói
```

## Bố cục kho mã

- `src/engines/` — mỗi môn một thư mục, hàm thuần kèm bài kiểm thử, không có mã giao diện.
- `src/lib/` — dây chuyền tạo lời luận giải, các nguồn mô hình, bộ công cụ của tác nhân và các cuộc trò chuyện đã lưu.
- `src/components/` — mỗi môn một màn hình, cùng với phần trò chuyện và cài đặt.
- `ops/` — máy chủ chuyển tiếp Tianji Cloud, viết bằng Python không phụ thuộc thư viện ngoài, kèm unit systemd.
- `store/` — dữ liệu mô tả cho các chợ ứng dụng, khai báo quyền riêng tư, ảnh chụp màn hình và tình trạng phát hành.
- `tools/` — các kịch bản phát hành, triển khai và kiểm chứng trên trình duyệt.
- `docs/` — bản tóm tắt sản phẩm và nhật ký tiến độ, ghi chú bàn giao và kế hoạch.

## Ủng hộ

Nếu dự án này hữu ích, một ngôi sao, một issue, một bản dịch hay một pull request được khoanh vùng cẩn thận đều giúp ích. Ủng hộ tài chính dùng để trả phí lưu trữ.

| Quyên góp | PayPal | Stripe |
| --- | --- | --- |
| [LazyingArt Donate](https://chat.lazying.art/donate) | [paypal.me/RongzhouChen](https://paypal.me/RongzhouChen) | [Ủng hộ qua Stripe](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

[Tài trợ trên GitHub](https://github.com/sponsors/lachlanchen)

## Giới thiệu

Thực hiện bởi [Lachlan Chen](https://github.com/lachlanchen) tại LazyingArt. Dự án anh em với [L & N](https://github.com/lachlanchen/L-And-N), nơi cung cấp khung ứng dụng và dây chuyền phát hành.

Ở đây, bói toán được xem như một tấm gương để soi lại mình, không phải một lời tiên đoán. Không có nội dung nào trong ứng dụng này là lời khuyên y tế, pháp lý hay tài chính.

Phát hành theo [Giấy phép MIT](../LICENSE).
