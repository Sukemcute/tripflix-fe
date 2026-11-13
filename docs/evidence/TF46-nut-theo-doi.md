# TF46 — Nút theo dõi tác giả bài viết

- Nhánh `dung/TF46-nut-theo-doi` · Dũng (có dùng AI) · 2026-11-13
- Backend [PR #167](https://github.com/Sukemcute/tripflix-be/pull/167) cung cấp API follow.

## Đã làm

- Web và Mobile hiển thị Theo dõi/Bỏ theo dõi cạnh tác giả của bài đã đăng. Khách mở đăng nhập và quay lại bài. Ẩn nút trên bài của mình.
- Hook dùng API sinh từ OpenAPI, phân vùng cache theo người xem và tác giả, cập nhật trạng thái theo phản hồi server.

## Kiểm thử

- Lint, typecheck và test pass 11/11 tác vụ cho Web, Mobile, API client và i18n.
- Web chạy trên Chrome với API giả lập. Đã bấm Theo dõi và Bỏ theo dõi, xác nhận PUT rồi DELETE và nút đổi đúng trạng thái.
- Ảnh local: `C:/Users/ASUS/.codex/visualizations/2026/11/09/01a1be85-2ecb-7092-b037-9b08c5273acb/TF46-follow-web.png`.
- Chưa kiểm trên Android hoặc staging. Cần API của backend #167 để thử đầy đủ.

## Ảnh hưởng

- Sửa Web và Mobile của Thành theo yêu cầu người dùng.
