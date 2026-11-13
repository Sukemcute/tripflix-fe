# TF46D — Trả lời bình luận trong cùng luồng

- Nhánh `dung/TF46D-tra-loi-trong-luong` · Dũng (có dùng AI) · 2026-11-13

## Đã làm

- Web và Mobile cho chọn trả lời một bình luận con. Bình luận mới hiện `Tên người viết ↳ Tên người được trả lời`.
- Web ưu tiên ID lượt trả lời mới trong dữ liệu thông báo để mở đúng vị trí.

## Kết quả kiểm tra

- 8/8 tác vụ lint, typecheck và test sau khi đồng bộ develop.
- Test điều hướng có ca link cũ trỏ bình luận gốc trong khi dữ liệu có ID lượt trả lời mới.
- Chưa kiểm trên trình duyệt thật, Android hoặc staging.

## Cách kiểm lại

- A viết bình luận gốc. B trả lời A. C chọn trả lời trực tiếp B. Kiểm nhãn C ↳ B và bấm thông báo của B để mở bình luận mới của C.
- Triển khai migration và backend trước frontend. Bình luận cũ chưa có tên người được trả lời.

## Ảnh hưởng

- Thay đổi Web, Mobile và API client theo phạm vi người dùng yêu cầu.
