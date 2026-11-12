# TF25 — Tối ưu cuộn toàn màn hình, lưu nháp bình luận và đồng bộ viewerContext trên Web

- Jira: [SCRUM-29](https://tripflix.atlassian.net/browse/SCRUM-29) · Nhánh: `thanh/TF25-toi-uu-trai-nghiem-feed-cam-hung` · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-11

## Đã làm
- **Cuộn toàn màn hình (/inspiration)**: Thêm CSS `feedPageWrapper` trong `apps/web/src/app/globals.css` cố định `100dvh`, ngăn chặn cuộn ngoài của trang web để trải nghiệm mượt mà giống Instagram/TikTok Web.
- **Cuộn chuột trên vùng đệm (`handleOuterWheel`)**: Xử lý sự kiện `wheel` trong `SocialFeedView` để người dùng lăn chuột ở lề ngoài thẻ bài thì cột feed bài viết vẫn cuộn tự nhiên.
- **Toggle bình luận**: Nhấn lại nút bình luận trên cùng một bài sẽ đóng panel thay vì luôn mở.
- **Lưu nháp bình luận (`sessionStorage`)**: Tự động lưu nội dung bình luận và mục tiêu trả lời trong `sessionStorage` (`tripflix.comment_drafts`) khi chuyển qua bài viết khác, khôi phục lại khi quay lại bài và xóa draft khi gửi thành công.
- **Đồng bộ `viewerContext`**: Nhận `myReaction` và `isBookmarked` từ DTO bài viết, cập nhật trực tiếp cache React Query khi like/save mà không bị lệch số đếm.
- **Lọc bài viết Reels**: Lọc các bài viết `postType !== 'vlog'` cho màn Reels feed, đồng thời giữ nguyên `postType` trong `ComposerModal`.
- **Hỗ trợ filter `post_type`**: Bổ sung tham số `postType?: 'video' | 'vlog'` vào hook `useSocialPosts`.
- **Khung tải bình luận Shimmer toàn khung (`CommentSkeletonList`)**:
  - 8 hàng (avatar tròn + 2 thanh chữ, bề rộng tự nhiên) lấp kín khung bình luận, hoạt ảnh `shimmer-sweep`; tắt hoạt ảnh khi người dùng chọn giảm chuyển động.
  - Chỉ là khung tải, không chứa nội dung: bình luận thật hiện khi API trả về, không bao giờ hiện bình luận mẫu.
  - Dùng ở `RightPanelCommentsSynchronized` (tab Cảm hứng) và `LiveComments` (trang chi tiết bài).
- **Tuân thủ token và i18n**: màu dùng token trong `packages/tokens` (`color-mix` cho độ trong suốt); chữ mới của `PostCard` đưa vào `packages/i18n`.
- **Panel bình luận phải**: màn rộng (≥1024px) mở sẵn qua `useSyncExternalStore` + `matchMedia`, giữ lựa chọn đóng/mở của người dùng; dò bài đang đọc dùng đúng trạng thái panel mới nhất.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Khóa cuộn trang ngoài khi ở tab Cảm hứng | Đạt | `globals.css` set `overflow: hidden !important` cho `feedPageWrapper` |
| Cuộn feed mượt mà kể cả khi trỏ chuột vào vùng đệm | Đạt | `handleOuterWheel` điều khiển `scrollTop` của `feedContainer` |
| Nhấn nút bình luận lần 2 đóng panel | Đạt | `handleToggleComment` trong `SocialFeedView` |
| Không mất nội dung bình luận đang gõ dở khi đổi bài | Đạt | `saveCommentDraft` và `getCommentDraft` qua `sessionStorage` |
| Like và Bookmark đồng bộ chuẩn xác với `viewerContext` | Đạt | `PostCard` và `SocialFeedView` map `viewerContext` |
| Khung tải bình luận Shimmer, không hiện nội dung giả | Đạt | `comment-skeleton.tsx`, `comment-skeleton.test.ts` |
| Tuân thủ quy tắc ranh giới FE | Đạt | `node tools/check-boundaries.mjs` -> "Luật FE: không có vi phạm." |
| Typecheck & Lint sạch sẽ | Đạt | `pnpm --filter @tripflix/web typecheck` (0 errors), `pnpm lint` (0 errors) |
| Unit tests pass 100% | Đạt | `pnpm turbo run lint typecheck test --filter=@tripflix/web --filter=@tripflix/api-client --filter=@tripflix/mobile --filter=@tripflix/i18n`: 11/11 task (web 12, api-client 171, i18n 2 test pass) |

## Kết quả kiểm tra
- `node tools/check-boundaries.mjs`: Luật FE: không có vi phạm.
- `pnpm --filter @tripflix/web typecheck`: 0 lỗi.
- `pnpm lint`: 0 lỗi.
- `pnpm turbo run lint typecheck test --filter=@tripflix/web --filter=@tripflix/api-client --filter=@tripflix/mobile --filter=@tripflix/i18n` (sau khi merge `origin/develop` ngày 2026-11-12): 11/11 task thành công; web 12, api-client 171, i18n 2 test pass; lint 0 lỗi.

## Cách kiểm lại
1. Mở `/inspiration`, thử lăn chuột ở khoảng trống lề ngoài cột giữa -> feed cuộn bình thường.
2. Mở panel bình luận của bài 1, gõ vài chữ -> bấm bài 2 -> bấm lại bài 1 -> nội dung vẫn còn nguyên.
3. Bấm icon bình luận của bài đang mở -> panel đóng lại.
4. Khi mở panel bình luận hoặc đổi bài: khung bình luận được lấp kín bởi các hàng shimmer cho tới khi bình luận thật tải xong; bấm vào khung không hiện nội dung nào.

## Ảnh hưởng tới phần của người khác
- Không ảnh hưởng module khác. Chỉ tác động tới giao diện và logic phân hệ Social trên Web.
