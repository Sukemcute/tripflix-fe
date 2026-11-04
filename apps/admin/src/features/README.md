# features/

Code chia theo tính năng, khớp với module BE (RULES.md mục 10). Trang trong `src/app/<mục>/page.tsx` chỉ ghép component từ đây.

| Thư mục | Màn hình | Module BE | Chủ |
|---|---|---|---|
| `shell/` | menu, khung trang | — | Thành |
| `moderation/` | hàng chờ kiểm duyệt, xử lý báo cáo | content/moderation | Trang |
| `analytics/` | số liệu, biểu đồ | analytics | Trang |
| `inventory/` | Lịch trống & giá | commerce | Thắng |
| `orders/` | đơn hàng, đối soát, hoàn huỷ | commerce | Thắng |
| `staff/` | tài khoản nhân sự, vai trò | access | Dũng |
