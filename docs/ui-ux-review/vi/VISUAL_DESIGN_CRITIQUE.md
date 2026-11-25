# Tripflix Mobile — Phê bình thiết kế hình ảnh

**Ngày:** 2026-11-22 · Bản dựng: `trang/SCRUM-189-tripflix-stitch-redesign` @ `35de677c` (Expo web, 390 × 844) · Chỉ đánh giá.
Mã bằng chứng (ví dụ `g06-0`) là tên file trong `VSF/outputs/mobile-ux-audit-2026-11-22/screens/`. Bối cảnh và điểm số: [TRIPFLIX_MOBILE_UX_AUDIT.md](TRIPFLIX_MOBILE_UX_AUDIT.md).

Tài liệu này đánh giá giao diện **chỉ ở khía cạnh hình ảnh và cảm xúc**. Tính dễ dùng được trình bày trong báo cáo chính.

---

## 1. Kết luận trong một đoạn

Tripflix giờ đã có *bảng màu* và *giọng nói*, nhưng chưa có *hệ thống hình ảnh*. Ở những nơi đã áp dụng lớp "Original Explorer" mới (onboarding, Đã lưu, đầu màn Khám phá, thẻ đầu tab Đặt, thẻ đầu màn Vé máy bay), app trông ấm áp, tự tin và trẻ trung. Ở những nơi còn lại, thang chữ thu gọn cũ, các thẻ tô màu tùy hứng và trạng thái còn thiếu kéo app trở về cảm giác "công cụ nội bộ". Đòn bẩy thẩm mỹ lớn nhất không phải là thêm trang trí — mà là **hoàn tất việc chuyển đổi** và **đặt ảnh du lịch, chứ không phải khung giao diện, vào trung tâm các màn không phải video**.

---

## 2. Điều làm app hấp dẫn (giữ lại)

1. **Nền ấm.** `#FFF7F2` thay cho trắng giúp mọi màn không phải video có cảm giác nắng và giấy, hợp với "du lịch" hơn một OTA trắng lạnh.
2. **Tiêu đề lớn có cá tính.** "Hôm nay vi vu đâu ta?", "Để dành một chuyến đi.", "Chuyến đi, theo gu của bạn." — Be Vietnam Pro đậm 26–34 px, khoảng cách chữ khít. Đây là khoảnh khắc chữ mạnh nhất của app và nó nói chuyện như một người bạn.
3. **Coral là màu nổi duy nhất.** Chỉ hành động chính mới có mảng coral lớn; mắt luôn biết hành động nằm ở đâu.
4. **Tripi ở trạng thái trống và chào mừng.** Chú cáo 3D cầm bản đồ (a04, a05, a11) biến ngõ cụt thành khoảnh khắc thân thiện. Đây là tài sản hình ảnh mang đậm dấu ấn riêng nhất của Tripflix.
5. **Ảnh ghép onboarding (g01).** Hai ảnh nghiêng, một sticker, Tripi tràn ra khỏi khung — nhiều lớp, vui, mang chất tạp chí. Đây là hướng hình ảnh mà phần còn lại của app nên theo.
6. **Ảnh bìa lộ trình ở Khám phá (g06-3).** Ảnh bìa của creator với chữ tự viết ("HẠ LONG", "Săn Mây") mang năng lượng nội dung do người dùng tạo — đậm chất Gen Z hơn bất kỳ ảnh stock nào.

---

## 3. Điều làm app kém hấp dẫn (cần sửa)

### 3.1 Chữ: hai thang chữ đánh nhau
- Đo trên màn hình: nhãn tab **10 px**, chip ở Khám phá **11 px**, tiêu đề màn **11–13 px** ("Tìm kiếm", "Chuyến đi của tôi", "Cài đặt"), chữ thân bài ở nhiều màn **12 px**. Chữ tiêu đề lớn 26–34 px.
- Nguyên nhân trong code: `explorer.type` (v2: body 16, label 14, micro 12) dùng trong 2 file; `compactType` (body 12, heading 13, label 11, meta 10) trong 18 file.
- Hiệu ứng thị giác: không có bậc trung gian. Tiêu đề 34 px theo sau là chữ xám 12 px trông như dán poster lên bảng tính. Tiêu đề kép (tiêu đề nhỏ trên thanh + H1 lớn nói cùng một điều — a05 "Chuyến đi của tôi / Chuyến đi của bạn", a08 "Cài đặt / Cài đặt") trông như lỗi bố cục.
- **Sửa:** một thang chữ. Tiêu đề thanh = `headline` 17–20 px semibold *hoặc* không có tiêu đề thanh khi đã có H1 lớn (kiểu large-title của iOS). Thân bài 15–16, phụ 14, micro tối thiểu 12. Chip 14 px semibold.

### 3.2 Màu: tô màu mà không có ý nghĩa
- Thẻ teal, thẻ vàng, thẻ đào xuất hiện làm nền mục mà không có quy tắc: Cài đặt dùng teal cho "Tài khoản" và vàng cho "Hoạt động" (a08); Tôi dùng teal cho chuyến đi và vàng cho đã lưu (a00); Thông báo dùng màu đào cho mọi mục chưa đọc (a06).
- Hiệu ứng: chắp vá màu pastel; màu không còn báo hiệu điều gì.
- **Sửa:** chỉ tô màu khi *có ý nghĩa* — teal = thông tin/đang chọn, vàng = điểm đánh giá/điểm nhấn, đào = Tripi/trợ lý. Mọi thứ khác dùng thẻ trắng trung tính trên nền ấm.
- **Thanh tab tối trên màn sáng:** thanh đen đặc là phần tử nặng nhất trên Khám phá, Đặt, Tôi, Đã lưu. Ở Reels nó hợp; ở các màn ấm nó trông như một app khác. **Sửa:** thanh tab theo bề mặt — Đêm trên Reels, Ngày (trắng, viền trên mảnh `#EADFD8` và bóng nhẹ) ở nơi khác; nút Tạo giữ gradient hoàng hôn ở cả hai.
- **Chữ trắng trên coral** (≈3,1:1) ở CTA chính là quyết định của chủ sản phẩm và được giữ nguyên. Mức này đạt ngưỡng WCAG AA cho chữ lớn, nên chỉ dùng cho nhãn nút đậm (đậm ≥ 18,7 px khi có thể) và tránh chữ trắng nhỏ trên coral ở chỗ khác (chip, badge, chú thích).

### 3.3 Thẻ và thành phần
| Thành phần | Điểm chưa ổn | Thay đổi |
|---|---|---|
| Thẻ khách sạn (g06) | Vùng ảnh chiếm ~60 % thẻ nhưng hiện khối dự phòng; vùng chữ có ba dòng 13–14 px với "/đêm" bị lẻ dòng; ba carousel giống hệt nhau nối tiếp | Ảnh 4:5 có lớp phủ gradient và giá đặt trên ảnh, tên + điểm bên dưới; một carousel kèm chip lọc |
| Ô lối tắt (g06) | Bốn ô bằng nhau, hai ô ghi "Sắp có" 12 px; icon trong ô vuông tô màu nằm trong ô vuông trắng (hai lớp khung) | Chỉ dịch vụ đang có; một lớp khung, icon 28 px, nhãn 14 px |
| Thẻ tìm kiếm (g06) | Segment + ô nhập + CTA vô hiệu trong thẻ trắng trên nền ấm, cao 160 px ở khung nhìn đầu | Thanh tìm kiếm thu gọn ("Bạn muốn đi đâu?") mở rộng khi chạm |
| Segment/tab | Ba kiểu: chip viên thuốc (g09), hình chữ nhật bo nền ấm (a05), khối teal đặc + chữ trơn bị xuống dòng (a02) | Một thành phần `Segmented`: rãnh viên thuốc, nút trượt trắng, nhãn 14 px, tối đa 4 mục |
| Nút chính bị vô hiệu | Coral nhạt/be với chữ trắng trông như hỏng hoặc đang tải | Nền ink trung tính 8 %, chữ ink 40 %, không icon |
| Banner lỗi/thông tin | Icon khiên có dấu tích cho cả lỗi lẫn trạng thái trống (g12, a10, i06) | Icon cảnh báo tròn màu `error` cho lỗi; trạng thái trống không dùng banner — dùng mẫu trạng thái trống |
| Thẻ thông báo (a06) | Mỗi mục chưa đọc là một khối đào kín; ô trích dẫn lặp lại | Thẻ trắng, thanh coral 3 px bên trái cho mục chưa đọc, gộp nhóm |
| Chân sheet lộ trình (i02) | Hai nút viền một hàng, nút coral chính đứng riêng phía dưới, căn phải | Một hàng: hai nút icon + một nút chính co giãn |
| Badge điểm (d02) | Viên vàng lớn "4,9 / 5" tốt; nhãn "Điểm từ khách" phía trên 13 px xám | Giữ; đưa số lượt đánh giá vào cùng dòng |

### 3.4 Bố cục và nhịp điệu
- **Lề không đều:** 16 px (tiêu đề tab Đặt), 20 px (đa số), ~28 px (Tạo bài). Chọn 20.
- **Nửa dưới bỏ trống:** Đặt (g07), Giỏ (a10), Phòng (d06), Tạo bài (a07), Lộ trình đã lưu (a11) đều kết thúc ở giữa màn với khoảng 40 % nền trống. Màn hình trông dang dở chứ không phải thoáng. Hãy lấp bằng nội dung liên quan (lộ trình đã lưu, chuyến gần đây, ví dụ) hoặc căn giữa trạng thái theo chiều dọc.
- **Lặp lại:** cùng một tư thế Tripi (cầm bản đồ) ở Đã lưu, Chuyến đi của tôi và Lộ trình đã lưu; cùng CTA "Đi tìm cảm hứng". Thư viện có nhiều tư thế hơn (`tripi-library/`: action-book, action-plan, action-vlog…) — dùng tư thế khác nhau cho mỗi ngữ cảnh.

### 3.5 Hình ảnh và video
- Reels: ảnh bìa tràn màn mạnh; thanh hành động và caption gọn. Nút lộ trình là phần tử yếu nhất về thị giác trong khung hình, trong khi nó là lý do tồn tại của sản phẩm.
- Khám phá/Khách sạn: không thấy được ảnh khách sạn thật trong môi trường này (CDN 403). Ảnh *dự phòng* là khối teal có icon ảnh và chữ "Ảnh chưa tải được" — lặp lại hơn 9 lần trên một màn thì nó lấn át cả trang. Ảnh dự phòng nên lặng lẽ: ảnh điểm đến làm mờ hoặc gradient nhẹ, không có chữ.
- Ảnh đầu màn đặt lộ trình (d01): Tripi dán lên ảnh Hạ Long tranh chỗ với — và che mất — điểm đến. Trong một màn hiển thị 7.770.000đ, điểm đến và creator mới là thứ gánh cảm xúc; linh vật thuộc về các lối vào trợ lý.

### 3.6 Thể hiện thương hiệu
- Logo được dùng đúng (logo đầy đủ trên-trái ở Khám phá, Tôi, Đăng nhập).
- Vị trí slogan không nhất quán: dưới tiêu đề Khám phá (tốt), trong đoạn mô tả onboarding (ổn), làm phần giới thiệu trên hồ sơ người dùng ở Tôi (a02) — chỗ cuối làm loãng slogan thành chữ lấp chỗ.
- Lời hứa thương hiệu và slogan: nội dung dùng "Thấy là thích, nhích là đi" (slogan) đúng; lời hứa thương hiệu trong brief "Chạm cảm hứng, trọn hành trình" không xuất hiện — không phải lỗi, nhưng nên cân nhắc cho ngữ cảnh Đặt/lộ trình.
- Bản thân các thành phần (nút, thẻ) trung tính về thương hiệu. Cá tính chỉ đến từ lời văn và linh vật. Một dấu ấn thương hiệu nhẹ, nhất quán sẽ có ích: ví dụ gradient hoàng hôn của logo cho nút Tạo và *chỉ* cho trạng thái đang chọn của chip lộ trình; motif "sticker ảnh nghiêng" của onboarding dùng lại trên thẻ lộ trình và trạng thái trống.

---

## 4. Sức hút cảm xúc

| Cảm xúc | Nơi đạt được | Nơi còn thiếu |
|---|---|---|
| Tò mò | Reels, onboarding, ảnh bìa lộ trình | Khung nhìn đầu Khám phá (form), Tìm kiếm (bộ lọc) |
| Phiêu lưu / tự do | Video Reels, ảnh onboarding | Tab Đặt (trống), Tự lên lộ trình (ô đứt nét) |
| Cảm hứng | Lưới lộ trình, thẻ gợi ý Tripi | Hàng khách sạn với ảnh dự phòng |
| Tin cậy | Cấu trúc chi tiết khách sạn, khối giá, timeline | Ghi chú dữ liệu mẫu ở khách sạn, tên dạng UUID, "Mở Web" |
| Cá tính | Lời văn của Tripi, tiêu đề | Cài đặt, thông báo, trạng thái kiểm duyệt, giỏ |

---

## 5. Sự nhất quán thẩm mỹ

Ba ngôn ngữ hình ảnh cùng tồn tại:
1. **Media ban đêm** — Reels, thanh tab đen.
2. **Explorer tông ấm (v2)** — onboarding, đầu màn Khám phá, thẻ đầu Đặt, Đã lưu, Vé máy bay.
3. **Thu gọn kiểu cũ** — thanh tiêu đề, bộ lọc Tìm kiếm, tab Chuyến đi của tôi, màu tô ở Cài đặt, Thông báo, Trạng thái kiểm duyệt, Giỏ.

Cộng thêm một ngôn ngữ thứ tư: **chat Tripi nền trắng** (cố ý khôi phục trong `08c41946`).

Cách sửa là một quyết định, không phải một lượt đánh bóng: Đêm chỉ cho media, Explorer tông ấm cho mọi thứ khác, và bỏ hẳn thang chữ thu gọn. Cho tới khi đó, mọi màn mới sẽ thừa hưởng ngôn ngữ của màn mà người làm sao chép theo.

---

## 6. Khuyến nghị thiết kế lại cụ thể (chỉ phần hình ảnh)

| # | Thay đổi | Màn hình | Ưu tiên | Công sức |
|---|---|---|---|---|
| V1 | Một thang chữ duy nhất (bỏ `compactType`); bỏ tiêu đề trùng | Tất cả | P1 | M |
| V2 | Thanh tab theo bề mặt (Ngày trên các màn không phải video) | Mọi tab | P1 | S |
| V3 | Trạng thái vô hiệu trung tính; giữ chữ trắng trên nút coral (quyết định chủ sản phẩm), nhãn đậm và đủ lớn | Tất cả | P1 | S |
| V4 | Thẻ chip lộ trình trên Reels (tuyến · số ngày · giá từ · mũi tên) | Reels | P1 | M |
| V5 | Ảnh điểm đến/creator ở đầu màn đặt lộ trình; đưa Tripi ra khỏi màn có giá | Đặt lộ trình | P1 | S |
| V6 | Ảnh dự phòng lặng lẽ (gradient/làm mờ, không chữ) | Khám phá, Tìm kiếm, Khách sạn | P2 | S |
| V7 | Một thành phần `Segmented`, một mẫu trạng thái trống với tư thế Tripi theo ngữ cảnh | Chuyến đi của tôi, Tôi, Tìm kiếm, Đã lưu, Giỏ, Lộ trình đã lưu | P2 | M |
| V8 | Màu tô chỉ mang ý nghĩa; danh sách nhóm trung tính ở Cài đặt; thanh đánh dấu chưa đọc ở Thông báo | Cài đặt, Tôi, Thông báo | P2 | S |
| V9 | Lề 20 px ở mọi nơi; lấp đầy hoặc căn giữa các màn bỏ trống nửa dưới | Đặt, Tạo bài, Giỏ, Phòng | P2 | S |
| V10 | Dùng lại motif sticker ảnh nghiêng của onboarding trên thẻ lộ trình và trạng thái trống | Khám phá, Đã lưu | P3 | M |

Mọi khuyến nghị là nhận định chuyên môn; V2, V4, V5 và V10 là ứng viên tốt cho bài test so sánh ưu tiên (xem [GEN_Z_VALIDATION_PLAN.md](GEN_Z_VALIDATION_PLAN.md)).
