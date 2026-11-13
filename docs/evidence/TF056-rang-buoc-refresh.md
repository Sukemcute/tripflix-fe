# TF056 — Ký yêu cầu phiên Web/Admin

- Nhánh `dung/TF056-rang-buoc-refresh` · Dũng (có dùng AI) · 2026-11-13

## Đã làm

- API client Web/Admin giữ cặp khóa ECDSA P-256 trong IndexedDB. Khóa riêng được tạo với `extractable: false`.
- Login mật khẩu, Google và refresh gửi chữ ký mới. Hai tab mở lần đầu dùng chung khóa thắng giao dịch IndexedDB.
- Kiểm thử lint, typecheck và test cho Web, Admin và API client pass 8/8 tác vụ. Chưa kiểm IndexedDB trên trình duyệt thật hoặc staging.

## Cách kiểm lại

1. Đăng nhập và tải lại trang. Trình duyệt dùng khóa đã lưu để refresh.
2. Kiểm tra riêng Web và Admin khi hai origin cùng kết nối một API.
3. Đối chiếu test backend về cookie thiếu bằng chứng hợp lệ và chữ ký gửi lại.
