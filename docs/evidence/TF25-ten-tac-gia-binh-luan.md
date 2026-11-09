# TF25 — Web hiển thị đúng tên người bình luận

- Jira: [SCRUM-29](https://tripflix.atlassian.net/browse/SCRUM-29) · Nhánh: `trang/TF25-ten-tac-gia-binh-luan` · Người làm: Lê Thị Thùy Trang (dùng AI: có) · Ngày: 2026-11-09
- Phạm vi: một lỗi nhỏ trong TF25 (tên người bình luận), không phải toàn bộ task TF25.

## Đã làm
- Lỗi: bình luận của người khác hiện "Thành viên xxxxxx", chỉ tên của chính mình đúng.
- `apps/web/src/features/social/live-posts.tsx` và `live-comments.tsx`: dùng `authorName` từ API danh sách bình luận; chỉ fallback "Thành viên xxx" khi không có tên.
- `packages/api-client/.../socialCommentDto.ts`: thêm `authorName` (sửa tay; chạy lại orval sau khi PR BE merge).

## Đối chiếu
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Bình luận của người khác hiện đúng tên | Đạt khi BE đã merge | PR tripflix-be #97 trả `authorName` |
| Không lỗi kiểu, không lỗi lint mới | Đạt | xem bên dưới |

## Kết quả kiểm tra
- `tsc --noEmit` apps/web sạch.
- `npm run lint` (oxlint): không lỗi, chỉ warning có sẵn.
- Chưa kiểm tay trên trình duyệt.

## Cách kiểm lại
1. Chạy BE nhánh `trang/TF25-ten-tac-gia-binh-luan` và web nhánh này.
2. Mở một reel có bình luận của nhiều người: mỗi bình luận hiện đúng tên người viết.

## Ảnh / video
- Chưa có; bổ sung ảnh panel bình luận sau khi kiểm tay.

## Ảnh hưởng tới phần của người khác
- Có: màn bình luận trong `features/social` (TF25 của Thành). Chỉ đổi cách lấy tên, không đổi bố cục.
