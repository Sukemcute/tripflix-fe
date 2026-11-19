# TF43 — Màn Đơn hàng và Lịch trống trên admin

- Notion: TF43 · Nhánh: `thang/TF43-man-don-hang-admin` · Người làm: Thắng (dùng AI: có) · Ngày: 2026-11-19
- Phụ thuộc PR BE `thang/TF43-don-bat-thuong-quan-tri` (API `admin/commerce/orders`, `anomalies`, `products`).

## Đã làm
- `/orders` (Đơn hàng & Thanh toán) trước là trang trống. Giờ có:
  - tab Đơn bất thường: đếm 6 loại, bấm để lọc, mỗi dòng có tóm tắt và gợi ý cách xử lý;
  - tab Tra đơn: tìm theo mã xác nhận, mã đơn, điện thoại, email, lọc trạng thái, xem thêm;
  - chi tiết đơn: mục, khách, khoản trừ, khoản hoàn, lịch sử trạng thái, bất thường của đơn.
- `/inventory` (Lịch trống & giá): trước phải gõ tay mã kiểu `H1--STD`, gõ sai thì không ra gì. Giờ tìm theo khách sạn, tỉnh, sân bay rồi chọn từ danh sách.
- Sinh lại `packages/api-client`.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Quản trị tra được đơn | Có | Thử local: tìm `tf-sc8c7k` ra đúng đơn |
| Thấy đơn trừ hai lần, đã trả mà không có chỗ | Có | Tab Đơn bất thường; local hiện 3 khoản hoàn VNPay cần xử lý |
| Lịch trống chọn được phòng | Có | Tìm "dalat palace", chọn Deluxe hướng vườn, Xem lịch ra bảng 7 ngày |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/admin --filter=@tripflix/i18n`: 6/6 task qua; admin 36 test (có `orders-format.test.ts`).
- Thử trên local với DB ~220 nghìn đơn: cả 6 loại bất thường trả trong khoảng 1,9 giây.

## Cách kiểm lại
1. Chạy core-api từ nhánh BE TF43, admin `pnpm --dir apps/admin dev`.
2. Đăng nhập `superadmin@tripflix.local` (mật khẩu `SEED_PASSWORD`), mở `/orders` và `/inventory`.

## Ảnh / video
- Chụp màn local khi thử; dán vào PR.

## Ảnh hưởng tới phần của người khác
- `apps/admin/src/features/shell/live-workspace.tsx` (Thành): thêm 4 dòng gắn màn Đơn hàng. Nav đã ghi `/inventory`, `/orders` thuộc Thắng.
