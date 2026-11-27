# Lọc số liệu theo luồng quản trị và người dùng

Ngày 2026-11-27. Nhánh trang/tach-luong-admin-user.

- BFF Admin dùng endpoint Core API riêng cho phiên, tìm kiếm và gợi ý.
- Tổng quan thêm bộ lọc luồng API và áp dụng cho request/giây, lỗi 5xx và p95 qua API observability.
- Admin lint, typecheck và 8 test BFF pass trên develop mới nhất.
- Deploy Portal sau backend. Trên staging, mở Số liệu & giám sát, chọn từng luồng và đối chiếu ba chỉ số cùng bộ lọc thời gian. Ảnh hoặc số liệu chỉ bổ sung sau khi có bản staging.
