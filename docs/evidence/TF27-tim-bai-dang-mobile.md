# TF27 — Mobile: Tìm trong bài đăng trên app và xử lý không có kết quả

- Jira: [SCRUM-31](https://tripflix.atlassian.net/browse/SCRUM-31) · Notion: TF27 · Nhánh: `duy/TF27-tim-bai-dang-app` · Người làm: Lê Anh Duy (dùng AI: có) · Ngày: 2026-11-09
- Backend: `POST /api/search/posts` (tripflix-be PR #73, commit `071bf05`, đã merge vào develop).

## Đã làm
- `packages/api-client`:
  - Thêm `getPostSearchResults(params)` và hook `usePostSearch(params)` vào `packages/api-client/src/explore-search.ts`.
  - Dùng `useQuery` cache theo `query`, `postType`, `cursor`, `limit`.
  - Export types và functions ở `packages/api-client/src/index.ts`.
  - Viết unit test cho `getPostSearchResults` trong `packages/api-client/src/explore-search.test.ts` (4/4 tests passed).
- `apps/mobile`:
  - Cập nhật `LiveSearchScreen` trong `apps/mobile/src/features/discovery/live-discovery-screens.tsx`:
    - Thanh tìm kiếm ô nhập câu tự nhiên với nút Xoá nhanh và nút Tìm kiếm.
    - Bộ lọc tab loại bài: **Tất cả**, **Lộ trình**, **Video**, **Bài viết** (`postType`).
    - Dải chip **Đã hiểu** (`UnderstoodChips`): hiển thị địa điểm đã nhận diện, ngân sách `≤ ... / người`, số ngày đi, từ đã sửa lỗi gõ chính tả.
    - Phân tách App và Web (`HotelWebRedirectCard`): Khi tìm thấy địa điểm (ví dụ: Đà Lạt), hiển thị thẻ gợi ý khách sạn với nút "Mở Web" để chuyển hướng sang TripFlix Web (`/hotels?q=...`) qua `Linking.openURL`, giữ trải nghiệm app tập trung vào social/bài đăng/video.
    - **Xử lý không có kết quả (Empty State & Relaxation Suggestions)**:
      - Khi không có bài viết phù hợp: Hiển thị Mascot và thông báo rõ ràng (không hiện bài viết lạc đề).
      - Đưa ra các gợi ý nới điều kiện:
        - Nút "Bỏ giới hạn giá" (loại bỏ từ khoá ngân sách khỏi câu tìm).
        - Nút "Xem mọi số ngày" (loại bỏ từ khoá số ngày/đêm khỏi câu tìm).
        - Nút "Tất cả bài tại [Địa điểm]".
        - Các gợi ý tìm kiếm xu hướng ("Đà Lạt chill", "Hội An", "Hà Giang 3N2Đ").
    - Danh sách kết quả bài viết (`PostSearchResultCard`):
      - Ảnh thumbnail, tag phân loại (`Lộ trình · 3N`, `Video`, `Bài viết`), tiêu đề, địa điểm, lý do khớp (`item.reason`), chi phí ước tính (`~... / người`).
      - Bấm vào mở chi tiết bài viết ngay trên app (`/trip/[slug]` với `slug = item.refId`).
      - Hỗ trợ phân trang: Nút "Tiếp tục" với `nextCursor` và nút "Trang trước".

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Tìm bài bằng ngôn ngữ tự nhiên trên app | Đạt | Tích hợp `usePostSearch` gọi `POST /api/search/posts`, máy hiểu tiếng lóng, không dấu, số ngày, ngân sách |
| Không bao giờ hiện bài đã ẩn | Đạt | Backend lọc qua `content.getVisiblePosts` trước khi trả kết quả |
| Xử lý không có kết quả rõ ràng & gợi ý nới điều kiện | Đạt | Empty state với Mascot Tripi, giải thích rõ lý do, cung cấp chip nới ngân sách/ngày và câu gợi ý |
| Phân tách rõ App và Web | Đạt | Bài viết xem trực tiếp trên app (`/trip/[slug]`); khách sạn/quán ăn điều hướng sang TripFlix Web qua deep link |

## Kết quả kiểm tra
- `pnpm --filter @tripflix/api-client test`: 14/14 test files pass (95 tests).
- `pnpm --filter @tripflix/mobile typecheck`: pass không có lỗi.
- `pnpm --filter @tripflix/mobile lint`: 0 warnings, 0 errors.
- `pnpm test` (Turbo): 5/5 tasks pass toàn bộ monorepo.
