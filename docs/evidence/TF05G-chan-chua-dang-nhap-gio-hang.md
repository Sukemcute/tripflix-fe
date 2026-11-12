# TF05G — Chặn chưa đăng nhập các trang riêng tư và hoàn thiện giao diện giỏ hàng rỗng

- Nhánh `dung/TF05G-chan-chua-dang-nhap-gio-hang` · Dũng (dùng AI) · 2026-11-12

## Thay đổi

1. **Chặn truy cập khi chưa đăng nhập (Bảo vệ thông tin cá nhân)**:
   - Các trang giỏ hàng (`/cart`), thanh toán (`/checkout/[id]`), chuyến đi (`/bookings`), và tài khoản cá nhân (`/account`) tự động chuyển hướng sang trang đăng nhập (`/login?returnTo=...`) khi người dùng chưa đăng nhập (`isReady && !user`).
   - Ẩn hoàn toàn icon giỏ hàng trên thanh điều hướng Header khi chưa đăng nhập để tránh thao tác gây hiểu lầm.

2. **Giao diện Giỏ hàng rỗng (Empty Cart)**:
   - Khi người dùng đã đăng nhập nhưng giỏ hàng chưa có sản phẩm (0 phòng), giao diện hiển thị thẻ thông báo giỏ hàng rỗng (Empty Card) gồm biểu tượng xe đẩy, thông điệp nhắc nhở thân thiện và nút "Khám phá phòng" dẫn tới trang tìm kiếm.
   - Thẻ tóm tắt đơn hàng hiển thị trực quan (tạm tính `0 VND`) cùng nút tìm phòng thay vì nút đặt phòng bị vô hiệu hoá.

## Kiểm tra

- **Typecheck**: `pnpm --filter @tripflix/web typecheck` đạt 100%.
- **Lint**: `pnpm --filter @tripflix/web lint` đạt 0 lỗi.
- **Unit test**: `pnpm --filter @tripflix/web test` đạt 8/8 test files (44 tests pass).
- **Trải nghiệm thực tế**: Kiểm tra chuyển hướng đúng URL khi chưa đăng nhập, giao diện giỏ hàng render đầy đủ layout 2 cột rõ ràng khi có 0 món đồ.

## Phạm vi ảnh hưởng

- `apps/web/src/features/checkout/`: `cart-screen.tsx`, `cart-link.tsx`, `cart.module.css`, `checkout-screen.tsx`, `bookings-screen.tsx`.
- `apps/web/src/features/auth/`: `live-account.tsx`.
- Không thay đổi hợp đồng API hay ảnh hưởng các ứng dụng khác (`mobile`, `admin`).
