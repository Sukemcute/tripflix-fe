# @tripflix/app-core

Logic nghiệp vụ không có giao diện, dùng chung cho mobile và web: giỏ lộ trình, tạm tính tiền, đếm ngược giữ chỗ, kiểm form.

- **Không** import `react`, `react-native`, `react-dom` (`pnpm lint` chặn bằng `tools/check-boundaries.mjs`).
- Số tiền và thời hạn giữ chỗ thật luôn lấy từ server. Ở đây chỉ tính để hiển thị.
- Hàm nào cũng phải có test (`pnpm --filter @tripflix/app-core test`).

Đã có: `holdCountdown`, `cartSubtotal`. Các task booking, checkout sẽ thêm tiếp.

Chủ: Trang (mobile) và Thành (web) cùng duyệt.
