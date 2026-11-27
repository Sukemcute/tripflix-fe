# Hiển thị luật kiểm duyệt dựng sẵn

Tab **Cấu hình kiểm duyệt** hiển thị 9 nhóm luật chỉ đọc lấy qua API. Mỗi nhóm có thể mở để xem các cụm từ và mẫu đang dùng.

| Kiểm tra | Kết quả |
|---|---|
| Giao diện local bằng dữ liệu xuất từ backend | Thấy 9 nhóm, mở được nhóm Lời mời liên hệ và Chửi tục để xem mẫu |
| Nút sửa, bật và tắt trong mục luật dựng sẵn | 0 |
| `pnpm --filter @tripflix/admin test src/features/moderation` | 21 ca pass |
| `pnpm turbo run lint typecheck test --affected` | 15 tác vụ thành công, gồm 107 ca Admin và 333 ca API client |

Sau khi backend đã deploy thành công, triển khai Admin Portal và mở tab bằng tài khoản Superadmin để đối chiếu đủ 9 nhóm trên staging.
