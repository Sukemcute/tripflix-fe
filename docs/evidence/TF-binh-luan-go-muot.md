# TF-binh-luan-go-muot — Khung bình luận gõ mượt, lưu nháp không chặn main thread

- Nhánh: `thanh/TF-binh-luan-go-muot` · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-20 · Commit code: `72ce836`

## Đã làm
- **Tách ô nhập bình luận thành `CommentComposer`** trong [`apps/web/src/features/social/live-posts.tsx`](../../apps/web/src/features/social/live-posts.tsx#L2756-L2984):
  - Đưa toàn bộ state gõ phím (`body`, `mentions`, `mentionQuery`, `isEmojiOpen`, `replyTarget`) vào trong `CommentComposer` (gắn `key={post.id}` tại [`RightPanelCommentsSynchronized`](../../apps/web/src/features/social/live-posts.tsx#L2550-L2750)), giao tiếp với component cha qua `useImperativeHandle` (`setReplyTarget`) và callback `useCallback` ổn định (`onSubmit`, `handleReplySelect`, `handleJumpToComment`).
  - Lý do đặt `CommentComposer` trong `live-posts.tsx`: dùng chung các thành phần nội bộ của `live-posts.tsx` (`styles`, `useApiSession`, `AvatarPhoto`, `getAvatarTone`, `SocialIcon`, `EmojiPicker`, `MentionPicker`, `renderMentionMirrorContent`), tránh export nội bộ và xáo trộn nhiều import.
- **Bọc `memo` cho `CommentNode`** tại [`live-posts.tsx`](../../apps/web/src/features/social/live-posts.tsx#L3011-L3520), truyền `onReplySelect` và `onJumpToComment` ổn định xuyên suốt cả cấp gốc lẫn cấp trả lời.
- **Tách `commentDraftStore` với debounce + flush tức thì** tại [`apps/web/src/features/social/comment-draft-store.ts`](../../apps/web/src/features/social/comment-draft-store.ts):
  - Đọc `sessionStorage` lười một lần (`read()`), giữ map nháp trong bộ nhớ module, debounce ghi xuống `sessionStorage` sau `400 ms` (`COMMENT_DRAFT_SAVE_DELAY_MS`).
  - Flush ngay khi `onBlur`, unmount / đổi bài (`post.id` đổi), gửi xong (xoá nháp), huỷ sửa (xoá nháp) và sự kiện `pagehide`. Bỏ qua ghi thừa nếu xoá một khoá chưa từng có nháp.
  - Áp dụng đồng bộ cho cả ô soạn mới lẫn ô sửa bình luận (khoá `edit:${postId}:${commentId}`).
- **Giảm cập nhật state thừa khi gõ `@mention` và ổn định props picker**:
  - Thêm `sameMentionQuery` (so sánh `query` và `atIndex`) và dùng functional update `setMentionQuery((prev) => (sameMentionQuery(prev, query) ? prev : query))` ở cả `CommentComposer` và `CommentNode`.
  - Bỏ qua các phím điều hướng `ArrowUp`, `ArrowDown`, `Enter`, `Tab`, `Escape` (`isMentionNavigationKey`) trong `onKeyUp` khi bảng tag đang mở hoặc khi vừa nhấn `Enter`/`Tab`/`Escape`.
  - Dùng `useCallback` cho `onSelect` và `onClose` của `MentionPicker` và `EmojiPicker` (không sửa `mention-picker.tsx`).

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Gõ phím vào composer không render lại danh sách `CommentNode` | Đạt | `comment-composer-structure.test.ts`; đo React Profiler (100 dòng): `0` render / `0` commit ở danh sách |
| `CommentNode` bọc `memo`, callback ổn định | Đạt | `live-posts.tsx#L3011`, `handleReplySelect`/`handleJumpToComment` dùng `useCallback` |
| Lưu nháp lazy read + debounce 400 ms + flush khi blur / đổi bài / gửi xong / `pagehide` | Đạt | `comment-draft-store.test.ts` (4/4 test pass với fake timers); `blurFlushed: true` trên trình duyệt thật |
| `setMentionQuery` không đổi tham chiếu khi trùng, bỏ qua phím điều hướng ở `onKeyUp` | Đạt | `comment-draft-store.test.ts`, `sameMentionQuery`, `isMentionNavigationKey` |
| Ổn định `onClose`/`onSelect` cho `MentionPicker`, `EmojiPicker` và áp dụng cho ô sửa | Đạt | `closeEmojiPicker`, `closeMentionPicker`, `closeEditMentionPicker`, `handleSelectEditMention` dùng `useCallback` |
| Không sửa `mention-picker.tsx`, không đổi giao diện, test cũ pass | Đạt | `git diff apps/web/src/features/social/mention-picker.tsx` rỗng; `77/77` file test (`519/519` test) pass |

## Đo React Profiler (trình duyệt headless Chrome, danh sách 100 phần tử, gõ 5 ký tự `abcde`)
| Kịch bản | Lượt render danh sách (5 phím, StrictMode) | Số commit ở danh sách | Thời gian render danh sách |
|---|---|---|---|
| Trước (state gõ ở component cha) | `1000` (`200`/phím StrictMode; `100`/phím production) | `5` | `11.10 ms` (~`2.22 ms`/phím) |
| Sau (tách `CommentComposer` + `memo` danh sách) | `0` | `0` | `0 ms` |

- Kiểm tra flush khi `blur` trên trình duyệt thật: `blurFlushed = true` (`sessionStorage['tripflix.comment_drafts']` lưu đủ `'abcde'`).

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=./apps/web`:
  - `lint`: `0` lỗi, `27` cảnh báo (dưới mốc `28`, `oxlint` trên 316 file).
  - `typecheck`: pass (`next typegen && tsc --noEmit`).
  - `test`: `77/77` file pass, `519/519` test pass (bao gồm `comment-draft-store.test.ts` 4 test, `comment-composer-structure.test.ts` 1 test, `mention-input.test.ts` 29 test, `mention-picker.test.tsx` 7 test, `comment-cache.test.ts` 18 test).

## Cách kiểm lại
1. Chạy `pnpm turbo run lint typecheck test --filter=./apps/web` tại `wt-fe-comment`.
2. Mở app thật trên web, vào một bài có nhiều bình luận (Reels hoặc Bài viết), gõ liên tục vào ô bình luận và kiểm bằng React DevTools Profiler: `CommentNode` không highlight/re-render; kiểm tra `sessionStorage['tripflix.comment_drafts']` ghi sau ~400 ms hoặc ngay khi blur / chuyển bài / F5 (`pagehide`).

## Ảnh / video
- Không đính kèm (không thay đổi giao diện).

## Ảnh hưởng tới phần của người khác
- Không đụng `apps/web/src/features/social/mention-picker.tsx` hay luồng Reels track/vuốt.
- Chỉ sửa `apps/web/src/features/social/live-posts.tsx` (thuộc `apps/web`, chủ sở hữu: anh Thành) và thêm 3 file mới (`comment-draft-store.ts`, `comment-draft-store.test.ts`, `comment-composer-structure.test.ts`).
