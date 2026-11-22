# TFxx — Sắp xếp menu và thu gọn trang Tài khoản

- Ngày: 2026-11-19 · Nhánh: `dung/TFxx-sap-xep-menu-cai-dat`.
- Thực hiện theo yêu cầu trực tiếp của người dùng; chưa có link task.

## Đã làm

- Menu nhân sự: Mở trang quản trị → Trang cá nhân → Chuyến đi đã đặt → Cài đặt; Đăng xuất giữ cuối menu.
- Menu thành viên ẩn mục quản trị và không giữ chỗ trống.
- Trang cá nhân mở `/u/<id>`, Chuyến đi đã đặt mở `/bookings`, Cài đặt mở `/account`.
- Bỏ Chuyến đã đặt và Mở trang quản trị trong trang Tài khoản, chỉ giữ thông tin cá nhân, bảo mật và đăng xuất.
- Bỏ dòng mô tả "Chỉ dùng để cá nhân hoá…" dưới tiêu đề Thông tin cá nhân.
- Không đổi API hoặc database. Web thuộc phần Thành; thay đổi theo phạm vi người dùng yêu cầu.

## Kiểm tra

- `TURBO_SCM_BASE=origin/develop pnpm turbo run lint typecheck test build --affected --output-logs=errors-only`: 13/13 tác vụ thành công, 5 dùng cache.
- `git diff --check`: thành công.
- Chưa kiểm giao diện trong trình duyệt với phiên đăng nhập; chưa có ảnh evidence.

## Cách kiểm lại

1. Đăng nhập tài khoản nhân sự, mở menu avatar: kiểm tra thứ tự bốn mục và Đăng xuất cuối cùng.
2. Đăng nhập thành viên: kiểm tra menu bắt đầu bằng Trang cá nhân, không có quản trị.
3. Mở Chuyến đi đã đặt: vào `/bookings` và xem danh sách đơn của mình.
4. Mở Cài đặt: vào `/account`, không còn hai mục Chuyến đã đặt/Quản trị và dòng mô tả dưới Thông tin cá nhân.
