# TF11 — Tab khách sạn, địa điểm, quán ăn, quán nước ở grid tìm kiếm web

- Notion: — · Nhánh: `duy/TF11-tab-tim-kiem-web` · Người làm: Duy (dùng AI: có) · Ngày: 2026-11-17
- Phụ thuộc BE: `POST /api/search/places` ở nhánh `duy/TF11-index-diem-tham-quan` (tripflix-be). Merge PR BE trước.

## Đã làm
- Grid tìm kiếm trang Cảm hứng có 7 tab: Tất cả · Khách sạn · Địa điểm · Quán ăn · Quán nước · Bài viết · Reels. Tab nằm trên URL (`?type=cafe`), giá trị lạ thì về Tất cả.
- **Tất cả** gọi `POST /api/search` và vẽ theo vùng discovery trả về (vùng hợp ý câu tìm lên trước): chip "Đã hiểu", mỗi vùng có tổng và nút "Xem tất cả" sang tab tương ứng; không có kết quả khớp đủ câu thì hiện "Kết quả gần nhất".
- **Khách sạn, Địa điểm, Quán ăn, Quán nước** gọi `POST /api/search/places` (hook `usePlaceSearchFeed`), có nút "Xem thêm".
- Bấm thẻ: khách sạn mở `/hotels/{id}`; bài, Reel mở ở trang Cảm hứng như cũ; địa điểm ngoài Tripflix mở Google Maps theo toạ độ (không đặt được). Có điểm OpenStreetMap thì hiện dòng "© OpenStreetMap contributors (ODbL)" (giấy phép ODbL).
- Tab Bài viết, Reels giữ nguyên cách chạy (tách thành component con `PostResults`).
- Xoá `features/discovery/explore-results.tsx` (+ CSS): không còn trang nào dùng, phần chip "Đã hiểu" chuyển sang component mới.
- `pnpm gen:api` từ contract BE mới; chỉ giữ thay đổi của `searchPlaces`, phần ai-service để nguyên như develop.

## Đối chiếu "Xong khi" (PRD 0.3.1, F4)
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Kết quả chia tab theo loại: Tất cả, Khách sạn, Địa điểm, Quán ăn, Quán nước, Bài viết, Reels | Có | `search-url.test.ts` › tab kết quả tìm kiếm; chạy web thật |
| Tab Tất cả chia theo vùng, vùng hợp ý câu tìm lên trước | Có | "cà phê đà lạt": Cà phê (15) → Ăn gì → Chơi gì → Ở đâu → Lộ trình → Bài viết → Video |
| Địa điểm ngoài OTA không có nút đặt, mở được bản đồ, kèm ghi nguồn | Có | Thẻ quán là link Google Maps; dòng ghi nguồn cuối danh sách |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/web --filter=@tripflix/api-client --filter=@tripflix/i18n`: 9/9 task pass; test web 127, api-client 234, i18n 2. Lint 0 lỗi (cảnh báo còn lại có từ trước, không ở file của task).
- Chạy thật: web dev (cổng 3100) + core-api build từ nhánh BE:
  - `/inspiration?q=cà phê đà lạt`: tab Tất cả đủ các vùng, dòng ghi nguồn OSM.
  - Tab Quán nước: 12 quán, "Xem thêm", `POST /api/search/places` → 200.
  - Đã sửa: thẻ lặp nơi và giá (lý do của discovery đã có sẵn).

## Cách kiểm lại
1. Chạy core-api từ nhánh BE `duy/TF11-index-diem-tham-quan` (`pnpm stack:be` trong tripflix-be).
2. `pnpm --filter @tripflix/web dev`, mở `/inspiration?q=cà phê đà lạt`.
3. Bấm từng tab; bấm thẻ khách sạn, quán, bài.

## Ảnh / video
- Đính kèm trong PR.

## Ảnh hưởng tới phần của người khác
- Có: `apps/web/src/features/social/` (`search-results-grid.tsx`, `search-url.ts`, `inspiration-view.tsx`, CSS) của **Thành**. Thành đã giao phần trang tìm kiếm cho Duy. `onOpenPost` của grid đổi từ nhận bài sang nhận id bài (chỉ `inspiration-view.tsx` dùng).
