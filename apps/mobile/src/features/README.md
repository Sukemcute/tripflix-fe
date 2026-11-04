# features/

Code chia theo tính năng, khớp với module BE (RULES.md mục 10). File trong `src/app/` chỉ ghép component từ đây.

| Thư mục | Nội dung | Module BE |
|---|---|---|
| `feed/` | bảng tin video dọc, PlayerPool, Preloader | content/feed (Phong) |
| `post/` | đăng bài, chi tiết bài | content/social, content/media |
| `search/` | tìm kiếm, gợi ý | discovery (Duy) |
| `booking/` | giỏ lộ trình, giữ chỗ, thanh toán, đơn | commerce (Thắng) |
| `assistant/` | trợ lý chuyến đi | ai-service (Bảo) |
| `inbox/` | thông báo | notification-service (Dũng) |
| `auth/` | đăng nhập, hồ sơ | access (Dũng) |
