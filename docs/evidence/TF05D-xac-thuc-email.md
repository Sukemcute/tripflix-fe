# TF05D — Xác thực email trên web

- Nhánh `dung/TF05D-xac-thuc-email` · Hoàng Đức Dũng · Có dùng AI · 2026-11-06

## Đã làm

- Trang `/xac-thuc-email` mở từ liên kết trong thư. Người dùng bấm nút xác nhận để gửi mã dùng một lần.
- Trang tài khoản cho phép gửi lại email và làm mới trạng thái sau khi xác thực trong trình duyệt khác.
- Web hiển thị lý do và liên kết đến trang tài khoản khi API trả `email_unverified`.
- Sinh client xác thực email từ OpenAPI của backend TF05D.

## Kết quả kiểm tra

- `pnpm turbo run lint typecheck test --affected` thành công 20/20 tác vụ.
- `pnpm --filter @tripflix/web build` và `node tools/check-boundaries.mjs` thành công.
- Chromium với API và Mailpit thật đã kiểm luồng đăng ký, gửi lại, xác nhận trên trình duyệt khác và cập nhật trạng thái ở trang tài khoản ban đầu.
- Đã chụp trang tài khoản ở 1366 px và trang xác thực ở 390 px trên Chromium.

## Cách kiểm lại

1. Đăng ký bằng mật khẩu trên web và kiểm tra thông báo xác thực trong trang tài khoản.
2. Bấm gửi lại, mở thư mới nhất trong Mailpit trên một trình duyệt khác rồi bấm xác nhận.
3. Quay lại trang tài khoản và bấm **Kiểm tra trạng thái**. Sau khi trạng thái cập nhật, thử đăng bài hoặc bình luận.

## Ảnh hưởng đến phần của người khác

- Thay đổi web và client dùng chung. Dũng xác nhận đã báo Thành và đồng ý thực hiện.

## Cập nhật form đăng ký web và mobile

- Hiển thị phản hồi mật khẩu trong khi nhập. Chỉ bật gửi mã khi mật khẩu đạt yêu cầu. Form chỉ gửi yêu cầu tạo tài khoản khi đã có mã gồm 8 chữ số.
- Chromium và Mailpit đã kiểm cảnh báo mật khẩu yếu, trạng thái chờ mã, từ chối mã sai và chuyển sang trang tài khoản sau mã đúng.
- Dũng xác nhận đã báo Trang và đồng ý cập nhật màn đăng ký mobile. Mobile đã qua kiểm tra mã nguồn và kiểu dữ liệu. Chưa chạy trên thiết bị Android.
