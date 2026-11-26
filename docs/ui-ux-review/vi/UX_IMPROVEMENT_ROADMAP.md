# Tripflix Mobile — Lộ trình cải thiện UX

**Ngày:** 2026-11-22 · Nguồn: [TRIPFLIX_MOBILE_UX_AUDIT.md](TRIPFLIX_MOBILE_UX_AUDIT.md), [VISUAL_DESIGN_CRITIQUE.md](VISUAL_DESIGN_CRITIQUE.md)
**Trạng thái:** chỉ là đề xuất. Chưa có gì được triển khai; việc triển khai chờ phê duyệt.

Công sức: **S** < 1 ngày · **M** 1–3 ngày · **L** > 3 ngày (một lập trình viên mobile). Độ tin cậy = mức chắc chắn rằng thay đổi cải thiện trải nghiệm, trước khi test người dùng.

---

## 1. 10 cải tiến có tác động lớn nhất (xếp hạng)

| # | Cải tiến | Ưu tiên | Màn hình | Tác động (người dùng / hình ảnh / UX) | Công sức | Độ tin cậy |
|---|---|---|---|---|---|---|
| 1 | **Cấu trúc lại điều hướng quanh lời hứa video → chuyến đi** | P1 | Tab, Khám phá, Đặt, Reels | Cao / TB / Cao | L | Trung bình — cần kiểm chứng |
| 2 | **Gỡ các điểm phá vỡ niềm tin ở màn bán hàng** | P0 trước khi ra mắt | Chi tiết khách sạn, Tìm kiếm, Bình luận, Hồ sơ | Cao / Thấp / Cao | S | Cao |
| 3 | **Đưa lối vào lộ trình trên Reels thành hành động chính** | P1 | Reels, sheet lộ trình | Cao / Cao / Cao | M | Trung bình–cao |
| 4 | **Giữ ngữ cảnh: mở lộ trình ngay trong tab hiện tại** | P1 | Khám phá → lộ trình, Reels → đặt | Cao / Thấp / Cao | M | Cao |
| 5 | **Hoàn tất chuyển đổi hệ thiết kế (một thang chữ, một thanh tab)** | P1 | Tất cả | TB / Cao / TB | M–L | Cao |
| 6 | **Khám phá đặt cảm hứng lên trước** | P1 | Khám phá | Cao / Cao / TB | M | Trung bình — cần kiểm chứng |
| 7 | **Hoàn thiện mọi trạng thái (trống, lỗi, không tìm thấy, đang tải)** | P1 | Phòng, trang tác giả, giỏ, lộ trình đã lưu, đang tải tìm kiếm | TB / TB / Cao | M | Cao |
| 8 | **Đơn giản hóa Tìm kiếm** | P2 | Tìm kiếm | TB / TB / TB | S–M | Cao |
| 9 | **Một "Đã lưu" duy nhất với tab Video · Lộ trình** | P2 | Đã lưu, Lộ trình đã lưu, Tôi | TB / Thấp / TB | M | Trung bình |
| 10 | **Nền tảng khả năng tiếp cận (chữ ≥ 12 px, vùng chạm 44 px, icon đúng nghĩa, cỡ chữ động)** | P1 | Tất cả | TB / Thấp / Cao | M | Cao |

### 1. Cấu trúc lại điều hướng quanh lời hứa
- **Vấn đề.** Các tab đọc thành "video + OTA". Khám phá = tìm khách sạn/vé máy bay; Đặt = hỏi Tripi / tự lên lộ trình; lộ trình nằm lơ lửng giữa hai tab; badge thông báo nằm trên Khám phá.
- **Khuyến nghị (giả thuyết cần test, hai phương án):**
  - **A — thay đổi tối thiểu:** Reels · Khám phá · (+) · **Chuyến đi** · Tôi. "Chuyến đi" = chuyến sắp tới, lộ trình đã lưu, bản nháp, sau đó tới "Nhờ Tripi" / "Tự lên lộ trình". Tìm khách sạn/vé máy bay chuyển vào thanh tìm kiếm của Khám phá. Badge chuyển sang Tôi (hoặc chuông ở tiêu đề Reels).
  - **B — lấy cảm hứng từ Stitch:** Reels · Khám phá · **Tripi (ở giữa)** · Chuyến đi · Tôi, nút Tạo thành dấu + trên Reels/Tôi. Định vị AI mạnh hơn, định vị creator yếu hơn.
- **Lợi ích kỳ vọng:** mỗi tab trả lời một câu hỏi (xem / tìm / chuyến của tôi / tôi); bớt lối vào trùng lặp.
- **Phụ thuộc:** phương án A không cần BE; B thay đổi lối vào tạo bài (quyết định sản phẩm). Quyết định D2 của nhóm ("giữ menu cũ") cần được xem xét lại một cách rõ ràng.
- **Kiểm chứng:** tree test + test hiểu điều hướng (kế hoạch §3.4) trước khi làm.

### 2. Gỡ các điểm phá vỡ niềm tin (việc nhanh, làm trước)
- Ẩn khoảng cách mẫu ở mục "Khám phá xung quanh" và ghi chú "dữ liệu mẫu" ở chi tiết khách sạn cho tới khi có dữ liệu thật (`hotel-detail-sections.tsx`).
- Thay "TRIPFLIX WEB · Mở Web" ở tìm kiếm bằng link trong app tới kết quả khách sạn.
- Tên dự phòng "Người dùng Tripflix" + avatar chữ cái đầu thay cho mảnh ID; "Tác giả" → handle của creator hoặc cùng tên dự phòng.
- Bỏ ô/chip "Sắp có" (Limousine, Tour, Thư mục).
- Banner lỗi: icon cảnh báo + màu lỗi, không bao giờ dùng khiên có dấu tích.
- **Lợi ích:** loại bỏ những khoảnh khắc khiến người dùng kết luận "cái này không thật". **Công sức:** S. **Kiểm chứng:** chỉ cần QA.

### 3. Lối vào lộ trình trên Reels là hành động chính
- Thay nút "Xem lộ trình" 30 px bằng thẻ chip lộ trình trên caption: ảnh nhỏ hoặc icon tuyến · "Đà Lạt · 3N2Đ" · "từ 1,76tr/người" (chỉ khi bài có kế hoạch có giá) · mũi tên. Cao tối thiểu 52 px.
- Chân sheet lộ trình: [icon Tripi] [icon Lưu] [Đặt lộ trình này — nút chính, co giãn].
- **Phụ thuộc:** giá "từ" trên kế hoạch chuyến đi của bài viết (kiểm tra hợp đồng `trip-plans`; nếu chưa có thì chỉ hiện tuyến + số ngày — khái niệm UI, không bịa giá).
- **Kiểm chứng:** test so sánh ưu tiên A/B + first-click trên hai mock-up reel (kế hoạch §3.3).

### 4. Giữ ngữ cảnh
- Chi tiết lộ trình được đẩy thành màn stack trong tab xuất phát (Reels hoặc Khám phá); tab đang chọn không bao giờ đổi khi chạm vào nội dung. Back quay về đúng reel/vị trí cuộn.
- **Phụ thuộc:** nhóm route theo tab trong Expo Router (route `trip-plans/[postId]` dùng chung được render trong stack của từng tab). **Kiểm chứng:** task test "tìm một chuyến từ Khám phá, xem nó, rồi quay lại chỗ đang xem".

### 5. Hoàn tất chuyển đổi hệ thiết kế
- Bỏ `compactType` (18 file) và `colors.*` cũ (25 file), chuyển sang `explorer`; quy tắc tiêu đề (không tiêu đề trùng); thanh tab Ngày trên màn không phải media; giữ `onPrimary` màu trắng (quyết định chủ sản phẩm) và chỉ dùng cho nhãn nút đậm; một `Segmented`, một `StateScreen`.
- **Lợi ích:** nhất quán; mọi màn mới đều thừa hưởng đúng diện mạo. **Công sức:** M–L, việc cơ học nhưng rộng. **Kiểm chứng:** so ảnh chụp từng màn + unit test độ tương phản (đã nằm trong kế hoạch Phase 2 của docs/ui-redesign).

### 6. Khám phá đặt cảm hứng lên trước
- Thứ tự: tiêu đề + thanh tìm kiếm thu gọn → chip điểm đến → lưới lộ trình (ảnh bìa creator) → thẻ gợi ý Tripi → một carousel khách sạn có chip lọc (Ưu đãi · Cuối tuần · Đánh giá cao).
- Form khách sạn/vé máy bay mở khi chạm thanh tìm kiếm (sheet hoặc toàn màn).
- **Phụ thuộc:** không (dữ liệu đã có). **Kiểm chứng:** test 5 giây + first-click so sánh bản hiện tại và bản đề xuất.

### 7. Hoàn thiện mọi trạng thái
- Phòng & giá: trống ("Chưa có phòng trống cho ngày này — đổi ngày"), lỗi, skeleton khi tải.
- Trang tác giả: tiêu đề "Hồ sơ" khi không tìm thấy; CTA quay lại.
- Giỏ và Lộ trình đã lưu: cùng mẫu trạng thái trống như Đã lưu, có CTA.
- Tìm kiếm: skeleton thay cho ba chấm trên trang trống.
- Ảnh dự phòng: gradient lặng lẽ.
- **Công sức:** M. **Kiểm chứng:** checklist QA cho từng trạng thái.

### 8. Đơn giản hóa Tìm kiếm
- Thứ tự: ô nhập → diễn giải "Đã hiểu: Đà Lạt" (đổi thành "Hiểu là:") → tab loại (Tất cả · Lộ trình · Video · Bài viết · Khách sạn) → kết quả; sắp xếp thành một nút dropdown.
- **Công sức:** S–M.

### 9. Một "Đã lưu"
- `/saved` với tab Video · Lộ trình; Tôi chỉ có một lối tắt "Đã lưu" kèm số lượng.
- **Phụ thuộc:** không (hai danh sách đã có). Bộ sưu tập = tính năng tương lai, không hiển thị cho tới khi làm xong.

### 10. Nền tảng khả năng tiếp cận
- Chữ tối thiểu 12 px (nhãn tab 11–12 kèm icon; chip 14); tab trên Reels và nút lộ trình có vùng chạm ≥ 44 px; chữ trắng trên coral chỉ cho nhãn nút đậm; kiểm tra cỡ chữ động tới 200 % trên Android; một lượt TalkBack qua thanh hành động Reels, các sheet và luồng đặt chỗ.
- **Kiểm chứng:** test trên thiết bị với TalkBack và cỡ chữ lớn nhất.

---

## 2. Việc nhanh và thiết kế lại cấu trúc

### Việc nhanh (mỗi việc ≤ 1 ngày, rủi ro thấp, không cần quyết định sản phẩm)
1. Bỏ khoảng cách mẫu / ghi chú "dữ liệu mẫu" (chi tiết khách sạn).
2. Thay "Mở Web" bằng link kết quả khách sạn trong app.
3. Tên dự phòng (bình luận, tác giả reel).
4. Bỏ ô và chip "Sắp có".
5. Đúng nghĩa icon lỗi (cảnh báo, không phải khiên).
6. Kiểu CTA vô hiệu + chữ gợi ý.
7. Kiểm tra mọi nút coral có nhãn đậm, đủ lớn cho chữ trắng (quyết định chủ sản phẩm); không dùng chữ trắng nhỏ trên coral.
8. Tiêu đề trang tác giả khi không tìm thấy.
9. Nội dung trạng thái trống/lỗi của Phòng.
10. Bỏ slogan khỏi phần giới thiệu hồ sơ; rút ngắn nhãn segment ở Tôi để không xuống dòng.
11. Chuyển badge chưa đọc từ Khám phá sang Tôi (hoặc chuông ở tiêu đề Reels).

### Thay đổi cấu trúc (cần duyệt thiết kế, có thể cần test)
1. Kiến trúc tab (Roadmap #1).
2. Khám phá đặt cảm hứng lên trước (#6).
3. Stack lộ trình trong tab / giữ ngữ cảnh (#4).
4. Thẻ lộ trình trên Reels (#3).
5. Chuyển đổi thang chữ và màu trên hơn 25 file (#5).
6. Gộp Đã lưu (#9).

---

## 3. Phụ thuộc

| Hạng mục | Phụ thuộc vào |
|---|---|
| Giá "từ" trên Reels | Phản hồi `trip-plans` có tổng giá/giá từ (kiểm tra hợp đồng; nếu không thì chỉ tuyến + số ngày) |
| Ảnh khách sạn thật | Ảnh khách sạn được tải lên đúng đường dẫn CDN mà seed tham chiếu (hiện trả 403 ở dev) |
| Chip ngân sách (Stitch) | Bộ lọc khoảng giá trong API discovery — tính năng tương lai |
| Bộ sưu tập Đã lưu (Stitch) | Bộ sưu tập ở backend — tính năng tương lai |
| Đổi tab | Xem lại rõ ràng quyết định D2 của nhóm |

## 4. Yêu cầu kiểm chứng

| Thay đổi | Phương pháp (xem kế hoạch kiểm chứng) | Tín hiệu đạt |
|---|---|---|
| Kiến trúc tab A vs B vs hiện tại | Tree test + first-click, n ≥ 12 mỗi phương án | ≥ 80 % chạm đúng lần đầu với "tìm kế hoạch chuyến đi" và "xem đơn đã đặt" |
| Thứ tự Khám phá | Test 5 giây + so sánh ưu tiên | Người dùng nhớ chuyến đi/video, không chỉ khách sạn; ≥ 60 % chọn bản đề xuất |
| Thẻ lộ trình trên Reels | So sánh ưu tiên + first-click | ≥ 70 % nhận ra và chạm vào lối vào lộ trình |
| Giữ ngữ cảnh | Task test | Người dùng quay lại đúng reel mà không phải tìm |
| Chuyển đổi hình ảnh | Chấm ấn tượng đầu trước/sau | Điểm "hiện đại" và "làm cho mình" cao hơn |
| Khả năng tiếp cận | TalkBack + cỡ chữ 200 % | Hoàn thành được mọi tác vụ chính |

## 5. Trình tự đề xuất

1. **Tuần 1:** việc nhanh 1–11; song song chạy tree test và test 5 giây trên mock-up cho #1, #3, #6.
2. **Tuần 2:** chuyển đổi hệ thiết kế (#5) và hoàn thiện trạng thái (#7) — không cần quyết định sản phẩm.
3. **Tuần 3:** các hạng mục cấu trúc được chọn dựa trên kết quả test (#1, #3, #4, #6), sau đó #8, #9.
4. Chạy lại test ấn tượng đầu trên bản đã dựng.
