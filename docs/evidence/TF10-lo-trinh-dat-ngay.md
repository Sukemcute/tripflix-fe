# TF10 — Sheet lộ trình: nổi bật vé bay và chỗ ở, đặt ngay theo lịch trình

- Notion: (chưa có link) · Nhánh: `bao/TF10-lo-trinh-dat-ngay` (phụ thuộc nhánh `bao/TF10-reel-ti-le-tiktok`) · Người làm: Bảo (dùng AI: có) · Ngày: 2026-11-12

## Đã làm

- Thiết kế lại sheet "Xem lộ trình":
  - **Đầu sheet:** điểm đến, nhãn "N ngày · M đêm", và nhãn "Đặt được vé + phòng" khi lộ trình có chặng bay.
  - **Khung "Đặt y chang chuyến này":** chọn ngày khởi hành bằng `DateSingleField` có sẵn, cộng/trừ số người.
  - **Thẻ chuyến bay** (teal) và **thẻ khách sạn** (cam): nhãn "Tripflix đặt được", giá thật, số hiệu, giờ bay.
    - "Đổi điểm bay" chỉ hiện các sân bay có tuyến thật tới điểm đến; đổi thì cả chiều đi lẫn chiều về cùng đổi.
    - "Đổi chỗ ở" tìm khách sạn qua gợi ý của discovery.
  - **Điểm ăn chơi:** hiện gọn dưới nhãn "Gợi ý từ cộng đồng".
  - **Chân sheet:** tổng vé + phòng, "Nhờ Tripi đổi giúp", "Đặt ngay" (một đơn có cả vé và phòng, kèm `sourcePostId`).
- Thêm `applyTripPlanChoices` vào app-core để đổi sân bay nhà và khách sạn của lộ trình; có test.
- Không đổi BE: dùng trường `transport` của mục lịch đã có trên develop core (commit `a5c4d7c`).

## Kết quả kiểm tra

- `pnpm turbo run lint typecheck test --filter=@tripflix/mobile --filter=@tripflix/app-core --filter=@tripflix/i18n`: 8/8 task đạt.
  - app-core 89 test, i18n 2 test.
  - Mobile lint còn 1 cảnh báo có sẵn ở `reels-screen.tsx`.
- Kiểm trên Expo web 430×932 với bài Nha Trang (đã thêm 2 chặng bay vào database local để demo):
  - Như người đăng: SGN → CXR VJ135 06:45 giá 1.900.000đ, cộng Vinpearl Beach Nha Trang 3 đêm 3.260.000đ, tổng 7.180.000đ cho 2 người.
  - Đổi điểm bay sang HAN: HAN → CXR QH1023 12:00 giá 2.700.000đ, tổng tự cập nhật thành 8.320.000đ.
- Chưa bấm "Đổi chỗ ở" chọn khách sạn khác và chưa bấm "Đặt ngay", để không tạo đơn giữ chỗ.

## Cách kiểm lại

1. Chạy BE local và Expo web. Thêm chặng bay cho một bài có `hotelId`, qua trình soạn lộ trình hoặc database local.
2. Mở reel đó, bấm "Xem lộ trình". Đổi ngày, số người, điểm bay, chỗ ở; giá và tổng phải đổi theo.
3. Đăng nhập rồi bấm "Đặt ngay": app chuyển sang `/checkout` với cả vé lẫn phòng.

## Ảnh / video

- Đã chụp trên Expo web trong phiên làm việc. Còn thiếu ảnh chụp trên Android thật.

## Ảnh hưởng tới phần của người khác

- Có: `apps/mobile` (Trang) ở `trip-plan-sheet.tsx`. `packages/app-core` và `packages/i18n` chỉ thêm mới.
- Không đổi API.
