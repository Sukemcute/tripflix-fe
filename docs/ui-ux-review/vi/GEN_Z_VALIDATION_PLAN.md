# Tripflix Mobile — Kế hoạch kiểm chứng với người dùng Gen Z

**Ngày:** 2026-11-22 · Đi kèm [TRIPFLIX_MOBILE_UX_AUDIT.md](TRIPFLIX_MOBILE_UX_AUDIT.md)
**Chưa có nghiên cứu nào được thực hiện.** Mọi nhận định về Gen Z trong báo cáo đánh giá là giả thuyết chuyên môn. Kế hoạch này mô tả cách kiểm chứng chúng với người dùng mục tiêu thật, chi phí thấp.

---

## 1. Người tham gia

- **Đối tượng:** người Việt 18–25 tuổi, sinh viên và người mới đi làm; đã có ít nhất một chuyến du lịch trong 12 tháng qua; xem video du lịch ngắn (TikTok/Reels/Shorts) ít nhất hằng tuần. Tỉ lệ: khoảng 50 % từng tự đặt chỗ online, khoảng 50 % để người khác đặt.
- **Loại trừ:** thành viên nhóm Tripflix, người đã dùng prototype Tripflix.
- **Số lượng:** 5–6 người mỗi vòng cho test định tính (phát hiện phần lớn vấn đề lớn); 12–20 người mỗi phương án cho test so sánh ưu tiên, first-click và tree test.
- **Tuyển:** nhóm sinh viên, nhóm du lịch trên Facebook, bạn của bạn. Quà cảm ơn nhỏ (ví dụ voucher 50k). Xin đồng ý ghi màn hình/âm thanh; lưu bản ghi ở nơi riêng tư.
- **Thiết bị:** điện thoại Android/iPhone của chính họ với bản APK/TestFlight, hoặc prototype bấm được cho các khái niệm chưa dựng.

---

## 2. Giả thuyết cần kiểm chứng

| Mã | Giả thuyết (từ báo cáo đánh giá) | Loại | Phương pháp |
|---|---|---|---|
| H1 | Người dùng lần đầu hiểu trong 10 giây rằng Tripflix biến video du lịch thành chuyến đi đặt được | Hiểu | Test 5 giây trên onboarding + Reels |
| H2 | Người dùng không phân biệt được "Khám phá" và "Đặt" | Điều hướng | Tree test + first-click |
| H3 | Nút "Xem lộ trình" hiện tại trên Reels bị bỏ qua | Khả năng nhận ra | First-click trên Reels; nói to suy nghĩ khi nhìn |
| H4 | Thẻ chip lộ trình có tuyến/số ngày/giá làm tăng lượt chạm vào lộ trình | Ưu tiên / tương tác | So sánh ưu tiên A/B + first-click |
| H5 | Khám phá đặt cảm hứng lên trước tạo cảm giác "làm cho mình" hơn Khám phá bắt đầu bằng form hiện tại | Sức hút | Test 5 giây + so sánh ưu tiên |
| H6 | Thanh tab đen trên màn sáng tạo cảm giác rời rạc | Nhất quán hình ảnh | So sánh ưu tiên (thanh Ngày vs Đêm) |
| H7 | Người dùng mất chỗ đang xem khi lộ trình từ Khám phá mở trong tab Đặt | Luồng | Task test |
| H8 | Chữ dữ liệu mẫu, tên dạng ID và "Mở Web" làm giảm niềm tin | Niềm tin | Task test + chấm điểm tin cậy |
| H9 | Tripi tạo cảm giác người bạn đồng hành hữu ích, không trẻ con | Cá tính | Phỏng vấn + chọn tính từ |
| H10 | Đã lưu/Chuyến đi của tôi cho người dùng lý do quay lại | Ý định quay lại | Phỏng vấn (chỉ là ý định nói ra, không phải đo được) |

---

## 3. Phương pháp

### 3.1 Test 5 giây / ấn tượng đầu tiên (H1, H5, H6)
- Cho xem một màn trong 5 giây, rồi hỏi: "App này dùng để làm gì?", "Bạn nhớ được gì?", "App dành cho ai?", "Chọn 3 từ trong danh sách" (đẹp, rẻ tiền, hiện đại, nhàm chán, đáng tin, trẻ trung, rối mắt, giống app khác, muốn thử, …).
- Màn: onboarding chào mừng, Reels, Khám phá (hiện tại), Khám phá (mock-up đề xuất), Chi tiết khách sạn.
- **Tín hiệu đạt:** ≥ 70 % nhắc tới video *và* chuyến đi/đặt chỗ cho H1; Khám phá đề xuất nhận nhiều tính từ tích cực hơn tiêu cực.

### 3.2 So sánh ưu tiên (H4, H5, H6)
- Cặp mock-up, thứ tự ngẫu nhiên, mỗi cặp một câu hỏi: "Bạn muốn dùng bản nào để tìm chuyến đi tiếp theo? Vì sao?"
- Các cặp: nút trên Reels vs thẻ lộ trình; Khám phá hiện tại vs đề xuất; thanh tab Đêm vs Ngày trên Khám phá.
- n ≥ 15 mỗi cặp. Báo cáo tỉ lệ chia + lý do; chênh lệch < 60/40 coi là "không có ưu tiên rõ".

### 3.3 Test first-click (H2, H3, H4)
- Ảnh chụp tĩnh, giao một nhiệm vụ, ghi lại lần chạm đầu tiên.
- Nhiệm vụ: "Bạn thích video này — xem cách đi chuyến này" (Reels); "Tìm khách sạn ở Đà Lạt" (tab bất kỳ); "Xem chuyến bạn đã đặt tuần trước" (tab bất kỳ); "Hỏi Tripi một chuyến tiết kiệm".
- **Đạt:** ≥ 80 % chạm đúng lần đầu.

### 3.4 Tree test / test hiểu điều hướng (H2)
- Nhãn tab dạng chữ với các mục con, hiện tại vs phương án A vs phương án B (roadmap #1).
- Nhiệm vụ như 3.3, thêm "Tìm các video bạn đã lưu", "Đổi gu du lịch của bạn".
- Công cụ: Optimal Workshop hoặc Google Form có rẽ nhánh. n ≥ 12 mỗi cây.

### 3.5 Test khả dụng theo nhiệm vụ (H7, H8, H3)
- Có người điều phối, 30–40 phút, nói to suy nghĩ, trên thiết bị, 5–6 người mỗi vòng.
- Nhiệm vụ:
  1. Mở app lần đầu: vào được phần video (quan sát lựa chọn ở onboarding).
  2. Tìm một chuyến đi từ video và xem kế hoạch của nó.
  3. Từ Khám phá, mở một chuyến đi, rồi quay lại thứ đang xem.
  4. Tìm khách sạn ở Đà Lạt cho cuối tuần sau và đi tới bước chọn phòng.
  5. Lưu một chuyến đi và tìm lại nó.
  6. Hỏi Tripi một chuyến 2 ngày dưới 3 triệu.
- Đo: hoàn thành, thời gian, lỗi/quay lui, SEQ (1–7) mỗi nhiệm vụ, điểm tin cậy (1–7) ở chi tiết khách sạn và đặt lộ trình.
- Ghi lại mọi lúc người tham gia nhận xét dữ liệu trông giả, tên người dùng, hoặc việc bị đẩy ra khỏi app.

### 3.6 Phỏng vấn ngắn (H9, H10)
- 10 phút sau task test:
  - "Hiện tại bạn thường đi từ một video du lịch tới một chuyến đi thật như thế nào?"
  - "Điều gì khiến bạn mở lại Tripflix vào tuần sau?"
  - "Bạn thấy Tripi thế nào? Hãy mô tả Tripi như một con người."
  - "Có chỗ nào cảm thấy chưa hoàn thiện hoặc không đáng tin không?"
- Phân tích bằng affinity mapping; báo cáo bằng trích dẫn, không dùng phần trăm.

---

## 4. Những gì không cần test với người dùng

Sửa thẳng (là lỗi hoặc tiêu chuẩn, không phải sở thích): chữ dữ liệu mẫu ở chi tiết khách sạn, tên dạng mảnh ID, "Mở Web" trong luồng đặt chỗ, ý nghĩa icon lỗi, trạng thái trống/lỗi còn thiếu, chữ dưới 12 px, độ tương phản dưới 4,5:1, vùng chạm dưới 44 px, tiêu đề kẹt ở "Đang tải…".

---

## 5. Báo cáo kết quả

Mỗi vòng, một trang cho mỗi giả thuyết: phương pháp, n, kết quả, kết luận (được ủng hộ / không được ủng hộ / chưa kết luận), quyết định. Lưu ghi chú gốc và bản ghi ngoài repo. Không bao giờ báo phần trăm từ dưới 5 người tham gia; không bao giờ coi ý định nói ra ("tôi sẽ quay lại") là tỉ lệ giữ chân.

## 6. Lịch trình (đề xuất)

| Ngày | Hoạt động |
|---|---|
| 1–2 | Dựng mock-up cho Khám phá đề xuất, thẻ lộ trình trên Reels, các phương án tab; chuẩn bị tree test và form |
| 3–5 | Test 5 giây, so sánh ưu tiên, first-click và tree test từ xa (không cần điều phối) |
| 6–8 | 5–6 buổi task test có điều phối + phỏng vấn trên bản dựng hiện tại |
| 9 | Tổng hợp và ra quyết định; cập nhật thứ tự ưu tiên trong roadmap |
| Sau khi dựng | Chạy lại test 5 giây + nhiệm vụ 1, 2, 3 trên bản đã thiết kế lại |
