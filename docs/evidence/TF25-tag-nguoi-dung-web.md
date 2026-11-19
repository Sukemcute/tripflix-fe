# TF25 — Tag người dùng trong bình luận (Web)

- Task: TF25 · Nhánh: `thanh/TF25-tag-nguoi-dung-web` · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-19

## Đã làm
- **`apps/web/src/features/social/mention-input.ts`**:
  - Viết các hàm thuần quản lý tag người dùng trong bình luận:
    - `getMentionQueryAtCursor`: phát hiện `@query` tại vị trí con trỏ (hợp lệ khi ở đầu chuỗi hoặc sau khoảng trắng, không bắt `@` trong email, kiểm tra độ dài và không cho phép ký tự xuống dòng / điều khiển).
    - `insertMentionTag`: chèn tag `@displayName ` vào vị trí con trỏ, dịch chuyển offset của các tag phía sau, bỏ tag chồng lấn, giữ tối đa 10 tag.
    - `updateMentionsOnTextChange`: thuật toán diff văn bản chuẩn xác; dịch chuyển offset khi sửa chữ phía trước tag, giữ nguyên khi sửa phía sau, tự động loại bỏ tag nếu người dùng xoá ký tự `@` hoặc sửa chữ bên trong tag.
    - `validateMentions`: kiểm tra tính hợp lệ của toạ độ, bắt đầu bằng `@`, loại bỏ trùng lặp và chồng lấn.
    - `parseCommentSegments`: tách văn bản thành các phân đoạn `text` và `mention` để hiển thị; dữ liệu cũ không có `mentions` vẫn trả về text bình thường.
  - Unit test đầy đủ: `mention-input.test.ts` (25 test cases bao phủ toàn bộ các trường hợp biên).

- **`apps/web/src/features/social/mention-picker.tsx` + `mention-picker.module.css`**:
  - Bảng gợi ý tag người dùng hiển thị phía trên ô nhập bình luận (đồng bộ kiểu dáng bảng emoji sẵn có).
  - Tìm kiếm người dùng qua `useUserSearch` / `searchUsers` (`GET /v1/users/search`) với avatar, màu tone avatar và tên hiển thị.
  - Điều khiển bằng bàn phím ↑ ↓ Enter Esc:
    - Mũi tên lên / xuống: di chuyển chọn người dùng trong danh sách.
    - Enter: xác nhận chèn tag người dùng đã chọn vào ô nhập.
    - Esc: đóng bảng gợi ý.
    - Chuột: click chọn trực tiếp, `onMouseDown` chặn mất focus để con trỏ ô nhập luôn sẵn sàng gõ tiếp.
  - Thiết kế gọn gàng kiểu TikTok / Facebook: không neon, không glow, không blur, không đổ bóng màu, không nhãn thừa.
  - Unit test: `mention-picker.test.tsx` (4 test cases kiểm tra các trạng thái gợi ý, đang tìm kiếm, không có kết quả và hiển thị danh sách).

- **`apps/web/src/features/social/comment-service.ts`**:
  - Gom phần gọi API đăng bình luận (`createCommentWithMentions`) và sửa bình luận (`editCommentWithMentions`) ở một chỗ tập trung.
  - Chuẩn bị sẵn tham số `mentions?: [{userId, offset, length}]` để khi BE hoàn thiện và sinh lại `packages/api-client` (`pnpm gen:api`) thì chỉ cần nối trường trực tiếp mà không cần sửa rải rác.

- **`apps/web/src/features/social/live-posts.tsx` + `live-posts.module.css`**:
  - Tích hợp `MentionPicker` và logic mentions vào `RightPanelCommentsSynchronized` (dùng chung cho cả Reels và tab Bài viết).
  - Tích hợp `MentionPicker` vào khung sửa bình luận của `CommentNode`.
  - Hiển thị tag trong nội dung bình luận (`.commentMentionLink`): tô màu coral đậm (`var(--color-coral-ink)`), click mở `/u/{userId}`, không gạch chân và không đổi màu khi hover.
  - Bình luận cũ không có `mentions` tự động hiển thị như chữ thường.
  - Lưu trữ `mentions` trong `sessionStorage` draft (`CommentDraft`) để không mất tag dở dang khi chuyển đổi.

- **`packages/i18n/src/api.ts`**:
  - Bổ sung các chuỗi giao diện tiếng Việt cho tính năng mention (`mentionPickerTitle`, `mentionSearchPrompt`, `mentionSearching`, `mentionNoResults`).

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| `mention-input.ts`: hàm thuần phát hiện `@query`, chèn tag, cập nhật/loại offset khi sửa | Đạt | `apps/web/src/features/social/mention-input.test.ts` (25/25 test pass) |
| `mention-picker.tsx`: tìm người qua `useUserSearch`, điều khiển ↑ ↓ Enter Esc, ô nhập giữ focus | Đạt | `apps/web/src/features/social/mention-picker.test.tsx` (4/4 test pass) |
| Gắn vào ô bình luận Reels và tab Bài viết (`RightPanelCommentsSynchronized`) | Đạt | `apps/web/src/features/social/live-posts.tsx` |
| Gửi kèm `mentions` khi đăng/sửa, gom phần gọi API ở một chỗ | Đạt | `apps/web/src/features/social/comment-service.ts` |
| Hiển thị tag trong bình luận màu coral đậm, click mở `/u/{userId}`, bình luận cũ hiện chữ thường | Đạt | `apps/web/src/features/social/live-posts.tsx`, `.commentMentionLink` trong `live-posts.module.css` |
| UI theo ý anh Thành: không neon/glow/blur/gradient, không gạch chân/đổi màu hover, màu từ tokens | Đạt | `mention-picker.module.css`, `live-posts.module.css` |
| Chạy lint, typecheck, test của web pass | Đạt | `pnpm turbo run lint typecheck test --filter=@tripflix/web` (40 file test pass, 278 tests pass, 0 errors, 0 new warnings) |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/web`:
  - Lint: 0 errors, 0 cảnh báo mới (27 cảnh báo có sẵn của dự án).
  - Typecheck: 0 errors (`next typegen && tsc --noEmit` pass).
  - Test: 40/40 test files pass (278 tests pass).
- `pnpm turbo run test typecheck lint --filter=@tripflix/i18n`:
  - 3/3 tasks successful, 0 errors.

## Cách kiểm lại
1. Chạy test logic mention:
   `pnpm --filter @tripflix/web exec vitest run src/features/social/mention-input.test.ts`
   `pnpm --filter @tripflix/web exec vitest run src/features/social/mention-picker.test.tsx`
2. Chạy toàn bộ kiểm tra của web:
   `pnpm turbo run lint typecheck test --filter=@tripflix/web`
3. Mở web chạy kèm core-api:
   - Mở panel bình luận của một bài viết hoặc Reel.
   - Gõ `@` và ít nhất 2 ký tự tên người dùng: xuất hiện popup danh sách gợi ý.
   - Dùng phím ↑ / ↓ để di chuyển vệt chọn, nhấn `Enter` để chèn tag `@Tên Người Dùng `.
   - Ô nhập vẫn giữ focus và con trỏ ở ngay sau tag.
   - Thử sửa chữ phía trước tag: toạ độ tag dịch chuyển tương ứng.
   - Thử xoá ký tự `@` hoặc xoá chữ trong tên: tag tự động huỷ bỏ và chuyển về văn bản thường.
   - Đăng bình luận: tên người được tag hiển thị màu coral đậm, bấm vào mở `/u/{userId}`.

## Ảnh / video
- Không đính kèm theo yêu cầu (không ảnh chụp).

## Ảnh hưởng tới phần của người khác
- Không sửa code của người khác (`packages/api-client` do Thắng/Dũng, admin của Trang, mobile của Thắng, components của Bảo/Dũng).
- Chỉ sửa `apps/web/src/features/social` và thêm từ khoá trong `packages/i18n/src/api.ts`.
- Chờ BE: Khi BE hoàn thành API và contracts (`POST /v1/posts/:id/comments`, `PATCH /v1/comments/:id` thêm `mentions?: [{userId, offset, length}]`, response có `mentions`), chỉ cần chạy `pnpm gen:api` và cập nhật trong `comment-service.ts`.
