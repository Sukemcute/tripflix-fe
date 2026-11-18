# TF109 — Cải tiến giao diện đổi ảnh đại diện và phụ kiện du lịch

- Notion: TF109 · Nhánh: `dung/TF109-cai-tien-avatar-sticker` · Người làm: Dũng (dùng AI: có) · Ngày: 2026-11-18

## Đã làm
- Đồng bộ lại menu bấm vào avatar (`.profile-avatar-menu`): căn giữa dưới avatar, chuẩn hóa chữ **Đổi ảnh** / **Xóa ảnh** cùng kiểu chữ, bo góc, thêm icon nét mảnh `18×18` và đường kẻ ngăn cách trước mục xóa.
- Đưa hộp chỉnh ảnh đại diện (`<dialog className="avatar-crop">`) ra chính giữa màn hình (`position: fixed; inset: 0; margin: auto;`), tránh bị Tailwind Preflight (`margin: 0`) đẩy lệch lên góc trái trên.
- Làm mới giao diện hộp chỉnh ảnh: thêm header có tiêu đề + phụ đề + nút đóng `×`, lưới căn 3×3 hiện khi đang kéo ảnh, thanh thu phóng có nút `-` / `+`, huy hiệu `%` (`100%`–`400%`) và nút **Chọn ảnh khác**.
- Thêm bộ **12 phụ kiện đeo & sticker du lịch** (*Kính râm, Mũ cói, Máy ảnh, Tai nghe, Máy bay, Vali kéo, La bàn, Dừa biển, Dấu vi vu, Tripi vui vẻ, Tripi khám phá, Tripi nghỉ dưỡng*) cùng **4 khung viền** (*Không viền, Hoàng hôn, Biển xanh, Tem lữ hành*): người dùng bấm gắn lên ảnh, kéo trực tiếp trên khung để đặt vị trí, chỉnh cỡ/xoay/lật/gỡ và ghép trực tiếp lên canvas `512×512` khi bấm **Lưu ảnh**.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Menu Đổi ảnh và Xóa ảnh đồng bộ format, căn đẹp dưới avatar | Đạt | `apps/web/src/features/auth/avatar-editor.tsx`, `apps/web/src/app/globals.css`, `packages/i18n/src/api.ts` |
| Ô chỉnh ảnh đại diện nằm chính giữa màn hình, giao diện gọn đẹp | Đạt | `.avatar-crop` (`position: fixed; inset: 0; margin: auto;`), `AvatarCropDialog` |
| Có bộ sticker, phụ kiện và khung viền du lịch gắn kèm khi lưu avatar | Đạt | `apps/web/src/features/auth/avatar-stickers.ts`, `apps/web/src/features/auth/avatar-crop.test.ts` (6 unit test pass) |

## Kết quả kiểm tra
- `node tools/check-boundaries.mjs`: Pass (`Luật FE: không có vi phạm.`)
- `pnpm --filter @tripflix/i18n --filter @tripflix/web run lint`: Pass (`0 errors`, 0 cảnh báo trên file sửa/mới)
- `pnpm --filter @tripflix/i18n --filter @tripflix/web run typecheck`: Pass (`next typegen && tsc --noEmit`)
- `pnpm --filter @tripflix/i18n --filter @tripflix/web run test`: Pass (`@tripflix/i18n`: 1 file / 2 tests pass; `@tripflix/web`: 33 files / 221 tests pass, gồm 6 tests trong `avatar-crop.test.ts`)

## Cách kiểm lại
1. Chạy `pnpm --filter @tripflix/web dev`, đăng nhập và mở `http://localhost:3100/account`.
2. Bấm vào vòng tròn avatar ở cột trái để kiểm tra menu **Đổi ảnh** / **Xóa ảnh** căn giữa, đồng bộ icon và chữ.
3. Chọn một ảnh JPG/PNG/WebP: hộp **Chỉnh ảnh đại diện** mở ở chính giữa màn hình; thử kéo ảnh, bấm `-` / `+` phóng to, bấm chọn các phụ kiện/sticker du lịch và khung viền, kéo phụ kiện trên khung, xoay/đổi cỡ rồi bấm **Lưu ảnh**.

## Ảnh / video
- Xem trong mô tả PR.

## Ảnh hưởng tới phần của người khác
- Có: `apps/web/src/features/auth/avatar-editor.tsx`, `apps/web/src/features/auth/avatar-stickers.ts`, `apps/web/src/app/globals.css` (thuộc `apps/web`, chủ: Thành) và `packages/i18n/src/api.ts` (dùng chung) — chỉ thêm/sửa class và chuỗi của phần chỉnh avatar TF109, không đổi API hay ảnh hưởng component khác.
