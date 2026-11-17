# TF101 phần 4 — Web cập nhật bình luận realtime và hiện dòng thay thế

- Jira: [SCRUM-125](https://tripflix.atlassian.net/browse/SCRUM-125)
- Nhánh: `trang/TF101-web-binh-luan-realtime` · Trang (dùng AI: có) · 2026-11-17
- Phụ thuộc API BE [#249](https://github.com/Sukemcute/tripflix-be/pull/249). Client sinh từ OpenAPI BE mới có moderationState; không sửa tay code sinh.

## Đã làm
- watchPostComments dùng socket thông báo hiện có: post.watch khi mở, post.unwatch khi đóng bảng cuối của bài; vào lại phòng và tải bù sau reconnect.
- Lọc post.comments.changed theo bài đang theo dõi; gom sự kiện tối đa một lần/giây. Đóng bảng thì hủy timer.
- Component bình luận dùng chung ở bài chi tiết, feed và Reels: tải lại danh sách gốc, các trang trả lời đang mở và focus thread. Đọc lại số đếm chuẩn của bài, cập nhật cache chi tiết/feed/Reels.
- moderationState hidden: khung xám với chữ vi phạm và Tìm hiểu thêm tới /account/moderation. Không render body, nút sửa, trả lời hay thích; tác giả vẫn xóa được.
- Dùng chữ i18n, màu token hiện có. Hàm socket dùng chung sẵn cho Mobile phần 5.

## Kiểm tra
- `pnpm gen:api`: đạt; diff sinh chỉ thêm moderationState cho bình luận.
- `pnpm turbo run lint typecheck test --affected`: 22/22 task đạt; Web 129/129, API client 236/236.
- Socket test: lọc bài, gom sự kiện, reconnect, hủy timer, nhiều bảng cùng bài dùng một phòng.
- Cache test: invalidate danh sách gốc/trả lời/focus, cập nhật số đếm đúng bài và giữ bài khác.
- Component test: thông báo, link trạng thái, không có nút tương tác trong khung.
- `tools/verify-tf101-web.cjs`: đạt trên Web thật với API và Socket.IO mô phỏng. Xác nhận bình luận visible đổi thành khung xám sau sự kiện, body cũ biến mất, số đếm cập nhật và tác giả vẫn có Xóa.

## Cách kiểm lại
1. `pnpm turbo run lint typecheck test --affected`
2. Chạy Web ở :3100; `PLAYWRIGHT_PACKAGE` trỏ tới package playwright đã cài nếu không có trong môi trường. Chạy `node tools/verify-tf101-web.cjs`.
3. Với backend thật có #217/#249/#250: đăng nhập hai tài khoản, mở cùng bài public; ẩn bình luận rồi kiểm tra tác giả thấy khung xám, người khác không thấy, không cần F5.

## Ảnh
- Artifact local: `D:/Sukem/VinUni/VSF/outputs/tf101-web/hidden-comment-desktop.png` và `hidden-comment-narrow.png` (390px); không commit ảnh vào repo.
- Ảnh và ca trình duyệt dùng dữ liệu mô phỏng; chưa chạy hai tài khoản với backend thật.

## Giới hạn
- Socket hiện có yêu cầu đăng nhập (BE); realtime phòng bài áp dụng cho phiên đăng nhập. Người xem chưa đăng nhập vẫn đọc qua API như trước.

## Ảnh hưởng tới phần của người khác
- apps/web, packages/api-client và i18n của Thành; Thành duyệt theo phân công TF101. Mobile chưa nối helper trong PR này.
