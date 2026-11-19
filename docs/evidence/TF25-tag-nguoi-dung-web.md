# TF25 — Tag người dùng trong bình luận (Web)

- Task: TF25 · Nhánh: `thanh/TF25-tag-nguoi-dung-web` · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-19

## Đã làm

### 1. Sinh API client & nối type chính thức với BE (`packages/api-client`)
- Chạy `pnpm gen:api` từ `contracts/openapi/core-api.json` của nhánh BE `thanh/TF25-tag-nguoi-dung`.
- Chỉ giữ và commit phần generated liên quan tới comment/mentions:
  - `packages/api-client/src/generated/core-api/model/commentMentionDto.ts` (`userId`, `offset`, `length` UTF-16)
  - `packages/api-client/src/generated/core-api/model/createCommentDto.ts`
  - `packages/api-client/src/generated/core-api/model/updateCommentDto.ts`
  - `packages/api-client/src/generated/core-api/model/socialCommentDto.ts`
  - `packages/api-client/src/generated/core-api/model/creatorReviewCommentDto.ts`
  - `packages/api-client/src/generated/core-api/model/index.ts` (chỉ thêm `export * from './commentMentionDto';`)
- **`packages/api-client/src/social.ts`**:
  - Cập nhật `socialApi.addComment(id, body, parentCommentId?, mentions?: CommentMentionDto[])` và `socialApi.editComment(id, body, mentions?: CommentMentionDto[])` nhận và gửi `mentions` theo đúng `CreateCommentDto` / `UpdateCommentDto`.
- **`packages/api-client/src/social.test.ts`** và **`packages/api-client/src/comment-like-cache.test.ts`**:
  - Bổ sung test xác minh `socialApi.addComment` và `socialApi.editComment` gửi đúng `mentions` (kể cả `mentions: []` khi xoá tag) và không gửi trường dư khi bỏ qua.
  - Cập nhật fixture `SocialCommentDto` có `mentions: []`.

### 2. Logic mention UTF-16 & giao diện web (`apps/web/src/features/social`)
- **`apps/web/src/features/social/mention-input.ts`**:
  - Chuẩn hoá offset/length theo UTF-16 code units (tương thích `selectionStart` / `String.slice` của JS và domain BE), bổ sung kiểm tra không cắt đôi surrogate pair trong `validateMentions`.
  - Bổ sung `prepareCommentSubmission(body, mentions)`: trim khoảng trắng đầu/cuối đồng thời dịch offset của `mentions` theo phần đầu bị bỏ.
  - Đầy đủ hàm thuần: `getMentionQueryAtCursor`, `insertMentionTag`, `updateMentionsOnTextChange`, `validateMentions`, `prepareCommentSubmission`, `parseCommentSegments`.
- **`apps/web/src/features/social/comment-service.ts`**:
  - Bỏ hoàn toàn ép kiểu `as unknown as`, gọi thẳng `socialApi.addComment` và `socialApi.editComment` với type chính thức từ `packages/api-client`.
  - `editCommentWithMentions` luôn gửi mảng `mentions` hiện tại (gửi `[]` nếu không còn tag) để BE xoá tag cũ thay vì giữ/kiểm lại tag cũ gây lỗi 400.
- **`apps/web/src/features/social/mention-picker.tsx` + `mention-picker.module.css`**:
  - Bảng gợi ý tag người dùng hiển thị phía trên ô nhập bình luận, tìm kiếm qua `useUserSearch` (`GET /v1/users/search`).
  - Điều khiển bằng bàn phím ↑ ↓ Enter Esc; click dùng `onMouseDown` giữ focus tại ô nhập.
  - Thiết kế gọn gàng kiểu TikTok / Facebook: không neon, không glow, không blur, không gradient, không đổ bóng màu.
- **`apps/web/src/features/social/live-posts.tsx` + `live-posts.module.css`**:
  - Gắn `MentionPicker` và xử lý `mentions` vào `RightPanelCommentsSynchronized` (dùng chung Reels & Bài viết) và `CommentNode` (khung sửa bình luận).
  - Khi mở khung sửa bình luận, nạp `comment.mentions` đã kiểm hợp lệ vào state chỉnh sửa.
  - Sau khi đăng/sửa xong, dùng `body` và `mentions` từ response BE làm bản chuẩn (cập nhật cache React Query qua `addCommentToCache` / `replaceCommentInCache` và đồng bộ state sửa).
  - Hiển thị tag bằng `.commentMentionLink` màu coral đậm (`var(--color-coral-ink)`), click mở `/u/{userId}`, không gạch chân và không đổi màu khi hover; dữ liệu cũ không có `mentions` vẫn hiển thị văn bản thường.
- **`packages/i18n/src/api.ts`**:
  - Thêm chuỗi giao diện tiếng Việt (`mentionPickerTitle`, `mentionSearchPrompt`, `mentionSearching`, `mentionNoResults`).

### 3. Unit tests bổ sung
- `apps/web/src/features/social/mention-input.test.ts` (28 tests): thêm test UTF-16 với emoji/surrogate pair và `prepareCommentSubmission`.
- `apps/web/src/features/social/comment-service.test.ts` (4 tests): kiểm tra `createCommentWithMentions` gửi mentions đã trim + UTF-16, luồng sửa giữ tag (dịch offset khi sửa chữ trước tag), luồng sửa bỏ tag (luôn gửi `mentions: []`) và cập nhật bản chuẩn từ response BE vào cache.
- `apps/web/src/features/social/mention-picker.test.tsx` (4 tests).

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Sinh `packages/api-client` chỉ giữ phần comment/mentions | Đạt | 6 file `core-api/model/*` + `git status` sạch phần không liên quan |
| `socialApi.addComment` & `editComment` nhận và gửi `mentions` | Đạt | `packages/api-client/src/social.ts`, `social.test.ts` |
| Bỏ `as unknown as` trong `comment-service.ts`, gọi thẳng API có type | Đạt | `apps/web/src/features/social/comment-service.ts` |
| Sửa bình luận luôn gửi `mentions` (`[]` khi bỏ tag), nạp `comment.mentions` khi mở sửa | Đạt | `live-posts.tsx`, `comment-service.ts`, `comment-service.test.ts` |
| Sau đăng/sửa dùng `body` và `mentions` response làm bản chuẩn | Đạt | `live-posts.tsx` (`addCommentToCache`, `replaceCommentInCache`), `comment-service.test.ts` |
| Offset/length theo UTF-16, test đầy đủ | Đạt | `mention-input.ts`, `mention-input.test.ts`, `comment-service.test.ts` |
| Chạy lint, typecheck, test `@tripflix/web` và `@tripflix/api-client` pass | Đạt | Xem mục Kết quả kiểm tra |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/web --filter=@tripflix/api-client`: **6/6 tasks pass**
  - `@tripflix/api-client`:
    - `lint`: 0 errors
    - `typecheck`: 0 errors (`tsc --noEmit`)
    - `test`: **33/33 test files pass (291 tests pass)**
  - `@tripflix/web`:
    - `lint`: 0 errors, 27 cảnh báo có sẵn (0 cảnh báo mới)
    - `typecheck`: 0 errors (`next typegen && tsc --noEmit`)
    - `test`: **41/41 test files pass (285 tests pass)**
- Kiểm tra `core-api` đang chạy tại `http://localhost:3000`:
  - `GET /health`: 200 OK (`db.content: true`).
  - `GET /api/v1/users/search?q=an`: 200 OK, trả về danh sách user kèm UUID và `displayName`.
  - `GET /api/v1/posts/6459d9fb-c8cb-4a15-9c30-9362d133475a/comments`: 200 OK, item đã trả về trường `"mentions": []` đúng schema mới sau migration.
  - Chưa chạy `POST /comments` trực tiếp từ script vì endpoint cần phiên đăng nhập đã xác thực email (không đọc `.env` để lấy mật khẩu seed theo quy tắc bảo mật).

## Cách kiểm lại
1. `pnpm turbo run lint typecheck test --filter=@tripflix/web --filter=@tripflix/api-client`
2. Đăng nhập tài khoản đã xác thực email trên web, mở bình luận Reel/Bài viết:
   - Gõ `@` và tên người dùng, chọn từ bảng gợi ý -> đăng bình luận -> kiểm tra `POST /api/v1/posts/:id/comments` gửi đúng `mentions` UTF-16 và `GET` trả về khớp.
   - Mở sửa bình luận có tag, thêm chữ phía trước tag rồi lưu -> `PATCH /api/v1/comments/:id` gửi `mentions` với offset mới, BE trả 200 và UI giữ tag đúng vị trí.
   - Mở sửa bình luận, xoá tag rồi lưu -> `PATCH` gửi `"mentions": []`, BE trả 200 và xoá tag thành công.

## Ảnh / video
- Không đính kèm theo yêu cầu (không ảnh chụp).

## Ảnh hưởng tới phần của người khác
- Chỉ sửa `packages/api-client/src/social.ts` (của anh Thành), phần generated `comment/mentions` trong `packages/api-client/src/generated/core-api/model`, `apps/web/src/features/social`, `packages/i18n/src/api.ts`, và fixture `comment-like-cache.test.ts` do `SocialCommentDto.mentions` bắt buộc trong DTO vừa sinh.
- Không commit thay đổi generated không liên quan (`ai-service`, `analytics`, `aiInsights*`).
