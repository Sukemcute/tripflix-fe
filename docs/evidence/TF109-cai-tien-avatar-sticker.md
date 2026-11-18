# TF109 — Cải tiến giao diện đổi ảnh đại diện, khung bọc ngoài và phụ kiện du lịch

- Notion: TF109 · Nhánh: `dung/TF109-cai-tien-avatar-sticker` · Người làm: Dũng (dùng AI: có) · Ngày: 2026-11-18

## Đã làm
- Đồng bộ lại menu bấm vào avatar (`.profile-avatar-menu`): căn giữa dưới avatar, chuẩn hóa chữ **Đổi ảnh** / **Khung & phụ kiện ngoài** / **Xóa ảnh** cùng kiểu chữ, bo góc, thêm icon nét mảnh `18×18` và đường kẻ ngăn cách trước mục xóa.
- Đưa hộp chỉnh ảnh đại diện (`<dialog className="avatar-crop">`) ra chính giữa màn hình (`position: fixed; inset: 0; margin: auto;`), tránh bị Tailwind Preflight (`margin: 0`) đẩy lệch lên góc trái trên.
- Thêm tính năng **Khung bọc ngoài & Phụ kiện tràn viền bên ngoài hình tròn avatar** (kiểu Discord Avatar Decorations):
  - **6 mẫu khung bọc ngoài (`AVATAR_FRAMES`)**: *Mũ Cáo Hạt Dẻ (Fox Hat)*, *Gấu Hoa Hồng (Rose Bearer Pink)*, *Gấu Hoa Xanh (Rose Bearer Blue)*, *Phù Thủy Đêm (Midnight Sorceress)*, *Cáo Tripi*, *Vành Nón Biển* — phần tai cáo, gấu bông ôm hoa, sừng ma thuật và vành nón tràn ra ngoài hình tròn avatar ~23% (`.avatar-outer-deco` kích thước `147%` không bị cắt bởi `border-radius` của ảnh).
  - **12 phụ kiện đeo & sticker du lịch** (*Mũ cói, Kính râm, Tai nghe, Máy ảnh, Máy bay, Vali kéo, La bàn, Dừa biển, Dấu vi vu, Tripi vui vẻ, Tripi khám phá, Tripi nghỉ dưỡng*): cho phép kéo tràn ra ngoài mép hình tròn (`-0.18..1.18`), có nút **Đẩy ra viền ngoài** một chạm, chỉnh cỡ/xoay/lật/gỡ và hiển thị trực tiếp ở lớp phủ ngoài vòng tròn avatar (`AvatarPhoto`).
  - Có thể mở **Khung & phụ kiện ngoài** ngay từ menu avatar để gắn/đổi khung bọc ngoài trên chính avatar hiện tại mà không cần tải lại file ảnh mới.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Menu Đổi ảnh, Khung & phụ kiện ngoài, Xóa ảnh đồng bộ format | Đạt | `apps/web/src/features/auth/avatar-editor.tsx`, `apps/web/src/app/globals.css`, `packages/i18n/src/api.ts` |
| Ô chỉnh ảnh đại diện nằm chính giữa màn hình, giao diện gọn đẹp | Đạt | `.avatar-crop` (`position: fixed; inset: 0; margin: auto;`), `AvatarCropDialog` |
| Khung thú & phụ kiện bọc tràn ra bên ngoài hình tròn avatar (cả trong hộp chỉnh lẫn ngoài trang) | Đạt | `apps/web/src/features/auth/avatar-stickers.ts`, `apps/web/src/features/shared/avatar-photo.tsx`, `apps/web/src/features/auth/avatar-crop.test.ts` (6 unit test pass) |

## Kết quả kiểm tra
- `node tools/check-boundaries.mjs`: Pass (`Luật FE: không có vi phạm.`)
- `pnpm --filter @tripflix/i18n --filter @tripflix/web run lint`: Pass (`0 errors`, 0 cảnh báo trên file sửa/mới)
- `pnpm --filter @tripflix/i18n --filter @tripflix/web run typecheck`: Pass (`next typegen && tsc --noEmit`)
- `pnpm --filter @tripflix/i18n --filter @tripflix/web run test`: Pass (`@tripflix/i18n`: 1 file / 2 tests pass; `@tripflix/web`: 33 files / 221 tests pass, gồm 6 tests trong `avatar-crop.test.ts`)

## Cách kiểm lại
1. Chạy `pnpm --filter @tripflix/web dev`, đăng nhập và mở `http://localhost:3100/account`.
2. Bấm vào vòng tròn avatar ở cột trái → chọn **Khung & phụ kiện ngoài** (hoặc **Đổi ảnh**).
3. Chọn các mẫu **Mũ Cáo Hạt Dẻ**, **Gấu Hoa Hồng**, **Gấu Hoa Xanh**, **Phù Thủy Đêm**, **Cáo Tripi**, **Vành Nón Biển** hoặc chuyển sang tab **Phụ kiện & Sticker** để gắn và bấm **Đẩy ra viền ngoài** → bấm **Lưu trang trí** / **Lưu ảnh** và kiểm tra khung/phụ kiện bọc bên ngoài vòng tròn avatar ở trang Tài khoản và trên Header.

## Ảnh / video
- Xem trong mô tả PR.

## Ảnh hưởng tới phần của người khác
- Có: `apps/web/src/features/auth/avatar-editor.tsx`, `apps/web/src/features/auth/avatar-stickers.ts`, `apps/web/src/features/shared/avatar-photo.tsx`, `apps/web/src/app/globals.css` (thuộc `apps/web`, chủ: Thành) và `packages/i18n/src/api.ts` (dùng chung) — chỉ sửa trong phạm vi phần avatar TF109.
