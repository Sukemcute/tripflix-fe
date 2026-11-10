# TF12 — Giao diện khối gợi ý trang chủ Bento Box (phần FE)

- Notion: https://app.notion.com/40dcb9b9e5c2812eb772e44063a4c66c · Nhánh: `duy/TF12-web-goi-y-trang-chu` · Người làm: Duy (dùng AI: có) · Ngày: 2026-11-08

## Đã làm
- Xây dựng component `OtaHomeRecommendations` hiển thị khối gợi ý "Gợi ý dành cho bạn" trên trang chủ theo mô hình Bento Box 3 card (Box 1: Cảnh quan & lý do nên đến, Box 2: Khách sạn deal tốt nhất, Box 3: Quán cà phê & trải nghiệm đặc sắc).
- Box 2 hiển thị khách sạn có ưu đãi lớn nhất tại điểm đến, tinh giản typography (tiêu đề max 22px, clamp 1 dòng), đưa thông tin các deal còn lại xuống dòng hành động cuối thẻ (`Khám phá thêm X deal hời →`), click dẫn thẳng sang trang tìm kiếm kèm lọc theo điểm đến.
- Lớp gradient phủ tối được tối ưu bắt đầu từ 30% và trong suốt dần từ 72% để làm nổi bật cảnh quan thực tế mà không che khuất hình ảnh.
- Tích hợp kho ảnh chất lượng cao cho các điểm đến du lịch nổi bật của Việt Nam trong `apps/web/public/brand/destinations/` với cơ chế fallback 4 tầng (`ota-destination-assets.ts`).
- Bổ sung bộ điều hướng tuần hoàn (Carousel) với thanh tiến trình tự động chạy, nút mũi tên tới/lui và thanh chọn nhanh các điểm đến (topic pills).
- Đồng bộ OpenAPI client `@tripflix/api-client` nhận danh sách điểm đến và khách sạn deal hời từ backend.

## Đối chiếu "Xong khi"
| Tiêu chí (chép từ Notion) | Đạt | Bằng chứng (tên test, lệnh, ảnh, link) |
|---|---|---|
| Trang chủ web có khối gợi ý kèm lý do | Đạt | Khối gợi ý Bento Box 3 card hiển thị đẹp mắt, đầy đủ deal hời và ảnh thực tế |
| Box 2 hiển thị nơi lưu trú deal hời | Đạt | Hiển thị khách sạn giảm giá sâu nhất kèm thông báo số lượng deal hời còn lại |

## Kết quả kiểm tra
- `pnpm lint` (`apps/web`): 0 lỗi.
- `pnpm typecheck` (`web`): 0 lỗi.
- `pnpm test` (`@tripflix/api-client`): 14 test files, 84/84 tests passed.
- `node tools/check-boundaries.mjs`: Không có vi phạm ranh giới kiến trúc.

## Cách kiểm lại
1. Chạy full stack `pnpm stack:up` hoặc chạy `pnpm --filter web dev`.
2. Truy cập `http://localhost:3100`, cuộn xuống dưới phần tìm kiếm để xem khối "Gợi ý dành cho bạn".
3. Thử chuyển giữa các điểm đến (Đà Lạt, Nha Trang, Phú Quốc...) bằng nút mũi tên hoặc pill bên dưới.

## Ảnh / video
- Đã đính kèm ảnh chụp màn hình khối gợi ý Box 2 và toàn bộ Bento Box trên trang chủ trong PR.

## Ảnh hưởng tới phần của người khác
- Không làm ảnh hưởng tới luồng tìm kiếm hay đặt phòng sẵn có.
- Có chỉnh nhẹ `soft-date-picker.tsx` và `stay-search.ts` để đồng bộ múi giờ Việt Nam giữa SSR và Client chống hydration mismatch.
