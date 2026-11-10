# TF056 — Thông báo lỗi phiên và tải trước trên trang đăng nhập

- Nhánh `dung/TF056-thong-bao-va-tai-truoc-dang-nhap` · Dũng (dùng AI) · 2026-11-10

## Thay đổi

- Tách lỗi tải hồ sơ sau khi xác thực thành công khỏi lỗi thông tin đăng nhập. Nếu tải hồ sơ trả 401, giao diện hiển thị thông báo phiên hết hạn.
- Tắt tải trước các trang Trang chủ, Quên mật khẩu và Đăng ký từ màn đăng nhập. Các liên kết vẫn điều hướng như trước.

## Kiểm tra

- API client lint, typecheck và 105 test đạt. Có ca tái hiện đăng nhập thành công, đọc hồ sơ trả 401 và refresh thất bại. Test phiên khách kiểm body refresh rỗng và không có Authorization.
- Web typecheck đạt. Lint không có lỗi, còn cảnh báo ở file ngoài phạm vi thay đổi. Web không có script test riêng.
- Build production sẽ được xác nhận qua CI của PR.
- Cần đo Network trên môi trường triển khai để xác định các tài nguyên khác được tải khi mở trang đăng nhập.

## Phạm vi ảnh hưởng

- `apps/web` do Thành phụ trách. Thay đổi ở hành vi tải trước, không đổi bố cục hoặc hình thức hiển thị.
- `packages/api-client` dùng chung cho web, mobile và admin. Thay đổi cách phân loại lỗi sau xác thực. Hợp đồng HTTP giữ nguyên.
