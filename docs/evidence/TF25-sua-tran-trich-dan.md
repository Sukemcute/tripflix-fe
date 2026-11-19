# TF25 — Sửa tràn khung trích dẫn bình luận dài (#292)

- Nhánh: `thanh/TF25-sua-tran-trich-dan` (từ `origin/develop`) · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-19

## Nguyên nhân & đã sửa
- `.quoteCard` (`<button type="button">` flex column, `width: 100%`) và `.quoteTitle`/`.quoteExcerpt` nằm trong cây `display: grid` (`.panelCommentContent`, `.panelCommentItem`, `.panelCommentList`, `.panelReplyWrapper`) thiếu `min-width: 0` / `grid-template-columns: minmax(0, 1fr)`, nên nội dung `white-space: nowrap` làm cột bình luận giãn theo chiều dài chữ thay vì cắt `…`.
1. **`apps/web/src/features/social/reply-quote.module.css`:**
   - `.quoteCard`: thêm `min-width: 0; max-width: 100%; box-sizing: border-box; overflow: hidden;`.
   - `.quoteTitle`: thêm `min-width: 0; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;` để tên người được trả lời dài cũng cắt `…`.
   - `.quoteExcerpt` và `.quoteUnavailable`: thêm `min-width: 0` (`max-width: 100%` cho `.quoteExcerpt`).
2. **`apps/web/src/features/social/live-posts.module.css`:**
   - Thêm `min-width: 0` (và `grid-template-columns: minmax(0, 1fr)` cho các container `display: grid` một cột) ở `.panelCommentList`, `.panelCommentItem`, `.panelCommentRow`, `.panelCommentContent`, `.panelReplyWrapper`, không đổi bố cục khác (dùng chung cho cả Reels lẫn tab Bài viết, cả reply lẫn khung sửa bình luận).
3. **`apps/web/src/features/social/reply-quote.test.tsx`:**
   - Bổ sung test kiểm CSS `.quoteCard`, `.quoteTitle`, `.quoteExcerpt` và 5 class cột bình luận trong `live-posts.module.css` có `min-width: 0` và `text-overflow: ellipsis`.

## Kết quả kiểm tra
- `pnpm --filter @tripflix/web lint`: **28 warnings, 0 errors** (không tăng so với baseline).
- `pnpm --filter @tripflix/web typecheck`: **0 errors**.
- `pnpm --filter @tripflix/web test`: **45/45 files (329/329 tests) pass**, gồm `reply-quote.test.tsx` (`9/9 pass`).
- Đo DOM thực tế bằng headless Chrome trên HTML nạp trực tiếp `live-posts.module.css` + `reply-quote.module.css` (Reels panel `340px` kèm khung sửa bình luận + Bài viết `460px`, câu trích và tên rất dài):
  - Reels (`340px`): `.rightPanel` `scrollWidth === clientWidth === 340`; `.quoteCard` `scrollWidth === clientWidth === 191`; `.quoteTitle` `clientW=171, scrollW=515, textOverflow="ellipsis"`; `.quoteExcerpt` `clientW=171, scrollW=589, textOverflow="ellipsis"`; textarea khung sửa nằm gọn trong panel (`w=191`).
  - Bài viết (`460px`): container `scrollWidth === clientWidth === 460`; `.quoteCard` `scrollWidth === clientWidth === 311`; `.quoteExcerpt` `clientW=291, scrollW=589, textOverflow="ellipsis"`.

## Cách kiểm lại
1. `pnpm --filter @tripflix/web lint && pnpm --filter @tripflix/web typecheck && pnpm --filter @tripflix/web test`
