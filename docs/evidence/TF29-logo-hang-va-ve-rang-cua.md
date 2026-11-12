# TF29 — Logo hãng bay thật và đầu vé răng cưa (web)

- Notion: [TF29](https://app.notion.com/p/40dcb9b9e5c281c888e4f3e134183ae6) · Nhánh: `trang/TF29-logo-hang-va-ve-rang-cua` · Người làm: Lê Thị Thùy Trang (dùng AI: có) · Ngày: 2026-11-07

## Đã làm
- Ô hãng bay trên thẻ chuyến bay (hàng gọn và vé mở) hiện **logo thật** thay cho chữ tắt. Trước đây mọi hãng đều ra "VA" khi DB cũ chưa có `airline_code` ("Vietjet Air", "Vietnam Airlines", "Vietravel Airlines" cùng viết tắt VA).
  - Logo ô vuông 128×128 ở `apps/web/public/airlines/<IATA>.png` cho VN, VJ, VU, QH, BL.
  - Nguồn: VN, VJ, VU, QH từ CDN logo hãng bay của Travelpayouts (`pics.avs.io/al_square`); BL (Pacific Airlines) cắt phần cánh từ logo trên Wikimedia Commons (giấy phép Public domain), vì CDN trên vẫn trả logo Jetstar Pacific cũ.
  - `resolveAirlineCode`: dùng `airlineCode` từ BE; thiếu thì đoán theo tên hãng. Hãng chưa có logo vẫn hiện chữ tắt như cũ.
- Màu `--airline` của từng hãng chỉnh theo màu thương hiệu (VJ đỏ, VN xanh lam, QH và VU xanh dương, BL xanh navy).
- Vé mở ra: dải đầu vé (`.tBand`) và đầu cuống vé (`.stubBand`) có **mép dưới răng cưa** bằng CSS `mask` (conic-gradient), bỏ nền sọc chéo, thay bằng nền màu hãng có vùng sáng nhẹ. Logo trong dải đầu vé có viền trắng.

## Kết quả kiểm tra
- `pnpm --filter @tripflix/web typecheck`: pass.
- `pnpm --filter @tripflix/web lint`: không lỗi; chỉ có cảnh báo a11y có sẵn ở `airport-picker.tsx` (không sửa).
- `prettier --check` hai file đã sửa: pass.
- Chạy web thật (`next dev`, API qua gateway :8080, dữ liệu seed) và chụp ảnh:
  - `/flights?from=HAN&to=SGN&date=2026-11-10&passengers=1`: 4 chuyến hiện đúng logo Vietravel, Vietjet, Vietnam Airlines.
  - `/flights/P-vn-f-HAN-SGN-1--Y?...`: vé mở, dải đầu vé và cuống vé có mép răng cưa, logo Vietravel.

## Cách kiểm lại
1. `pnpm stack:up` trong `tripflix-be`, rồi `pnpm dev` trong `tripflix-fe`.
2. Mở http://localhost:3100/flights?from=HAN&to=SGN&date=2026-11-10&passengers=1, bấm "Chọn vé" một chuyến.

## Ảnh / video
- Đính kèm trong PR.

## Ảnh hưởng tới phần của người khác
- Không. Chỉ sửa `apps/web/src/features/flights/` và thêm ảnh trong `apps/web/public/airlines/`. App mobile chưa đổi.
