# TF92 — Hoàn thiện duyệt bình luận trên Web và Mobile

- Phạm vi: yêu cầu trực tiếp trong chat; [SCRUM-120](https://tripflix.atlassian.net/browse/SCRUM-120).
- Nhánh: `trang/TF92-hoan-thien-duyet-binh-luan`. Ngày: 18/11/2026. Dùng AI: có.
- Người dùng xác nhận chưa có emulator/thiết bị; nghiệm thu tương tác BE/Web trước.

## Đã làm

- Menu ba chấm bài của mình có **Quản lý bình luận**, mở thẳng cài đặt và hàng chờ. Giữ lối vào trong khung bình luận.
- Hàng chờ có tên tác giả, bình luận đang được trả lời; dữ liệu cũ không có đích chính xác dùng nhãn bình luận gốc trong luồng.
- Ngữ cảnh bị ẩn/gỡ/xóa không hiển thị tên hoặc nội dung. Khi bài hay bình luận gốc chưa hiển thị, nút duyệt bị khóa và giải thích nguyên nhân; BE vẫn kiểm tra lại.
- Phân biệt **Cho hiển thị** và **Chấp nhận qua bộ lọc**. Kết quả lấy trạng thái API thật để báo đã hiện hay vẫn chờ nền tảng. Lỗi duyệt làm mới khả năng xử lý của hàng chờ.
- Sửa liên kết tới trả lời held: tự mở luồng sau khi dữ liệu ngữ cảnh tải xong; vẫn cho phép người dùng thu gọn.
- Sinh lại API client từ OpenAPI BE, dùng cursor keyset ổn định.

## Nghiệm thu BE/Web với dữ liệu thật

Script `tools/verify-tf92-live.cjs` chạy Edge/Playwright, gateway/Core/Notification/Redis/Postgres thật và ba tài khoản seed local. Không mock phản hồi API. Script tạo bài riêng và xóa ở finally; không ghi token, mật khẩu hay OTP.

| Tiêu chí | Kết quả |
|---|---|
| Chủ bài mở cài đặt từ menu, lưu bộ lọc | Đạt |
| Trả lời C → B dưới gốc A: chủ bài thấy đúng B và tên C | Đạt |
| Tác giả mở liên kết tới trả lời held và thấy lý do | Đạt |
| Chủ bài duyệt: B nhận `comment.replied`, A không nhận sai loại trả lời | Đạt |
| Duyệt lặp: số đếm và inbox không tăng lần hai | Đạt |
| Chủ bài chấp nhận nhưng nền tảng giữ: chưa gửi trả lời; nền tảng nhả mới gửi đúng B | Đạt |
| Ngữ cảnh bị ẩn: UI không lộ nội dung | Đạt |
| Gốc luồng bị ẩn: nút duyệt khóa; BE trả 409 | Đạt |
| Từ chối, tắt/bật bình luận; tắt thì BE chặn đăng mới 403 | Đạt |
| Dialog 1440px và 390px | Đạt, đã xem ảnh, không tràn ngang |

Ảnh/kết quả local: `outputs/tf92-acceptance/creator-context-1440.png`, `creator-context-390.png`, `creator-parent-blocked.png`, `result.json` tại workspace VSF.

## Kiểm tra tự động

- `turbo run lint typecheck test` cho Web/Mobile/API client/i18n: 11 tác vụ đạt; lint không lỗi (còn warning hiện có).
- Web: 237 test; API client: 288 test; i18n: 2 test đạt.
- Mobile: 8 test component held/hidden, quyền menu, ngữ cảnh/khả năng duyệt đạt. Render dùng native UI stub.
- `pnpm --filter @tripflix/web build`: đạt.
- Android JS/Hermes export: đạt; chỉ kiểm đóng gói, không tương đương chạy trên thiết bị.
- Ranh giới FE và `git diff --check`: đạt.

## Cách thử

1. Mở `http://localhost:3100/inspiration`, đăng nhập, chọn bài của mình → ba chấm → **Quản lý bình luận**.
2. Lưu từ khóa, mỗi dòng một mục. Dùng tài khoản khác gửi bình luận khớp từ khóa.
3. Tác giả thấy trạng thái chờ; chủ bài thấy hàng chờ, ngữ cảnh và nút xử lý phù hợp.
4. Duyệt, từ chối hoặc tắt/bật bình luận. Dùng thêm tài khoản thứ ba để kiểm tra trả lời và thông báo.

## Triển khai và giới hạn

- Triển khai migration và BE tương ứng trước FE. Các trường API mới được thêm, không xóa hợp đồng cũ.
- Bản nền đã merge dùng 50 từ khóa × 80 ký tự, không phân biệt dấu/hoa thường, khớp trọn từ; cài đặt nằm trên bảng posts. Đây là hành vi thực tế, thay cho các phương án trong bản nháp TF92 ngày 16/11.
- Bình luận cũ thiếu ID đích không đoán người được trả lời từ tên hay tác giả gốc. Không sửa lại thông báo lịch sử.
- Chưa nghiệm thu Android/iOS thật: cần kiểm bàn phím, cuộn hàng chờ, Switch, back và liên kết thông báo trên thiết bị. Theo xác nhận của người dùng, đây là bước sau BE/Web.
- Không thay đổi phần trip-plan đang được chỉnh riêng trong workspace gốc. Không thêm thư viện.
