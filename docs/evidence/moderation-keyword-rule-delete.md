# Xóa quy tắc từ khóa tùy chỉnh

Superadmin có thể xóa một quy tắc tùy chỉnh trong tab **Cấu hình kiểm duyệt**. Hộp xác nhận hiển thị từ khóa đã chọn.

| Kiểm tra | Kết quả |
|---|---|
| Hủy trong hộp xác nhận trên Admin local | Quy tắc thử vẫn hiển thị |
| Xác nhận xóa với API mẫu trả 204 | Quy tắc đã chọn biến mất, quy tắc đối chiếu vẫn hiển thị |
| Tải lại Admin local | Quy tắc đã xóa vẫn vắng mặt |
| Lint, typecheck và test affected | 15 tác vụ thành công |

Triển khai backend trước Admin Portal. Sau đó thử xóa quy tắc kiểm thử trên staging và tải lại tab.
