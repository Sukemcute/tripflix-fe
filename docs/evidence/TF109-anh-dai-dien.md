# TF109 — Ảnh đại diện trên web

- Jira: chưa tạo · Nhánh: `dung/TF109-anh-dai-dien` · Người làm: Dũng (dùng AI: có) · Ngày: 2026-11-18
- Phụ thuộc PR BE cùng tên ở `tripflix-be` (API `PUT/DELETE /auth/me/avatar`, `GET /v1/users/:id/avatar`).

## Đã làm
- Trang tài khoản: bấm avatar (có icon máy ảnh) để chọn ảnh JPG, PNG, WebP. Ảnh được thu nhỏ còn cạnh dài 512px (canvas, JPEG) rồi tải qua `uploadImage` có sẵn. Có nút "Xoá ảnh". Không thêm thư viện.
- `AvatarPhoto` (`features/shared/avatar-photo.tsx`) phủ ảnh lên ô chữ cái đầu sẵn có; chưa có ảnh (404) hay ảnh lỗi thì tự gỡ, chữ cái hiện như cũ. Gắn ở: header, menu tài khoản, Reels (tác giả), ô viết và danh sách bình luận, kết quả tìm kiếm, trang cá nhân `/u/:id`, trang lộ trình, thông báo (bình luận, bài mới của người theo dõi).
- `packages/api-client`: sinh lại từ hợp đồng BE (chỉ giữ phần avatar), thêm `getAvatarUrl(userId)`.
- Chuỗi mới trong `@tripflix/i18n` (`avatarChange`, `avatarRemove`, `avatarUploading`, `avatarWrongType`, `avatarFailed`).

## Kết quả kiểm tra
- `pnpm --filter @tripflix/web typecheck`, `@tripflix/api-client typecheck`: sạch.
- `pnpm --filter @tripflix/web lint`: 0 lỗi, 0 cảnh báo ở file mới.
- Test: api-client 244, web 168, i18n 2 pass.

## Ảnh / video
- **Chưa có**: chưa chạy web với BE mới. Sẽ bổ sung ảnh trang tài khoản (trước/sau khi đổi ảnh), header, bình luận, thông báo trước khi merge.

## Giới hạn
- Ảnh của người khác cache 5 phút (header `Cache-Control` ở BE): đổi ảnh xong, máy người khác có thể vài phút sau mới thấy. Ảnh của chính mình đổi ngay (đọc `avatarUrl` từ `/auth/me`).
- Thông báo thả cảm xúc chưa có id người thả nên vẫn hiện chữ cái.
- Mobile (Trang) làm ở PR riêng.

## Ảnh hưởng tới phần của người khác
- Có: `apps/web` (chủ Thành) — `globals.css`, `header-account.tsx`, `live-account.tsx`, `header-notifications.tsx`, `live-posts.tsx`, `search-results-grid.tsx`, `public-profile.tsx`, `trip-plan-view.tsx`: mỗi chỗ chỉ thêm một dòng `<AvatarPhoto />`, không đổi CSS cũ. Cần Thành duyệt.
