# TF113 — Lộ trình: hiển thị nội dung từ server (PR 2/3: lộ trình)

- Jira: [SCRUM-183](https://tripflix.atlassian.net/browse/SCRUM-183) · Nhánh: `trang/TF113-prefetch-lo-trinh` · Người làm: Trang (dùng AI: có) · Ngày: 2026-11-20
- Kế hoạch đã Thành duyệt, kèm 9 điểm sửa của Thành. Phạm vi PR này: trang lộ trình `/trip-plans/[postId]`. Khách sạn làm ở PR 3/3.

## Đã làm

- `packages/api-client`:
  - `seo.ts`: `getPostDetail` trả đúng hình dạng `socialApi.getPost` (`post`, `viewerContext`, `shareUrl`). `getPost` giữ nguyên, metadata không đổi.
  - `profile-query-keys.ts`: thêm `tripPlanPostQueryKey(postId, userId)`. `trip-plan-view.tsx` dùng cùng khoá.
- `apps/web`:
  - `features/seo/public-data.ts`: `findPublicPostDetail` (có `cache()`). `findPublicPost` lấy `.post` từ hàm này, nên metadata và prefetch dùng chung một lần gọi API.
  - `features/seo/trip-plan-hydration.ts` (mới): dựng trạng thái cho khoá ẩn danh (`user` undefined). Chi tiết null (lỗi, timeout, bài held/private) thì bỏ qua.
  - `features/social/trip-plan/trip-plan-gate.ts` (mới): hàm thuần quyết định có hiện skeleton. Có bài thì không chờ phiên sẵn sàng.
  - `features/social/trip-plan/trip-plan-view.tsx`: chỉ đổi đúng điều kiện skeleton (điểm 1 trong góp ý của Thành), và dùng khoá dùng chung.
  - `app/trip-plans/[postId]/page.tsx`: lấy chi tiết ở server, bọc trong `HydrationBoundary`.
- Không làm trong v1 (theo góp ý của Thành): hotel của từng chặng, chuyến tương tự (`usePostSearchFeed`), các bình luận, follow.

## Đối chiếu "Xong khi"

| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| HTML ẩn danh có tiêu đề và nội dung lộ trình | Đạt | `curl -A Googlebot` `next start`, API production, bài `018d9f20-…-005`: tiêu đề hiện 9 lần trong phần nội dung; có trạng thái dehydrate |
| Điều kiện skeleton không chặn khi đã có bài | Đạt | `trip-plan-gate.test.ts`, 5 ca gồm cả trường hợp phiên chưa sẵn sàng và có bài |
| Khoá khớp và tách người đăng nhập | Đạt | `trip-plan-hydration.test.ts`: khoá ẩn danh đọc được, khoá của `user-1` không đọc được |
| Bài held/private không bị hydrate sai | Đạt | Test "bỏ qua khi chi tiết null" |
| Người đã đăng nhập không nháy skeleton | **Chưa đo** | Cần quay video, như đã nói với Thành ở PR hồ sơ |
| Hydration mismatch trong console | **Chưa đo** | Cần mở trình duyệt thật |

## Kết quả kiểm tra

- `pnpm turbo run lint typecheck test --filter=./apps/web --filter=./packages/api-client --filter=./packages/i18n --force`: 9/9 task.
  - api-client: 37 file, 316 test pass.
  - web: 61 file, 425 test pass.
  - Lint: không có warning mới ở file đã sửa. Warning có sẵn: web 28, api-client 1.
- `next build`: thành công, `/trip-plans/[postId]` là route dynamic.
- Đo TTFB (`curl`, production API): lần đầu 0,228 giây. Chưa đo bản trước PR để so sánh.

## Lưu ý

- Điều kiện `hasPost` trong `trip-plan-gate` đi qua đúng một nhánh mới. Khi người dùng đăng nhập xong và khoá đổi sang `user.id`, dữ liệu chưa có thì skeleton hiện lại như cũ. Đây là điểm cần video để quyết định (theo góp ý của Thành về `session.ts`).
- `findPublicPost` (metadata) giờ đi qua `getPostDetail`, nên yêu cầu thêm `viewerContext` và `shareUrl`. API thật luôn trả đủ hai trường này vì client cũng yêu cầu.

## Việc còn lại

1. Video người đã đăng nhập mở một bài lộ trình (xem có nháy không).
2. Kiểm tra console khi chạy trình duyệt thật.
3. PR 3/3: khách sạn.

## Ảnh hưởng tới phần của người khác

- `apps/web/src/features/social/trip-plan/trip-plan-view.tsx` (chủ code: Thành): chỉ đổi điều kiện skeleton và khoá cache, theo đúng điểm Thành đã duyệt.
- `apps/web/src/app/trip-plans/[postId]/page.tsx` và `features/seo/public-data.ts`: thêm prefetch, không đổi kết quả metadata.
