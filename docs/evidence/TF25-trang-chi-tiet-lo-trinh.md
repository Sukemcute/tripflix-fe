# TF25 — Trang chi tiết chuyến đi

- Notion: TF25 · Nhánh: `thanh/TF25-trang-chi-tiet-lo-trinh` · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-17

## Đã làm
- **Trước khi sửa:** nút "Xem chi tiết chuyến đi" ở sidebar lịch trình mở trang khách sạn đầu tiên của chuyến, nếu không có khách sạn thì mở trang tìm kiếm. Không có chỗ nào xem được cả chuyến; chuyến có nhiều khách sạn thì chỉ thấy khách sạn đầu.
- **Trang mới `/trip-plans/{postId}`**, chỉ xem (bước 1). Nút ở sidebar trỏ tới trang này.
  - **Đầu trang:**
    - Poster lấy theo thứ tự: poster lịch trình, rồi ảnh đầu của bài, rồi ảnh bìa theo điểm đến.
    - Điểm đến, tên chuyến, "4 ngày 3 đêm", chi phí/người.
    - Link tới trang cá nhân tác giả và link "Xem bài gốc".
  - **Lịch trình:**
    - Từng ngày, điểm dừng sắp theo giờ. Điểm không ghi giờ giữ đúng thứ tự tác giả nhập.
    - Mỗi điểm có nơi, ghi chú/mẹo, chặng di chuyển (chặng bay hiện `HAN → CXR`) và link "Mở bản đồ".
    - Ngày không có điểm nào ghi giờ thì không chừa cột giờ trống.
  - **Nơi ở:**
    - Dùng `getTripPlanStays` có sẵn trong `app-core`: một chuyến có thể có nhiều khách sạn, mỗi khách sạn ghi ngày vào → ngày ra và số đêm.
    - Ảnh, giá từ và toạ độ lấy qua `commerceApi.getHotel` (chỉ đọc).
    - Nút "Xem phòng" mở trang khách sạn; link bản đồ theo toạ độ.
    - Ảnh lỗi thì hiện icon thay thế.
  - **Chi phí ước tính:** kèm lưu ý giá của tác giả, hoặc câu mặc định nếu tác giả không ghi.
  - **Trạng thái khác:**
    - Đang tải: hiện khung xương.
    - Bài không có lịch trình, riêng tư hoặc đã gỡ: hiện "Không tìm thấy chuyến đi" kèm link về tab Cảm hứng.
- **Bố cục kiểu tạp chí** (theo đề xuất anh Thành duyệt; bản mô phỏng: artifact "Đề xuất trang chi tiết chuyến đi"):
  - Ảnh lớn phủ ngang, thẻ thông tin đè lên mép dưới:
    - tên, điểm đến, số ngày;
    - nút **Lưu chuyến** (chưa đăng nhập thì mở trang đăng nhập rồi quay lại) và **Chia sẻ** (dùng lại `ShareMenu`);
    - người đăng, lượt thích, lượt lưu, bình luận.
  - 4 ô số liệu nhanh: thời gian, số điểm dừng và khách sạn, chi phí, chặng bay (không có thì "Tự túc").
  - Thẻ điểm dừng: điểm khách sạn hiện giá theo đêm; ghi chú hiện thành "Mẹo của {tên}" trên nền ấm.
  - **Khoảnh khắc:** ảnh của bài; nếu bài là Reels thì ô lớn mở Reel ở tab Cảm hứng.
  - **Người đi trước nói gì:** dùng lại `CommunitySummary` (tóm tắt AI bình luận) kèm 2 bình luận đầu và link xem tất cả.
  - **Người lên lịch trình** và **chuyến tương tự** (tìm theo điểm đến bằng `usePostSearchFeed`, chỉ giữ bài có lịch trình).
- **Bản đồ:** chỉ có link mở Google Maps ở từng điểm. Bản đồ nhúng cần thêm thư viện và toạ độ của từng điểm, nên để sau.
- **Đặt theo lộ trình:** để bước 2. Phần này dùng lại logic `app-core` mà Thắng đã làm cho mobile ở TF105.
- Không đổi API, không thêm thư viện.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Nút "Xem chi tiết chuyến đi" mở chi tiết cả chuyến | Đạt | `itinerary-sidebar-panel.tsx` trỏ `/trip-plans/{postId}`; chạy thật với bài Nha Trang 4N3Đ |
| Lịch trình từng ngày đủ giờ, nơi, ghi chú, chặng bay | Đạt | `trip-plan-data.test.ts` (7 test: nhóm theo ngày, sắp theo giờ, link bản đồ, chặng bay) |
| Nơi ở theo đêm, nhiều khách sạn | Đạt | `getTripPlanStays` (đã có test ở `app-core`); chạy thật: "Ngày 1 → ngày 4 · 3 đêm", giá từ 1.090.000 VNĐ/đêm |
| Trang sống động: ảnh lớn, người đăng, số liệu, mẹo, khoảnh khắc, người đi trước nói gì, chuyến tương tự | Đạt | `trip-plan-data.test.ts` (thêm 3 test: chặng bay đầu, số điểm dừng, chuyến tương tự, tên ngắn tác giả); chụp thật 1440px và 390px |
| Bài không có lịch trình hoặc không xem được | Đạt | Chạy thật `/trip-plans/khong-co-bai-nay` hiện "Không tìm thấy chuyến đi" |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/web`: 3/3 task pass.
  - Test: 29 file pass, gồm `trip-plan-data.test.ts` 10/10.
  - Lint: 0 lỗi, 15 cảnh báo đều có từ trước.
- Chụp bằng Chrome headless ở 1440px và 390px (gửi trong phiên, không commit).
- Ở môi trường dev, link ảnh khách sạn trên CloudFront (`dev/unknown/images/...`) trả 403. Đây là lỗi dữ liệu môi trường, không do thay đổi này; trang hiện icon thay thế khi ảnh lỗi.

## Cách kiểm lại
1. `pnpm --filter @tripflix/web exec vitest run src/features/social/trip-plan`.
2. Mở `/inspiration`, chọn bài có lịch trình, bấm "Xem chi tiết chuyến đi"; hoặc mở thẳng `/trip-plans/<id bài>`.

## Ảnh / video
- Không đính kèm (theo yêu cầu).

## Ảnh hưởng tới phần của người khác
- Dùng `getTripPlanStays`, `getTripNights` trong `packages/app-core/src/trip-plan.ts` (Thắng) và `commerceApi.getHotel` (commerce): chỉ gọi, không sửa.
