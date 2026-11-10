# TF25 — Web và Mobile hiển thị tên tác giả bài viết và bình luận

- Jira: [SCRUM-29](https://tripflix.atlassian.net/browse/SCRUM-29) · Nhánh: `thanh/TF25-ten-tac-gia-web-mobile` · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-09
- Phạm vi: Hoàn thiện hiển thị tên hiển thị thật (`displayName` / `authorName`) của tác giả bài viết và bình luận trên Web & Mobile thay vì ẩn danh / fallback mã định danh.

## Đã làm
- **`packages/api-client/src/generated/core-api/model/socialPostDto.ts`**:
  - Thêm trường `authorName?: string | null` vào `SocialPostDto`, đồng bộ với OpenAPI contract từ backend (PR `tripflix-be` #104).
- **`apps/web/src/features/social/live-posts.tsx`**:
  - Truyền `post.authorName ?? reelCard?.author.name` vào hàm `formatAuthorDisplay` tại cả `MediaTrackItem` (danh sách cuộn media track) và `InspirationImmersiveViewer` (trình xem chi tiết cảm hứng).
- **`apps/web/src/features/social/post-detail.tsx`**:
  - Cập nhật hiển thị tên tác giả bài viết ưu tiên `post?.authorName?.trim() || vi.api.postAuthorFallback` khi xem bài viết của người khác.
- **`apps/mobile/src/features/feed/live-comments.tsx`**:
  - Cập nhật danh sách bình luận trên mobile ưu tiên hiển thị `comment.authorName`, fallback `comment.authorId.slice(0, 8)`.
- **`apps/mobile/src/features/feed/live-feed-screen.tsx`**:
  - Cập nhật thẻ bài viết feed (`LivePostCard`) và chi tiết bài viết (`LivePostDetailScreen`) trên mobile ưu tiên hiển thị `post.authorName`, fallback `post.authorId.slice(0, 8)`.

## Đối chiếu
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Tác giả bài viết trên web hiển thị đúng tên thật | Đạt khi BE trả `authorName` | Đã map `post.authorName` vào `formatAuthorDisplay` & `post-detail` |
| Tác giả bài viết & bình luận trên mobile hiển thị đúng tên thật | Đạt khi BE trả `authorName` | Đã map `post.authorName` & `comment.authorName` trên mobile screens |
| Phòng thủ fallback an toàn khi BE chưa có tên hoặc tài khoản bị xóa | Đạt | Fallback "Thành viên <id>" hoặc cắt ngắn ID 8 ký tự |
| Không vi phạm ranh giới module FE | Đạt | `node tools/check-boundaries.mjs` trả về: "Luật FE: không có vi phạm." |
| Typecheck & Lint sạch sẽ | Đạt | `pnpm --filter @tripflix/web typecheck` (0 errors), `turbo run lint` (0 errors) |
| Kiểm thử đơn vị | Đạt | `pnpm test` (5/5 packages thành công, 102/102 tests api-client passed) |

## Cách kiểm lại
1. Chạy Backend từ nhánh `thanh/TF25-ten-tac-gia-bai-viet` (PR tripflix-be #104).
2. Chạy Frontend Web từ nhánh `thanh/TF25-ten-tac-gia-web-mobile`.
3. Mở tab Cảm hứng (`/social/posts`) hoặc chi tiết bài viết (`/trips/:id`): tên tác giả hiển thị tên thật (ví dụ "Lê Quang Thành", "Lê Thị Thùy Trang") thay vì "Thành viên xxx".
4. Mở app Mobile: bài viết và bình luận hiển thị tên thật của tác giả.
