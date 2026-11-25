# TF111 — Gửi `fresh=true` khi tải trang đầu gợi ý bài viết

- Task: TF111 · Nhánh: `duy/TF111-posts-fresh-param` · Người làm: Lê Anh Duy (dùng AI: có) · Ngày: 2026-11-25
- Phụ thuộc BE: https://github.com/Sukemcute/tripflix-be/pull/331

## Đã làm

1. **Sinh lại client API từ OpenAPI contract mới của BE** (`pnpm gen:api`):
   - Cập nhật `packages/api-client/src/generated/core-api/discovery/discovery.ts`, `model/index.ts`, `model/postRecommendationsControllerRecommendPostsParams.ts`, `model/postRecommendationsControllerRecommendPostsFresh.ts` để endpoint `GET /api/recommendations/posts` nhận query param `fresh?: 'true' | 'false'`.
2. **Nối `fresh` vào helper & hook gợi ý bài viết**:
   - `packages/api-client/src/explore-search.ts`: cập nhật `recommendPublicPosts` nhận thêm `{ fresh = false }`, chỉ gửi `fresh: 'true'` khi chưa có `cursor`.
   - `packages/api-client/src/queries.ts`: trong `useSocialPosts`, khi gọi `recommendPublicPosts` (không lấy từ cache `recommendedPage`), truyền `{ fresh: !pageParam }` để mỗi lần tải trang đầu mới (F5 / `useResetOnReturn`) gửi `fresh=true`, còn các trang tiếp theo đi theo `cursor` giữ nguyên phiên.
3. **Cập nhật màn hình bài viết mobile (theo uỷ quyền của Trang)**:
   - `apps/mobile/src/features/feed/live-feed-screen.tsx`: `LiveFeedScreen` dùng `useIsFocused()` và truyền `'recommended'` + `refreshOnReturn: kind === 'public' && isFocused` cho `kind === 'public'` (`'mine'` và `'bookmarks'` giữ nguyên).
4. **Bổ sung unit test**:
   - `packages/api-client/src/recommend-public-posts.test.ts`: kiểm tra gửi `fresh=true` ở trang đầu khi bật `fresh`, bỏ qua khi có `cursor`, và bỏ qua theo mặc định.

## Đối chiếu "Xong khi"

| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Sinh lại API client có tham số `fresh` cho `GET /api/recommendations/posts` | Có | `PostRecommendationsControllerRecommendPostsParams.fresh` |
| Trang đầu gợi ý bài viết gửi `fresh=true`, trang sau theo `cursor` không gửi | Có | `explore-search.ts`, `queries.ts`, `recommend-public-posts.test.ts` (5/5 pass) |
| Mobile `LiveFeedScreen` (`public`) dùng gợi ý discovery và tải lại khi quay về màn | Có | `apps/mobile/src/features/feed/live-feed-screen.tsx` |
| Lint, typecheck, test pass | Có | `pnpm turbo run lint typecheck test --affected` |

## Kết quả kiểm tra

- `pnpm turbo run lint typecheck test --affected`: **23/23 task thành công** (`@tripflix/api-client`: lint 0 lỗi, 1 cảnh báo có sẵn; typecheck pass; test **39 files / 333 tests passed**, trong đó `recommend-public-posts.test.ts` 5/5 passed; `@tripflix/mobile`: lint/typecheck/test pass).

## Cách kiểm lại

1. Chạy `pnpm --filter @tripflix/api-client test -- src/recommend-public-posts.test.ts`.
2. Trên web hoặc mobile (kết hợp BE PR #331), mở màn/tab Bài viết khi đã đăng nhập, F5 hoặc rời màn rồi quay lại để xác nhận request trang đầu `GET /api/recommendations/posts?...&fresh=true` trả về loạt bài mới; cuộn tiếp sang trang 2 chỉ gửi `cursor` không gửi `fresh`.

## Ảnh / video

- Không thay đổi giao diện (`LiveFeedScreen` chỉ đổi nguồn dữ liệu công khai từ `'latest'` sang `'recommended'` và bật `refreshOnReturn`).

## Ảnh hưởng tới phần của người khác

- Có: `apps/mobile/src/features/feed/live-feed-screen.tsx` (chủ sở hữu: Trang — đã trao đổi và Trang giao cho Duy làm trực tiếp).
