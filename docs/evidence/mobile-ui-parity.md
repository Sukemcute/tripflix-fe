# Đối chiếu giao diện mobile với thiết kế V1

- Nguồn đối chiếu: `tripflix-ui-design/UX-SPEC.md` và màn hình thực tế của prototype trong `tripflix-ui-design/index.html?embed=1&screen=profile`.
- Ngày kiểm tra: 2026-11-06.

## Thay đổi

- **Tôi và tài khoản** — Khôi phục bìa mint, avatar, lối tắt và các hàng điều hướng. Chuyển đổi tên, mật khẩu và quản lý phiên vào Cài đặt. Dùng biểu tượng lối tắt ở dải thống kê vì các danh sách phân trang hiện chưa cung cấp tổng số.
- **Khám phá và tìm kiếm** — Dùng ảnh từ handoff, nhóm chủ đề, thẻ điểm đến và mục Tripi. Kết quả hiển thị điều kiện tìm phòng đã gửi và nút mở lại bộ lọc. Giá và ảnh khách sạn lấy từ API.
- **Các luồng còn lại** — Bổ sung nhãn tab, giữ nút Chia sẻ nổi ở giữa, phân Chuyến đi theo trạng thái đơn và ngày kết thúc. Dùng Tripi ở trạng thái trống của Đã lưu và Chuyến đi. Đồng bộ phần bìa Đăng nhập, màn tạo bài, ảnh khách sạn, tổng tiền cố định ở giỏ và trạng thái đặt thành công. Đưa nút xem bài ra phần luôn hiển thị của Reels có bài liên kết.
- Thông báo và Trợ lý dùng trạng thái chờ tích hợp. Tạo bài tiếp tục hỗ trợ bài chữ và lưu bản nháp.

## Kiểm tra

- `pnpm turbo run lint typecheck test --affected`: 20/20 tác vụ, 102 bài unit test.
- Chromium ở 320/390/430 px: 8 nhóm kiểm tra với API mô phỏng, gồm hồ sơ khách/thành viên, sửa tên, đăng xuất, quay lại sau đăng nhập, bộ lọc chuyến, tạo bài và tìm phòng đến giỏ.
- Xuất bundle Android thành công. Ảnh đối chiếu chụp trên Chromium. Chưa kiểm tra trên thiết bị Android.
- Ảnh prototype, ảnh app và `verification.json` ở `C:/Users/ADMIN/.codex/visualizations/2026/11/05/01a1adc5-3c90-7830-8332-f9aa087811da/mobile-ui`.
