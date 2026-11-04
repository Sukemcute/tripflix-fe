# features/

Code chia theo tính năng, khớp với module BE (RULES.md mục 10). Mỗi tính năng một thư mục, ví dụ:

| Thư mục | Nội dung | Module BE |
|---|---|---|
| `search/` | ô tìm kiếm, trang kết quả | discovery |
| `post/` | trang bài đăng | content |
| `hotel/` | chi tiết khách sạn, chọn phòng | commerce |
| `checkout/` | giỏ lộ trình, giữ chỗ, thanh toán | commerce |
| `trips/` | chuyến đi của tôi | commerce |

Trang trong `src/app/` chỉ ghép component từ `features/`, không chứa logic.
