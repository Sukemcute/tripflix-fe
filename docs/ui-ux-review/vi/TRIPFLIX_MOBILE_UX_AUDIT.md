# Tripflix Mobile — Đánh giá UI/UX và mức độ hấp dẫn với Gen Z

**Ngày:** 2026-11-22 · **Loại:** chỉ đánh giá, không sửa code
**Bản được đánh giá:** `tripflix-fe` nhánh `trang/SCRUM-189-tripflix-stitch-redesign` @ `35de677c` (bản thiết kế lại theo Stitch "Original Explorer", giao diện mobile mới nhất; đã push nhưng **chưa merge** vào `develop`). Bản trên `develop` (giao diện cũ) không được dựng lại trong lần đánh giá này.
**Báo cáo đi kèm:** [VISUAL_DESIGN_CRITIQUE.md](VISUAL_DESIGN_CRITIQUE.md) · [UX_IMPROVEMENT_ROADMAP.md](UX_IMPROVEMENT_ROADMAP.md) · [GEN_Z_VALIDATION_PLAN.md](GEN_Z_VALIDATION_PLAN.md)
**Thư mục bằng chứng (nằm ngoài repo, theo RULES §7):** `VSF/outputs/mobile-ux-audit-2026-11-22/` — `screens/` (ảnh PNG + chữ hiển thị của từng màn), `stitch/` (ảnh Stitch đã thu nhỏ), `scripts/` (script chụp màn). Mã ảnh bên dưới (ví dụ `g06-explore-0`) là tên file trong `screens/`.

---

## 1. Tóm tắt điều hành

Bản thiết kế lại đã đưa Tripflix từ "prototype của sinh viên" tiến gần tới "app tiêu dùng thật": một họ font duy nhất (Be Vietnam Pro), nền warm-mist, coral/teal/vàng nắng dùng có tiết chế, tiêu đề lớn tự tin, và linh vật cuối cùng đã xuất hiện đúng chỗ (onboarding, trạng thái trống, lối vào Tripi). Onboarding và trạng thái trống của màn Đã lưu thực sự tốt.

App **chưa đạt chuẩn ra mắt**, vì bốn lý do:

1. **Lời hứa sản phẩm không phải là cấu trúc của app.** Điểm khác biệt của Tripflix là *video → lộ trình → đặt chỗ*. Còn cấu trúc app lại là *tab video + tab OTA*. "Khám phá" thực chất là trang tìm khách sạn/vé máy bay; lộ trình — cầu nối giữa video và đặt chỗ — chỉ xuất hiện ở mục thứ tư của màn đó, và chạm vào một lộ trình thì app âm thầm chuyển sang tab **Đặt**. Hành trình chính vẫn chạy, nhưng app không tự kể câu chuyện của mình.
2. **Hệ thiết kế mới chỉ được áp dụng một nửa.** Hai thang chữ cùng tồn tại: `explorer.type` mới (body 16, headline 20) được dùng trong **2 file**; `compactType` cũ (body 12, heading 13, label 11) trong **18 file**; bảng màu cũ `colors.*` trong **25 file**. Hệ quả nhìn thấy được: tiêu đề màn 11–13 px nằm cạnh tiêu đề lớn 26–34 px, nhãn tab 10 px, chip 11–12 px, ba kiểu tab/segment khác nhau và ba cách trình bày trạng thái trống khác nhau.
3. **Niềm tin bị phá vỡ ở các màn bán hàng.** Chi tiết khách sạn hiển thị cho người dùng câu *"Khoảng cách địa danh là dữ liệu mẫu, dùng để tham khảo giao diện"*; màn tìm kiếm đẩy người dùng sang *"Mở Web"* để đặt khách sạn; tác giả bình luận hiện thành mảnh UUID (`018d9f00`); ảnh đầu màn đặt lộ trình đặt Tripi đè lên điểm đến trong một màn có giá tiền (brief yêu cầu giữ Tripi tránh xa ngữ cảnh giá và đặt chỗ); thông báo lỗi dùng icon khiên có dấu tích (vốn mang nghĩa tin cậy/thành công).
4. **Trạng thái chưa hoàn thiện.** Màn Phòng & giá hiện ngày rồi để trống; người dùng không tồn tại hiện "Không tìm thấy người dùng này" trong khi tiêu đề vẫn ghi "Đang tải…"; màn trạng thái kiểm duyệt chỉ là chữ thường không có định dạng.

**Người dùng Gen Z có thấy app đẹp, hứng thú, dễ dùng và đáng khám phá không?** Đẹp ở một số chỗ (onboarding, Reels, Đã lưu), hứng thú ở Reels, dễ dùng với Reels và đặt khách sạn, nhưng *gây rối* khi chuyển giữa các tab. Nhận định chuyên môn: hiện tại app giống "một app đặt phòng khá ổn có gắn thêm feed video", chưa phải "nơi video du lịch biến thành chuyến đi của tôi". Khoảng cách đó nằm ở cấu trúc, không phải ở bề mặt — và sửa được.

**Đề xuất ưu tiên thiết kế lại đầu tiên:** kiến trúc thông tin của thanh tab + màn Khám phá + bước chuyển từ Reels sang lộ trình, sau đó hoàn tất chuyển đổi chữ/màu trên toàn bộ các màn.

---

## 2. Phương pháp, phạm vi và bằng chứng

### 2.1 Khảo sát
- **Framework:** Expo SDK 58, Expo Router (typed routes), React Native 0.88, react-native-web 0.21, Reanimated 4, expo-video. 38 route trong `apps/mobile/src/app`.
- **Tab** (`(tabs)/_layout.tsx`): Reels · Khám phá · Tạo (hành động → `/create`) · Đặt · Tôi; `inbox` bị ẩn; badge thông báo chưa đọc gắn vào **Khám phá**.
- **Hệ thiết kế:** `@tripflix/tokens` `explorer` v2 (bề mặt Ngày/Đêm, vai trò chữ, khoảng cách, bo góc, độ nổi, chuyển động) song song với bảng màu cũ; thành phần cơ bản trong `components/mobile-ui.tsx`; thang chữ thu gọn trong `components/mobile-scale.ts`.
- **Tài sản thương hiệu:** `apps/mobile/assets/brand/` (logo, biểu tượng, các tư thế Tripi, Be Vietnam Pro). Brief: `tripflix-ui-design/STITCH-MOBILE-BRIEF.md`.
- **Stitch:** dự án *Tripflix Vietnam Travel App* (`17566515177619492500`), đọc qua Stitch MCP ngày 2026-11-22 — 10 thiết kế mobile; bản xuất cục bộ ở `tripflix-fe/docs/ui-redesign/stitch/`.

### 2.2 Kỹ năng thiết kế
Các skill được nêu trong yêu cầu (UI/UX Pro Max, Frontend Design, Mobile App Design, Accessibility, UX Research) **không được cài trong phiên này**; không skill nào được dùng. Stitch MCP *có* sẵn và đã được dùng. Phân tích áp dụng heuristic của Nielsen, Gestalt, định luật Hick/Fitts, lý thuyết tải nhận thức, WCAG 2.2, Apple HIG và Material 3 như công cụ phân tích.

### 2.3 Cách dựng giao diện (không sửa app hay backend)
- Chạy Expo web dev server từ nhánh được đánh giá, Chrome qua Playwright, **khung 390 × 844, cảm ứng, `isMobile`**, locale vi-VN, backend cục bộ (Docker: core-api, ai-service, notification-service, Postgres) với dữ liệu seed.
- Danh sách origin được phép của backend cục bộ không có địa chỉ Expo web, và bước đăng nhập qua phong bì mật khẩu không hoàn tất trong môi trường này; vì vậy script chụp màn chuyển tiếp các lệnh gọi API và đăng nhập tài khoản seed `member@tripflix.local` ở tầng mạng. Đây là cách xử lý môi trường, không ảnh hưởng đến những gì giao diện hiển thị.
- **Giới hạn của việc dựng trên web:** react-native-web không phải iOS/Android. Cử chỉ native, rung phản hồi, safe area, bàn phím, hiệu năng phát video, nút back Android, đầu ra trình đọc màn hình (TalkBack/VoiceOver) và cỡ chữ động **chưa được kiểm chứng**. Thông báo "BackHandler is not supported on web" trong `i01` chỉ có trên web và không được tính.
- **Giới hạn dữ liệu:** ảnh khách sạn seed trả về HTTP 403 từ CDN (file không tồn tại tại `dev/trang/images/hotels/…`), nên mọi thẻ khách sạn đều hiện ảnh dự phòng "Ảnh chưa tải được". **Ảnh khách sạn thật Chưa được kiểm chứng bằng hình**; chỉ trạng thái dự phòng được kiểm chứng. Tác giả seed không có tên hiển thị.

### 2.4 Mức độ bao phủ

| Trạng thái | Màn hình |
|---|---|
| **Đã kiểm chứng bằng hình** (25 trạng thái) | Onboarding chào mừng, onboarding bước 1; Reels (khách, đã đăng nhập), sheet bình luận, sheet lộ trình, sheet Tripi, tùy chọn bài viết; Khám phá (4 vị trí cuộn, ô điểm đến); Tìm kiếm (trống, có kết quả); Đặt; Đặt lộ trình (phần đầu); Chi tiết khách sạn; Phòng & giá (trống); Form tìm vé máy bay; Tự lên lộ trình; Đăng nhập (trống, lỗi); Tôi (khách, đã đăng nhập); Đã lưu (trống); Chuyến đi của tôi (trống); Thông báo; Tạo bài (bước 1); Cài đặt; Giỏ (trống); Lộ trình đã lưu (trống); Trạng thái kiểm duyệt; Trang tác giả (không tìm thấy) |
| **Kiểm chứng một phần** | Onboarding bước 2 (chưa tới được); các bước sau của Tạo bài; phần dưới màn Đặt lộ trình (không bắt được thanh cuộn bên trong); Phòng (không có dữ liệu phòng) |
| **Chưa kiểm chứng bằng hình** | Thanh toán, kết quả VNPay, Thành công, Chi tiết đơn `/booking/[id]`, Tùy chỉnh, Kết quả vé máy bay, Chi tiết lộ trình đã lưu, Cài đặt tài khoản (bị chuyển về Tôi), Đã lưu/Chuyến đi/Giỏ có dữ liệu, Trang cá nhân công khai có dữ liệu, Đăng nhập Google, Phát video Reels (chỉ thấy ảnh bìa), mọi hành vi chỉ có trên native |

---

## 3. Ấn tượng tổng thể về sản phẩm

**5–10 giây đầu tiên (giả thuyết chuyên môn, chưa đo):** bộ ảnh ghép ở onboarding (Hạ Long + biển + Tripi cầm bản đồ) lập tức gợi "du lịch, trẻ, thân thiện" và là ấn tượng đầu tiên tốt nhất trong app. Người dùng quay lại thì vào thẳng Reels toàn màn hình — hiện đại nhưng chung chung (có thể là bất kỳ app video ngắn nào cho tới khi nhận ra "Xem lộ trình"). Chuyển sang Khám phá thì tông thay đổi hẳn: nền ấm, thẻ form trắng, lối tắt kiểu OTA, các hàng thẻ khách sạn — một app đặt phòng.

**App giống ba sản phẩm dùng chung một thanh tab:** một app video tối (Reels + thanh tab đen), một app đặt chỗ tông ấm (Khám phá/Đặt/Khách sạn/Vé máy bay) và một app chat nền trắng (Tripi). Từng phần đều chấp nhận được; chỗ nối giữa chúng là nơi app mất đi độ chỉn chu.

---

## 4. Đánh giá A — Giám đốc thiết kế hình ảnh (tóm tắt)

Phân tích đầy đủ trong [VISUAL_DESIGN_CRITIQUE.md](VISUAL_DESIGN_CRITIQUE.md).

**Điểm mạnh**
- Bảng màu nhất quán: nền warm-mist `#FFF7F2`, coral dành riêng cho hành động chính, teal cho lựa chọn/thông tin, vàng nắng cho điểm đánh giá và điểm nhấn Đã lưu. Màu sắc không còn "la hét".
- Chữ tiêu đề lớn có cá tính ở những chỗ áp dụng v2: "Chuyến đi, theo gu của bạn." (g01), "Hôm nay vi vu đâu ta?" (g06), "Để dành một chuyến đi." (a04) — tự tin, ấm áp, như nói chuyện.
- Tripi được dùng đúng vai trò cảm xúc ở onboarding, thẻ đầu tab Đặt, trạng thái trống của Đã lưu/Chuyến đi và lối vào Tripi trên Reels.
- Thẻ lộ trình trên Khám phá (g06-3) là thành phần "đậm chất Tripflix" nhất: ảnh bìa của creator gần tỉ lệ 9:16, nhãn số ngày, điểm đến + icon phương tiện.

**Điểm yếu**
- **Thang chữ sụp đổ:** tiêu đề màn 11–13 px ("Tìm kiếm", "Chuyến đi của tôi", "Cài đặt") nằm trên H1 26–34 px, tạo thành hai tiêu đề không có bậc trung gian (a05, a08).
- **Thanh tab tối trên màn sáng:** thanh đen đặc dưới các màn Khám phá/Đặt/Tôi nền ấm là đường nối dễ thấy nhất.
- **Ba kiểu segment:** chip viên thuốc (Tìm kiếm), hình chữ nhật bo góc nền ấm (Chuyến đi của tôi), khối teal đặc + chữ trơn (Tôi "Video / Bài viết / Đang kiểm tra" — còn bị xuống dòng).
- **Màn thiết kế sơ sài:** Trạng thái kiểm duyệt (a13), Giỏ trống (a10), Phòng (d06), Thông báo (a06).
- **Nút chính bị vô hiệu** màu coral nhạt/be với chữ trắng (g02, g06, g07, g13, g14) trông như bị hỏng chứ không phải "chưa dùng được".
- **Lạm dụng linh vật ở một chỗ:** ảnh đầu màn đặt lộ trình (d01) đặt Tripi lớn đè lên ảnh điểm đến — đáng lẽ điểm đến mới là thứ "bán" chuyến đi.

**Độ hấp dẫn thị giác (chuyên gia):** trung bình 6,8/10 trên các màn đã kiểm chứng; cao nhất 7,5 (onboarding, Reels, Đã lưu), thấp nhất 4–5 (trạng thái kiểm duyệt, giỏ trống, phòng).

---

## 5. Đánh giá B — Nhà thiết kế UX & sản phẩm (tóm tắt)

### 5.1 Kiến trúc thông tin
| Vấn đề | Bằng chứng | Mức độ |
|---|---|---|
| "Khám phá" là trang tìm khách sạn/vé máy bay, không phải khám phá; lộ trình nằm ở mục 4 trên 5 | g06-0…3 | P1 |
| "Đặt" chồng chéo với Khám phá (cả hai đều để bắt đầu chuyến đi/đặt chỗ) và chứa màn đặt lộ trình; chạm thẻ lộ trình ở Khám phá làm tab đang chọn chuyển sang Đặt | g07, d01 (URL `/book`, Đặt được tô sáng) | P1 |
| Badge thông báo chưa đọc "9+" nằm trên **Khám phá**, nơi không có thông báo nào; chuông nằm ở thanh tiêu đề các màn | thanh tab ở a02, a03 | P1 |
| Kết quả tìm kiếm đẩy việc đặt khách sạn sang "Mở Web" (website) thay vì kết quả trong app | d05 | P1 |
| "Tự lên lộ trình" ở tab Đặt; "Nhờ Tripi lên lộ trình" ở Đặt, Khám phá, Reels và Tripi — bốn lối vào cho một việc, không có nơi cố định | g07, g06-2, a03, g11 | P2 |

### 5.2 Điều hướng
- Tab trên cùng của Reels (Dành cho bạn / Đang hot / Đang theo dõi) cao 32 px, chữ 12 px — dưới mức 44/48 px khuyến nghị (đã đo).
- Mất ngữ cảnh: Khám phá → lộ trình thì nhảy tab; nút Back từ lộ trình quay về theo stack của Đặt, không về vị trí cuộn ở Khám phá (chưa kiểm chứng trên native — đánh dấu để test trên thiết bị).
- Cài đặt chỉ vào được qua bánh răng ở Tôi (khi đã đăng nhập); Thông báo qua chuông xuất hiện ở tiêu đề một số màn (Khám phá, Tìm kiếm, Chuyến đi của tôi) nhưng không có ở màn khác (Tôi, Đặt).

### 5.3 Tương tác & phản hồi
- Tốt: bottom sheet cho bình luận, lộ trình, Tripi và tùy chọn bài viết giữ Reels trong ngữ cảnh; giá + CTA dính đáy ở chi tiết khách sạn và đặt lộ trình; lỗi đăng nhập hiển thị rõ ngay tại form (a01).
- Yếu: nút bị vô hiệu không giải thích lý do (onboarding không nói gì cho tới khi chọn; "Tìm chỗ ở" ở Khám phá bị vô hiệu mà không gợi ý cần nhập điểm đến — chỉ placeholder mang gợi ý đó).
- Thiếu trạng thái: Phòng không hiện gì dưới dải ngày; trang tác giả hiện "không tìm thấy" trong khi tiêu đề vẫn "Đang tải…"; banner lỗi dùng icon khiên có dấu tích (đọc thành "đã xác thực/an toàn").

### 5.4 Tải nhận thức
- Tìm kiếm có hai hàng chip trông giống hệt nhau (loại nội dung và sắp xếp), thêm một carousel khách sạn, một chip diễn giải "Đã hiểu", một thẻ quảng bá web — năm lớp trước khi tới kết quả.
- Thông báo liệt kê bốn thẻ gần như giống hệt ("Kiểm duyệt viên đã trả lời bình luận" + cùng một trích dẫn) mà không gộp nhóm; tiêu đề lặp lại nội dung.
- Khám phá xếp chồng ba hàng khách sạn cuộn ngang (Ưu đãi hôm nay, Cuối tuần này, Được đánh giá cao) trông y hệt nhau.

### 5.5 Công thái học mobile
- Thanh tab đáy và CTA dính đáy nằm trong vùng ngón cái — tốt. CTA chính cao 52 px, toàn chiều ngang.
- Nút back trên-trái và hành động trên-phải theo chuẩn nhưng tiêu đề nhỏ; icon tìm kiếm trên-phải ở Reels nằm ở vùng khó với (chấp nhận được, đúng chuẩn nền tảng).
- Chip lọc lộ trình ở Khám phá: chữ 11 px, cao khoảng 26 px (g06-2).

### 5.6 Phát hiện về khả năng tiếp cận
| Phát hiện | Bằng chứng | WCAG | Mức độ |
|---|---|---|---|
| Chữ trắng trên nút coral `#FF5A3C` ≈ **3,1:1** (`explorer.action.onPrimary = #FFFFFF`). **Quyết định của chủ sản phẩm, giữ nguyên.** Đạt ngưỡng AA cho chữ lớn (đậm ≥ 18,7 px); chỉ dùng chữ trắng trên coral cho nhãn nút đậm, không dùng cho chữ nhỏ. | g01, a04, d02 | 1.4.3 ngưỡng chữ lớn 3:1 | Đã chấp nhận (quyết định chủ sản phẩm) |
| CTA bị vô hiệu: trắng trên coral nhạt ≈ 1,6–1,9:1 — gần như không đọc được; chỉ ổn nếu control cũng báo `disabled` cho công nghệ hỗ trợ | g02, g06, g07 | 1.4.3 miễn trừ với control vô hiệu, nhưng độ đọc kém | P2 |
| Chữ dưới 12 px: nhãn tab 10 px, chip Khám phá 11 px, tiêu đề màn 11 px (Chuyến đi của tôi), số đếm 12 px trên video | lượt đo | 1.4.4 rủi ro khi phóng chữ | P1 |
| Vùng chạm < 44 px: tab trên Reels 32 px, nút "Xem lộ trình" 30 px, dòng tác giả 26 px | lượt đo | 2.5.8 (đạt mức tối thiểu 24 px AA; chưa đạt 44 px HIG/48 dp MD) | P2 |
| Thông báo lỗi dùng icon thành công/tin cậy (khiên có dấu tích) — ý nghĩa icon mâu thuẫn với chữ | g12, a10, i06 | 1.3.1/khả dụng | P2 |
| Reduce Motion được xử lý ở 34 chỗ; giới hạn cỡ chữ động (`maxFontSizeMultiplier`) chỉ ở 3 chỗ — chữ lớn chưa kiểm chứng | quét code | 1.4.4 | Chưa kiểm chứng |
| 359 chỗ dùng `accessibilityRole/Label`; đầu ra trình đọc màn hình chưa kiểm chứng trên thiết bị | quét code | — | Chưa kiểm chứng |

---

## 6. Đánh giá mức độ hấp dẫn với Gen Z

Nhãn: **[Q]** quan sát trên giao diện · **[N]** nhận định chuyên môn · **[G]** giả thuyết cần test với người dùng.

| Khía cạnh | Đánh giá |
|---|---|
| Sức hút thị giác | **[Q]** Onboarding, Reels và Đã lưu trông hiện đại. **[N]** Khám phá/Đặt/Cài đặt trông như một OTA gọn gàng, chưa phải thương hiệu dành cho giới trẻ. **[G]** Người dùng Gen Z sẽ chấm Khám phá thấp hơn Reels ở tiêu chí "được làm cho mình". |
| Khám phá | **[Q]** Reels → "Xem lộ trình" → sheet theo từng ngày với "Đặt lộ trình này" là vòng khám phá mạnh nhất trong app. **[N]** Ngoài Reels, việc khám phá bắt đầu bằng form ("Bạn muốn ở đâu?") — giả định người dùng đã biết mình muốn đi đâu, trái với lời hứa "Thấy là thích". |
| Xem nội dung | **[Q]** Video 9:16 tràn màn, thanh hành động bên phải, caption + "Xem thêm", nút lộ trình. **[N]** Chuẩn mực và làm tốt; nút lộ trình là thành phần duy nhất mang dấu ấn Tripflix nhưng lại yếu nhất về thị giác trên màn hình (viên thuốc trắng, cao 30 px). |
| Thể hiện xã hội | **[Q]** Có thích/bình luận/lưu/chia sẻ; sheet bình luận hoạt động. **[Q]** Tác giả bình luận hiện thành `018d9f00`, tác giả reel thành "Tác giả" (dữ liệu seed thiếu tên, nhưng phương án dự phòng làm lộ ID). **[N]** Bằng chứng xã hội không có gương mặt/tên thì thấy trống trải. |
| Kết nối cảm xúc | **[Q]** Giọng của Tripi ("Chuyến đi tiếp theo, mình cùng lên nhé?", "Gặp chuyến hay, lưu lại nhé.") ấm áp và tự nhiên. **[N]** Cảm xúc tụt mạnh ở các màn bán hàng — đúng nơi cần kết hợp niềm tin và hứng khởi. |
| Cá tính | **[N]** Lời văn vui tươi mà không trẻ con. Cá tính hình ảnh gần như chỉ do linh vật gánh; bản thân các thành phần giao diện thì trung tính. Slogan được dùng làm phần giới thiệu trên hồ sơ người dùng (a02) trông như chữ lấp chỗ. |
| Lý do quay lại (chỉ tính tính năng có sẵn) | **[Q]** Đã lưu, Lộ trình đã lưu, Chuyến đi của tôi, thông báo, tab Đang theo dõi. **[Q]** "Thư mục — Sắp có" là chip chết ở Đã lưu. **[G]** Không có xem trước nội dung đã lưu hay tiến độ lên kế hoạch chuyến đi, lý do quay lại chủ yếu chỉ là feed. |

**Kết luận (chuyên gia, chưa kiểm chứng):** Reels và onboarding nhiều khả năng sẽ qua bài test ấn tượng đầu tiên với Gen Z; Khám phá, Đặt và các màn tài khoản nhiều khả năng chưa giúp Tripflix khác biệt với các app kiểu Traveloka/Booking.

---

## 7. Đánh giá và chấm điểm từng màn hình

Điểm là đánh giá chuyên gia, **không phải** kết quả test người dùng. Cột: VA độ hấp dẫn thị giác · VH phân cấp thị giác · BC nhất quán thương hiệu · GZ sức hút Gen Z · NC rõ ràng điều hướng · IU dễ dùng khi tương tác · CP trình bày nội dung · OX trải nghiệm tổng thể.

| # | Màn hình (route) | Bằng chứng | VA | VH | BC | GZ | NC | IU | CP | OX |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Onboarding chào mừng (`/onboarding`) | g01 | 7,5 | 8 | 8,5 | 7,5 | 8 | 7,5 | 7 | **7,5** |
| 2 | Onboarding bước 1 | g02 | 7 | 7 | 7,5 | 7 | 7,5 | 6,5 | 6,5 | **7** |
| 3 | Reels (`/`) | r01, a03 | 7,5 | 7 | 6,5 | 7,5 | 6,5 | 7 | 7 | **7** |
| 4 | Reels → sheet lộ trình | i02 | 7 | 6,5 | 7 | 6,5 | 7,5 | 7 | 7,5 | **7** |
| 5 | Reels → sheet bình luận | i01 | 6,5 | 7 | 6 | 6 | 7,5 | 7 | 5 | **6,5** |
| 6 | Trợ lý Tripi (`/assistant`, sheet) | g11, i03 | 7 | 7,5 | 7,5 | 7 | 7,5 | 7 | 7 | **7** |
| 7 | Khám phá (`/explore`) | g06-0…4 | 6* | 6,5 | 7 | 5,5 | 5,5 | 6,5 | 6 | **6** |
| 8 | Tìm kiếm (`/search`) | g09, d05 | 5,5 | 5 | 6 | 5,5 | 5 | 6 | 5,5 | **5,5** |
| 9 | Đặt (`/book`) | g07 | 6,5 | 7 | 7,5 | 6,5 | 5,5 | 6 | 5,5 | **6** |
| 10 | Đặt lộ trình (`/book?…`, chỉ phần đầu) | d01 | 6,5 | 7 | 6 | 6,5 | 5,5 | 7 | 7,5 | **6,5** |
| 11 | Chi tiết khách sạn (`/hotel/[id]`) | d02 | 6,5* | 7,5 | 7 | 6 | 7,5 | 7,5 | 5,5 | **6,5** |
| 12 | Phòng & giá (`/hotel-rooms`) | d06 | 4 | 4 | 5 | 4 | 6 | 4 | 3 | **4** † |
| 13 | Tìm vé máy bay (`/flights`) | g13 | 7 | 7 | 7,5 | 6,5 | 7,5 | 7 | 7 | **7** |
| 14 | Tự lên lộ trình (`/trip-builder`) | g14 | 6 | 6 | 6,5 | 5,5 | 6,5 | 6 | 6 | **6** |
| 15 | Đăng nhập (`/login`) | g10, a01 | 7 | 7,5 | 7 | 6 | 7,5 | 7 | 7 | **7** |
| 16 | Tôi — khách | a00 | 6,5 | 6,5 | 7,5 | 6 | 7 | 7 | 6 | **6,5** |
| 17 | Tôi — đã đăng nhập | a02 | 6,5 | 6,5 | 6,5 | 6 | 6,5 | 6,5 | 6 | **6,5** |
| 18 | Đã lưu — trống (`/saved`) | a04 | 7,5 | 8 | 8 | 7 | 7 | 7 | 6,5 | **7** |
| 19 | Chuyến đi của tôi — trống (`/my-trips`) | a05 | 6,5 | 6 | 7 | 6 | 7 | 6,5 | 6,5 | **6,5** |
| 20 | Thông báo | a06 | 5,5 | 5,5 | 6 | 5 | 7 | 6 | 5 | **5,5** |
| 21 | Tạo bài — bước 1 (`/create`) | a07 | 6,5 | 7,5 | 6,5 | 6 | 7,5 | 7 | 7 | **6,5** |
| 22 | Cài đặt | a08 | 6 | 6 | 6 | 5 | 7,5 | 7,5 | 6,5 | **6** |
| 23 | Giỏ — trống | a10 | 4,5 | 5 | 5 | 4 | 7 | 6 | 4,5 | **5** |
| 24 | Lộ trình đã lưu — trống | a11 | 6,5 | 6,5 | 7,5 | 6 | 5,5 | 5 | 6 | **6** |
| 25 | Trạng thái kiểm duyệt | a13 | 4,5 | 4,5 | 5 | 4 | 7 | 6,5 | 5 | **5** |
| 26 | Trang tác giả — không tìm thấy | i06 | 4 | 4 | 5 | 3 | 5 | 4 | 3 | **4** † |

\* Ảnh khách sạn chưa kiểm chứng (CDN trả 403 trong môi trường này); điểm VA phản ánh trạng thái ảnh dự phòng. † Điểm chỉ chấm trạng thái trống/không tìm thấy đã quan sát.
Không tính điểm trung bình toàn app: thanh toán, chi tiết đơn và màn thành công — những màn quyết định niềm tin khi mua — chưa được kiểm chứng.

### 7.1 Ghi chú từng màn (danh tính, hình ảnh, UX, Gen Z, khuyến nghị)

Mức ưu tiên theo §9 của yêu cầu. Công sức: S < 1 ngày, M 1–3 ngày, L > 3 ngày.

**1. Onboarding chào mừng — `/onboarding` — đã kiểm chứng (g01)**
- Hình ảnh: bố cục đẹp nhất app; ảnh ghép + Tripi + tiêu đề đậm hai dòng; slogan màu teal. Mắt nhìn ảnh trước, rồi tiêu đề, rồi CTA — đúng thứ tự.
- Chưa ổn: sticker vàng "Chuyến tiếp theo?" có icon liên kết ngoài (↗) — trông như link nhưng không dẫn đi đâu. Slogan nằm giữa tiêu đề và đoạn mô tả, màu teal cỡ chữ thân bài; nó tranh chỗ với dòng phụ thay vì làm chữ ký thương hiệu.
- UX: hai lựa chọn rõ ràng; "Hai câu hỏi ngắn. Không cần tài khoản." đặt kỳ vọng tốt. "Đăng nhập" trên-phải đúng cho người dùng quay lại.
- Khuyến nghị: (P3, S) bỏ icon ↗ hoặc biến sticker thành trang trí; (P3, S) chuyển slogan xuống dưới logo hoặc dùng làm chữ trên sticker.

**2. Onboarding bước 1 — đã kiểm chứng (g02)**
- Hình ảnh: thẻ ảnh hấp dẫn; "Ăn uống" dùng icon nét trên ô màu đào thay vì ảnh — lưới mất nhịp đúng lúc người dùng đang đánh giá độ chỉn chu. Vòng chọn màu xám trên ảnh (khó nhận ra là bấm được). Phụ đề thẻ bị cắt ("Quán ngon, cà phê view đẹp").
- UX: CTA "Chọn nhịp chuyến đi" bị vô hiệu màu coral nhạt chữ trắng trông như bị hỏng. "Không cần chọn thật chuẩn. Bạn có thể đổi sau." trấn an rất tốt.
- Khuyến nghị: (P2, S) dùng ảnh cho mọi sở thích; (P2, S) trạng thái chọn = viền coral 3 px + dấu tích đặc, chưa chọn = vòng trắng viền ink; (P2, S) CTA vô hiệu = nền ink 12 %, chữ ink 45 %, kèm gợi ý "Chọn ít nhất 1 điều".

**3. Reels — `/` — đã kiểm chứng, chỉ ảnh bìa (r01, a03)**
- Hình ảnh: media tràn màn, thanh hành động phải gọn gàng, avatar Tripi là lối vào nổi bật riêng. Caption trên nền video sáng có lớp phủ tối; đọc được trong ảnh chụp.
- Chưa ổn: thanh tab đen với trạng thái chọn màu coral; tab trên 12 px/32 px; "Xem lộ trình" là viên thuốc trắng nhỏ trông như một tag, không phải hành động chính của sản phẩm.
- UX: badge thông báo nằm trên Khám phá; tên dự phòng "Tác giả"; thứ tự thanh hành động (Tripi trên nút thích) khiến Tripi là hành động nổi bật nhất, vượt cả lộ trình.
- Gen Z: ngôn ngữ quen thuộc (tốt) nhưng trong khung hình không có gì nói "bạn đặt được chuyến này" cho tới khi thấy nút nhỏ.
- Khuyến nghị: (P1, M) biến "Xem lộ trình" thành thẻ chip lộ trình: "3N2Đ · Đà Lạt · từ 1,76tr" kèm mũi tên, cao 44 px, đặt trên caption; (P1, S) chuyển badge chưa đọc sang Tôi (hoặc chuông ở tiêu đề Reels); (P2, S) tab trên 14 px / vùng chạm 44 px.

**4. Sheet lộ trình từ Reels — đã kiểm chứng (i02)**
- Hình ảnh: timeline coral gọn, ô khách sạn, dòng phương tiện, "Gợi ý từ tác giả" — dễ đọc và đáng tin.
- Phân cấp: chân sheet có ba hành động chia hai hàng (hai nút viền + một nút coral căn phải phía dưới) — nút coral lơ lửng một mình, hàng nút trông dang dở. Tiêu đề sheet "Ninh Bình" 16 px yếu hơn cả tiêu đề từng ngày.
- Khuyến nghị: (P2, S) chân sheet = một hàng: nút icon phụ (Tripi, Lưu) + nút chính co giãn "Đặt lộ trình này · từ X đ"; (P3, S) tiêu đề 20 px kèm chip thời lượng cùng dòng.

**5. Sheet bình luận — đã kiểm chứng (i01)**
- Nội dung: tên tác giả hiển thị thành mảnh ID; tất cả dùng cùng avatar mặc định. Với dữ liệu seed thì dễ hiểu, nhưng phương án dự phòng không bao giờ được làm lộ ID.
- Khuyến nghị: (P1, S) tên dự phòng "Người dùng Tripflix" + avatar chữ cái đầu; (P3, S) độ tương phản trạng thái vô hiệu của nút gửi.

**6. Trợ lý Tripi — đã kiểm chứng (g11, i03)**
- Hình ảnh: thẻ giới thiệu thân thiện và ba thẻ gợi ý có icon; nền trắng tinh khác với nền ấm dùng ở mọi nơi khác (cố ý khôi phục trong `08c41946`). Nút gửi xám trên xám khi ô trống — ổn — nhưng icon "—" để thu nhỏ khó hiểu.
- Khuyến nghị: (P2, S) hoặc đưa trợ lý về nền ấm, hoặc dùng nền trắng cho mọi sheet; (P3, S) icon thu nhỏ → mũi tên xuống.

**7. Khám phá — `/explore` — đã kiểm chứng (ảnh dự phòng) (g06-0…4)**
- Hình ảnh: tiêu đề mạnh; thẻ tìm kiếm trắng; hàng lối tắt có "Sắp có" ở hai trên bốn ô (Limousine, Tour) — 50 % hàng lối tắt quảng cáo thứ chưa có.
- Phân cấp: form khách sạn chiếm trọn khung nhìn đầu; lộ trình (nội dung cốt lõi của thương hiệu) bắt đầu ở khoảng khung nhìn thứ tư.
- Nội dung: ba carousel khách sạn giống hệt nhau; chip lọc lộ trình 11 px.
- Khuyến nghị: xem Roadmap #1 — đảo ngược màn: cảm hứng trước (lưới lộ trình với chip điểm đến, creator nổi bật), tìm kiếm sau (thanh tìm kiếm gọn, chạm vào mới mở form khách sạn/vé máy bay); (P1, S) ẩn ô "Sắp có"; (P2, M) gộp ba hàng khách sạn thành một hàng có chip lọc (Ưu đãi · Cuối tuần · Đánh giá cao).

**8. Tìm kiếm — `/search` — đã kiểm chứng (g09, d05)**
- Hình ảnh: tiêu đề 11 px; ô tìm kiếm nền ấm; hai hàng chip viên thuốc 44 px cùng kiểu — lọc theo loại và sắp xếp trông như một control.
- UX: carousel khách sạn đứng trước bộ lọc loại; "Đã hiểu: Đà Lạt" hữu ích nhưng khó hiểu; **"TRIPFLIX WEB · Mở Web"** đẩy người dùng mobile ra khỏi app để đặt — phá vỡ phễu, trái với luồng chi tiết khách sạn + phòng đã có trong app.
- Khuyến nghị: (P1, S) thay "Mở Web" bằng "Xem khách sạn tại Đà Lạt" trong app, dẫn tới kết quả khám phá/khách sạn sẵn có; (P2, S) sắp xếp thành một nút "Sắp xếp: Liên quan ▾"; (P2, S) thứ tự = từ khóa → diễn giải → tab loại → kết quả.

**9. Đặt — `/book` — đã kiểm chứng (g07)**
- Hình ảnh: thẻ đầu với Tripi dễ thương; nửa dưới màn trống; tiêu đề "Đặt lộ trình" căn lề 16 px trong khi thẻ dùng 20 px.
- UX: tab hứa "đặt" nhưng chỉ đưa ra "hỏi Tripi" và "tự lên lộ trình" — không có danh sách thứ gì để đặt. "Hỏi Tripi" bị vô hiệu cho tới khi gõ chữ.
- Khuyến nghị: (P1, L) quyết định nhiệm vụ của tab (xem Roadmap #1). Nếu giữ thành "Chuyến đi": chuyến sắp tới, lộ trình đã lưu và bản nháp ở trên, hai lối tạo mới ở dưới.

**10. Đặt lộ trình — `/book?…` — kiểm chứng một phần (d01)**
- Hình ảnh: khối giá rất rõ (tổng, mỗi người, số dịch vụ) và ô chọn từng dịch vụ kèm hành động đổi — giao diện bán hàng hữu ích nhất trong app.
- Quy tắc thương hiệu: ảnh đầu là Tripi lớn dán lên ảnh Hạ Long. Brief yêu cầu Tripi tránh ngữ cảnh giá/đặt chỗ; nó còn che mất điểm đến — thứ thúc đẩy quyết định mua.
- Điều hướng: đi từ Khám phá nhưng thanh tab chuyển sang Đặt.
- Khuyến nghị: (P1, S) ảnh đầu = ảnh điểm đến hoặc ảnh bìa video của creator, kèm chip nhỏ ghi nguồn creator; (P1, M) mở lộ trình như màn stack chồng lên tab hiện tại (không đổi tab); (P3, S) chip "Đổi điểm bay" dưới chuyến bay chỉ 11 px.

**11. Chi tiết khách sạn — `/hotel/[id]` — đã kiểm chứng, ảnh chưa kiểm chứng (d02)**
- Hình ảnh: phân cấp tốt (tên, hạng sao, địa chỉ, link bản đồ, badge điểm, điểm nổi bật, tiện ích), giá + "Chọn phòng" dính đáy.
- Niềm tin: câu "Khoảng cách địa danh là dữ liệu mẫu, dùng để tham khảo giao diện." hiển thị cho người dùng. Ảnh dự phòng hiện "Chưa tải · 1/5" với mũi tên trên vùng trống.
- Khuyến nghị: (P0 trước khi ra mắt, S) bỏ nội dung mẫu hoặc ẩn mục khi dữ liệu không thật; (P2, S) ảnh dự phòng = minh họa điểm đến, không mũi tên/bộ đếm khi chưa tải được gì.

**12. Phòng & giá — `/hotel-rooms` — đã kiểm chứng trạng thái (d06)**
- **Đính chính (2026-11-23):** ảnh trống d06 chụp với sai tham số (`hotelId` thay vì `id`). Với `id` đúng, màn vẫn hiện đủ danh sách phòng. Lỗ hổng thật là thiếu mã khách sạn (màn trống) và khách sạn không có loại phòng nào (không có thông báo); cả hai đã có thông báo trên nhánh Bước 1. Điểm bên dưới chỉ phản ánh lần chụp ban đầu.
- Ngày và số khách hiện thành chữ không định dạng với nút "Đổi" lơ lửng; bên dưới không có gì — không loading, không trống, không lỗi.
- Khuyến nghị: (P1, S) trạng thái trống rõ ràng ("Khách sạn chưa mở phòng cho ngày này — thử ngày khác") và trạng thái lỗi; (P2, S) đưa tóm tắt ngày/khách vào thẻ có nút "Đổi".

**13. Tìm vé máy bay — `/flights` — đã kiểm chứng (g13)**
- Hình ảnh: thẻ đầu có Tripi bố cục tốt, ô sân bay có nút đảo chiều. Ô "Ngày bay" dùng kiểu nhãn/giá trị lớn hơn hai ô sân bay phía trên và ô hành khách phía dưới.
- Khuyến nghị: (P3, S) thống nhất kiểu chữ trong các ô.

**14. Tự lên lộ trình — `/trip-builder` — đã kiểm chứng (g14)**
- Placeholder bị cắt ("Gõ tên thành phố, tỉnh hoặc điểm đến"), ô "Hoạt động" viền đứt nét lớn không có giải thích, "Giữ chỗ" coral bị vô hiệu ở mức 0 đ.
- Khuyến nghị: (P2, S) placeholder ngắn hơn "Đà Lạt, Phú Quốc…"; (P2, M) menu thu gọn "+ Thêm dịch vụ" thay cho ba ô đứt nét.

**15. Đăng nhập — đã kiểm chứng (g10, a01)**
- Form gọn, trung thực; lỗi hiện tại chỗ. Đăng nhập Google bị ẩn trong môi trường này (chưa đặt biến môi trường) — chưa kiểm chứng.
- Khuyến nghị: (P3, S) bỏ "* Thông tin bắt buộc" (cả hai ô hiển nhiên là bắt buộc).

**16–17. Tôi — khách và đã đăng nhập — đã kiểm chứng (a00, a02)**
- Khách: giá trị sản phẩm rõ + CTA đăng nhập + hai lối tắt.
- Đã đăng nhập: slogan dùng làm phần giới thiệu của người dùng; ba chỉ số 0 trong khối teal; segment "Video / Bài viết / Đang kiểm tra" xuống hai dòng; tiêu đề hiện logo + tên người dùng 13 px.
- Khuyến nghị: (P2, S) phần giới thiệu là link "Thêm giới thiệu" thay vì slogan; (P2, S) nhãn segment "Video · Bài viết · Chờ duyệt"; (P3, S) ẩn chỉ số 0 cho tới khi có hoạt động, hoặc hiện gợi ý "Đăng video đầu tiên".

**18–19, 24. Đã lưu / Chuyến đi của tôi / Lộ trình đã lưu — đã kiểm chứng trạng thái trống (a04, a05, a11)**
- Đã lưu là trạng thái trống mẫu mực (tiêu đề, Tripi, giải thích, CTA). Chuyến đi của tôi lặp lại cùng tư thế Tripi và CTA, thêm tiêu đề trùng ("Chuyến đi của tôi" + "Chuyến đi của bạn") và một ảnh biển trang trí. Lộ trình đã lưu hoàn toàn không có CTA. "Thư mục · Sắp có" là chip chết.
- Khuyến nghị: (P2, S) một mẫu `StateScreen` với tư thế Tripi khác nhau theo ngữ cảnh; (P2, S) bỏ chip "Sắp có" ở mọi nơi.

**20. Thông báo — đã kiểm chứng (a06)**
- Mỗi thẻ chưa đọc là một khối màu đào có chấm đỏ; tiêu đề lặp nội dung; sự kiện giống nhau không được gộp; có mục "Trước đó" nhưng không có mục "Mới".
- Khuyến nghị: (P2, M) gộp theo bài viết/luồng ("Kiểm duyệt viên trả lời 3 bình luận của bạn"); chưa đọc = thanh coral 4 px bên trái trên nền trắng, không tô kín cả thẻ.

**21. Tạo bài — bước 1 — đã kiểm chứng (a07)**
- Mục đích rõ ràng; cột nội dung có lề hai bên khoảng 28 px trong khi nơi khác là 20 px; thẻ mẹo nền nhạt ổn.
- Khuyến nghị: (P3, S) căn lề thống nhất; (P2, M) hiện một bài đăng mẫu hoàn chỉnh (ảnh bìa + chip lộ trình) để tạo động lực.

**22. Cài đặt — đã kiểm chứng (a08)**
- Nền thẻ teal và vàng không mang ý nghĩa gì; tiêu đề trùng hai lần.
- Khuyến nghị: (P3, S) danh sách nhóm nền trắng trung tính; một tiêu đề duy nhất.

**23. Giỏ — trống — đã kiểm chứng (a10)**
- Icon khiên + "Giỏ của bạn đang trống." + một CTA toàn chiều ngang; không còn gì khác. Trạng thái trống yếu nhất về thị giác.
- Khuyến nghị: (P2, S) áp dụng mẫu của Đã lưu; gợi ý lộ trình đã lưu.

**25. Trạng thái kiểm duyệt — đã kiểm chứng (a13)**
- Các dòng chữ trơn, trạng thái chìm trong câu văn ("Bình luận · Tạm ẩn để kiểm tra"), thời gian dạng `09:14:39 20/11/2026`, lặp nguyên nội dung gốc.
- Khuyến nghị: (P2, M) chip trạng thái (màu + chữ), thẻ xem trước nội dung, thời gian tương đối, CTA khiếu nại chỉ khi đủ điều kiện (logic hiện đã đúng).

**26. Trang tác giả — không tìm thấy — đã kiểm chứng (i06)**
- Tiêu đề vẫn "Đang tải…" sau khi đã có kết quả không tìm thấy; thông báo dùng icon khiên.
- Khuyến nghị: (P1, S) tiêu đề hiện "Hồ sơ" khi lỗi; trạng thái không tìm thấy kèm CTA quay lại.

---

## 8. Đánh giá luồng người dùng

Chỉ đánh giá các luồng có trong code.

| Luồng | Điểm vào | Các bước quan sát được | Điểm vướng | Luồng đề xuất |
|---|---|---|---|---|
| **Mở app lần đầu (khách)** | Mở app → `/onboarding` | Chào mừng → sở thích (2 bước) → Reels; hoặc "Khám phá trước" → Reels | Màn chào mừng có hai phần tử "Khám phá trước" (đầu + chân; Playwright báo trùng); CTA vô hiệu không có lý do | Giữ nguyên. Một lối bỏ qua duy nhất; gợi ý vì sao CTA chưa bấm được. |
| **Video → lộ trình → đặt** | Nút "Xem lộ trình" trên Reels | Sheet theo ngày → "Đặt lộ trình này" | Nút nhỏ; ba hành động ở chân sheet; đặt chỗ mở trong tab Đặt | Thẻ chip lộ trình trên reel → sheet → "Đặt" đẩy màn stack ngay trong Reels; back quay về đúng reel. |
| **Khám phá qua tab Khám phá** | Tab Khám phá | Form tìm kiếm → cuộn qua 3 hàng khách sạn → lưới lộ trình → chạm thẻ → (tab chuyển sang Đặt) | Cảm hứng bị chôn; đổi tab làm mất ngữ cảnh | Cảm hứng trước; mở ngay trong tab. |
| **Tìm kiếm** | Icon tìm kiếm (Reels/Khám phá) | Từ khóa → carousel khách sạn → bộ lọc → "Mở Web" → kết quả | Rời app để đặt khách sạn; hai hàng bộ lọc | Kết quả khách sạn trong app; một hàng lọc + nút sắp xếp. |
| **Đặt khách sạn** | Thẻ ở Khám phá hoặc tìm kiếm | Chi tiết khách sạn → "Chọn phòng" → Phòng | Phòng trống không thông báo (dữ liệu cục bộ); dòng ghi chú dữ liệu mẫu | Không kiểm chứng được sau màn Phòng (chưa tới Thanh toán). |
| **Hỏi Tripi** | Avatar trên Reels, thẻ ở Đặt, thẻ ở Khám phá, `/assistant` | Sheet/màn với các gợi ý | Bốn lối vào, nội dung nhất quán (tốt) | Giữ các lối vào nhưng cho Tripi một "nhà" cố định (ví dụ thanh hành động Reels + Đặt). |
| **Lưu** | Thanh Reels, sheet tùy chọn, "Lưu lộ trình" ở lộ trình | Lưu bài → `/saved`; lưu lộ trình → `/saved-itineraries` | Hai nơi "đã lưu" riêng, vào từ các menu khác nhau; "Thư mục sắp có" | Một "Đã lưu" với tab Video · Lộ trình. |
| **Hồ sơ** | Tab Tôi | Chỉ số, lối tắt, tab nội dung của tôi, bánh răng → Cài đặt | Badge thông báo nằm chỗ khác; slogan làm phần giới thiệu | Xem §7. |

---

## 9. So sánh với Stitch

Nguồn: dự án Stitch `17566515177619492500` (10 thiết kế, đã kiểm qua MCP), bản dựng hiện tại, brief thương hiệu.

| Khu vực | Stitch (tham chiếu) | Bản dựng hiện tại | Áp dụng / điều chỉnh / cải tiến |
|---|---|---|---|
| Reels | Thẻ video 9:16 bo góc *nằm trong* feed nền sáng, **thẻ bán lộ trình ngay trên video** ("Lịch trình trọn gói · 3N2Đ · từ 1.850.000đ · Chi tiết"), chip xu hướng | Video tràn màn, nút nhỏ "Xem lộ trình" | **Áp dụng thẻ lộ trình trên video** (đó là ý tưởng cốt lõi của sản phẩm). Giữ video tràn màn (tốt hơn cho video; quyết định D2 của nhóm). |
| Khám phá | Thẻ tìm kiếm với điểm đến, ngày, số khách **và chip ngân sách** ("Hạt dẻ <500k / Chill 500k–1.2tr / Xịn sò >1.2tr"), ưu đãi có giá gạch, hashtag "Gen Z đang tìm kiếm", hàng cam kết tin cậy | Form khách sạn/vé máy bay, ba hàng khách sạn, lưới lộ trình ở dưới | **Điều chỉnh** chip ngân sách (ngân sách là nhu cầu đã nêu của tệp người dùng; cần bộ lọc khoảng giá trong API — Tương lai/F). **Điều chỉnh** tìm kiếm thịnh hành chỉ khi có dữ liệu truy vấn thật (Tương lai). Hàng cam kết: chỉ dùng những cam kết đúng sự thật. |
| Thanh tab | Khám phá · Dịch vụ/Lịch trình · **Tripi nổi ở giữa** · Chuyến đi · Tài khoản | Reels · Khám phá · Tạo · Đặt · Tôi | **Cải tiến:** cả hai đều chưa đúng nguyên trạng. Xem Roadmap #1 cho phương án lai giữ Reels và Tạo. |
| Chi tiết lộ trình | Ảnh đầu, điểm đánh giá, phong cách/phương tiện, mẹo Tripi, từng ngày thu gọn được có ảnh mỗi điểm dừng, **bao gồm/không bao gồm**, đánh giá, giá + CTA dính đáy | Tripi ở ảnh đầu, chip ngày/khách, ô chọn dịch vụ có giá, tổng dính đáy | **Áp dụng** ảnh điểm đến ở đầu, ảnh mỗi điểm dừng, "Bao gồm / Không bao gồm" (khái niệm UI; nội dung cần dữ liệu — Tương lai). Giữ ô chọn từng dịch vụ hiện tại (đã chạy được, rõ hơn Stitch). |
| Đã lưu | Lưới bộ sưu tập có ảnh bìa | Một danh sách + "Thư mục sắp có" | Bộ sưu tập = **Tương lai** (cần backend). Trước mắt bỏ chip. |
| Hồ sơ creator | Lưới kiểu TikTok, chỉ số người theo dõi, badge chuyến đi đã xác thực | Chưa kiểm chứng với dữ liệu | Áp dụng lưới + badge "Đã đi thật" khi API có cờ này. |
| Ngôn ngữ hình ảnh | Thẻ trắng, nhãn chữ in hoa phía trên tiêu đề, nhiều badge/nhãn giảm giá, CTA chữ trắng trên coral, chip dày đặc | Ấm hơn, êm hơn, ít badge hơn | **Không sao chép:** Stitch dày đặc hơn mức người dùng Gen Z cần (định luật Hick), nhãn in hoa bị chính hệ thiết kế của dự án cấm, vài bản xuất của Stitch hiện chữ `alt` của logo bị lỗi, và nhiều con số (ví dụ "Hoàn hủy linh hoạt", "-25%") chỉ để minh họa, không được đưa ra như cam kết thật. |

**Bên nào đẹp hơn về thị giác?** Stitch, ở Khám phá và Lộ trình: nhiều ảnh hơn, nhiều lý do để chạm hơn, giá trị mỗi thẻ rõ hơn. Bản dựng thì hơn ở độ êm và độ dễ đọc. Mục tiêu là *độ giàu nội dung* của Stitch kết hợp với *sự tiết chế* của bản dựng.

Cách phân loại tính năng: **Đã có** (đang chạy), **Khái niệm UI** (chỉ cần front-end), **Tương lai** (cần backend/logic nghiệp vụ). Chip ngân sách, bộ sưu tập, bao gồm/không bao gồm, tìm kiếm thịnh hành, ưu đãi có giá gốc = Tương lai. Thẻ lộ trình trên reel, ảnh điểm đến ở đầu, gộp tab Đã lưu = Khái niệm UI trên dữ liệu sẵn có.

---

## 10. Danh mục bằng chứng

`VSF/outputs/mobile-ux-audit-2026-11-22/screens/`:
- Khách: `g01` chào mừng, `g02` sở thích, `g06-0…4` khám phá, `g07` đặt, `g09` tìm kiếm, `g10` đăng nhập, `g11` trợ lý, `g12` khách sạn thiếu mã, `g13` vé máy bay, `g14` tự lên lộ trình, `r01` reels
- Chi tiết: `d01` đặt lộ trình, `d02-0/1` chi tiết khách sạn, `d04` khám phá đã nhập điểm đến, `d05` kết quả tìm kiếm, `d06` phòng
- Đã đăng nhập: `a00` tôi khi là khách (bản sạch), `a01` lỗi đăng nhập, `a02` tôi, `a03` reels, `a04` đã lưu, `a05` chuyến đi của tôi, `a06` thông báo, `a07` tạo bài, `a08` cài đặt, `a10` giỏ, `a11` lộ trình đã lưu, `a13` trạng thái kiểm duyệt
- Tương tác: `i01` bình luận, `i02` sheet lộ trình, `i03` sheet Tripi, `i04` tùy chọn, `i05` chia sẻ, `i06` trang tác giả
- Mỗi file `*.txt` chứa URL và chữ hiển thị của lần chụp đó.
- Dữ kiện từ code: `explorer.type` dùng trong 2 file, `compactType` trong 18, `colors.*` cũ trong 25 (`apps/mobile/src`, grep ngày 2026-11-22); `explorer.action.onPrimary = '#FFFFFF'` (`packages/tokens/src/index.ts`).

---

## 11. Giới hạn và giả định chưa kiểm chứng

- Dựng qua react-native-web trên Chrome máy tính ở kích thước điện thoại, không phải trên iOS/Android. Cử chỉ, safe area, bàn phím, rung phản hồi, phát video, hiệu năng và công nghệ hỗ trợ chưa được kiểm chứng.
- Đánh giá nhánh SCRUM-189 chưa merge; người dùng production hiện thấy bản `develop`, bản này không được dựng lại.
- Ảnh khách sạn thiếu trong môi trường này (CDN 403), tác giả seed không có tên, dữ liệu cục bộ không có phòng: các nhận định phụ thuộc nội dung ở Khám phá, Khách sạn, Phòng và Bình luận chỉ là tạm thời.
- Chưa tới được các màn thanh toán, kết quả thanh toán, chi tiết đơn và thành công; kết luận về niềm tin khi mua không bao gồm các màn này.
- Mọi nhận định về Gen Z là giả thuyết chuyên môn. Chưa thực hiện và không ngụ ý có nghiên cứu người dùng nào. Xem [GEN_Z_VALIDATION_PLAN.md](GEN_Z_VALIDATION_PLAN.md).
- Tỉ lệ tương phản được tính từ mã hex của token; độ tương phản của chữ trên video thay đổi theo khung hình và được đánh giá bằng mắt.
