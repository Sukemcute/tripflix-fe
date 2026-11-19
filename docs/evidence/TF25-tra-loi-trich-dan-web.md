# TF25 — Trả lời kiểu TikTok có khung trích dẫn trên Web

- Phạm vi: Phần 2 trong `reply-quote.md` · Nhánh: `thanh/TF25-tra-loi-trich-dan-web` (từ `origin/develop`) · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-19

## Đã làm
1. **Cập nhật contract & i18n (`packages/api-client/src/generated/core-api/model/socialCommentDto.ts`, `packages/i18n/src/api.ts`):**
   - Sinh lại model `SocialCommentDto` từ OpenAPI của BE để thêm `replyToCommentId: string | null` và `replyToExcerpt: string | null`.
   - Thêm key `commentReplyQuoteTitle` (`"Trả lời {name}"`) và `commentQuoteUnavailable` (`"Bình luận không còn hiển thị"`).
2. **Component `<ReplyQuote>` & hàm điều hướng (`apps/web/src/features/social/reply-quote.tsx`, `reply-quote.module.css`):**
   - `shouldShowReplyQuote`: chỉ hiện khung trích dẫn khi `isReply && replyToCommentId && parentCommentId && replyToCommentId !== parentCommentId` (chỉ reply trả lời vào reply khác trong luồng; trả lời thẳng bình luận gốc không hiện).
   - Giao diện khung trích dẫn nhỏ gọn, nền dịu theo token `--color-surface-muted`, bo góc vừa, chữ gọn 1 dòng có `ellipsis`, không viền đậm/mũi tên/glow/neon/blur. Nếu `replyToExcerpt === null`, hiển thị chữ xám nghiêng `"Bình luận không còn hiển thị"` (không bấm được).
   - `scrollToQuotedComment`: tìm `[data-comment-id]` trong `scrollContainer` của panel bình luận, cuộn **chỉ trong `scrollContainer`** (không cuộn cả trang) và tô sáng nhẹ bằng token `--color-sea-mist` trong `1,5s` (nếu câu đích chưa tải trong DOM thì bỏ qua).
3. **Tích hợp `CommentNode` & bỏ `↳ Tên` (`apps/web/src/features/social/live-posts.tsx`, `live-posts.module.css`):**
   - Gỡ `{comment.replyToName && \` ↳ ${comment.replyToName}\`}` khỏi dòng tên tác giả; gắn `data-comment-id={comment.id}` và render `<ReplyQuote>` khi `shouldShowReplyQuote` đúng.
4. **Cache trả lời theo thứ tự ASC (`apps/web/src/features/social/comment-cache.ts`):**
   - `addCommentToCache`: giữ bình luận gốc chèn đầu trang 1 (`DESC`), nhưng với trả lời (`parentCommentId` có giá trị) thì **nối vào cuối trang cuối đã tải** khớp thứ tự cũ trước (`ASC`).
5. **Unit tests (`apps/web/src/features/social/reply-quote.test.tsx`, `comment-cache.test.ts`, `comment-service.test.ts`, `packages/api-client/src/comment-like-cache.test.ts`):**
   - Kiểm `shouldShowReplyQuote`, `renderToStaticMarkup` của `<ReplyQuote>` (có excerpt vs `null` vs thiếu tên), `scrollToQuotedComment` chỉ cuộn container + tô sáng tắt sau 1500ms, bỏ qua an toàn khi đích chưa tải, và test cache trả lời multi-page nối cuối danh sách.

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/web --filter=@tripflix/api-client --filter=@tripflix/i18n`: **9/9 tasks pass**:
  - `@tripflix/web`: `oxlint` **28 warnings, 0 errors** (không tăng so với baseline); `next typegen && tsc --noEmit` **0 errors**; `vitest run` **43/43 files (314/314 tests) pass**, gồm `reply-quote.test.tsx` (`8/8`) và `comment-cache.test.ts` (`18/18`).
  - `@tripflix/api-client`: `oxlint` **0 errors** (1 warning cũ ở `notifications-realtime.ts`); `tsc --noEmit` **0 errors**; `vitest run` **34/34 files (292/292 tests) pass**.
  - `@tripflix/i18n`: `oxlint` **0 warnings, 0 errors**; `tsc --noEmit` **0 errors**; `vitest run` **1/1 file (2/2 tests) pass**.

## Cách kiểm lại
1. `pnpm turbo run lint typecheck test --filter=@tripflix/web --filter=@tripflix/api-client --filter=@tripflix/i18n`

## Ảnh / video
- Không áp dụng (chủ yếu unit test logic/markup + kiểm tra tĩnh; không mở dev server browser vì BE nằm ở worktree riêng).

## Ảnh hưởng tới phần của người khác
- Chỉ sửa vùng `apps/web/src/features/social/*`, `packages/i18n/src/api.ts`, `packages/api-client/src/generated/core-api/model/socialCommentDto.ts`, và `packages/api-client/src/comment-like-cache.test.ts`. Không đụng `apps/mobile` hay code ngoài luồng bình luận.
