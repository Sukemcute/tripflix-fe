# TF101 — Giảm tải đọc bình luận realtime theo review Thành

- Jira: [SCRUM-125](https://tripflix.atlassian.net/browse/SCRUM-125) · Trang (dùng AI: có) · 2026-11-17
- Nhánh: `trang/TF101-giam-tai-realtime`. PR sửa tiếp sau #206 đã merge.

## Đã làm
- Socket chuyển đủ kind, parentCommentId, commentId, actorId tới callback và giữ các tín hiệu khác nhau trong cửa sổ một giây.
- Bỏ tín hiệu đơn có actorId trùng người xem trước khi gom; own mutation đã cập nhật cache.
- Created gốc: chỉ trang đầu danh sách gốc. Trả lời: chỉ trang đầu danh sách của parentCommentId; không tải danh sách gốc hoặc các luồng khác.
- Sửa/xóa/ẩn: chỉ trang đầu danh sách liên quan. Hidden không có parentId thì tra commentId trong cache để tìm luồng. Focus thread chỉ tải lại nếu bị ảnh hưởng.
- Cancel request đang chạy rồi cắt pages/pageParams về trang đầu trước khi invalidate đúng query, tránh React Query refetch mọi trang đã cuộn.
- Created/updated không gọi getPost; số đếm created cập nhật trong cache. Xóa/kiểm duyệt/khôi phục vẫn đọc getPost một lần cho cả batch để giữ số đếm chuẩn khi cascade nhiều trả lời.
- Đang cuộn quá 48px: root created được giữ lại, hiện nút sticky N bình luận mới; danh sách không tải lại trước khi bấm. Bộ đếm cập nhật khi nhận sự kiện, không cộng lại khi bấm.

## Tín hiệu BE đã gom
- BE chỉ gửi metadata của thay đổi cuối cùng nếu changeCount > 1. Nhóm này có thể chứa nhiều actor/luồng, nên không bỏ cả nhóm chỉ vì actor cuối là mình.
- Khi reconnect, payload cũ thiếu kind hoặc BE đã gom: tải lại trang đầu của các danh sách cache liên quan, mỗi danh sách tối đa một trang; đọc lại số đếm. Không suy diễn N bình luận mới từ một nhóm có thể gồm sửa/xóa/ẩn.

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`: 22/22 task đạt; Web 134/134, API client 238/238 test.
- Test dùng InfiniteQueryObserver thật với 10 trang đã cache: created gốc/reply và updated chỉ có 1 request bình luận, getPost 0; hidden/deleted 1 request bình luận và 1 getPost. Danh sách không liên quan vẫn giữ 10 trang.
- Socket: bỏ tín hiệu đơn của mình, giữ metadata hai luồng khác nhau và không bỏ mất nhóm coalesced có actor cuối trùng mình.
- `tools/verify-tf101-web.cjs`: Web thật, API/socket mô phỏng; hidden placeholder vẫn đúng, đang cuộn có nút mới nhưng chưa phát request, bấm chỉ thêm 1 request, own event không làm tăng số.
- `tools/verify-tf101-live.cjs`: Hai phiên Playwright riêng, Core API và notification-service local thật. Hai QA account đăng nhập qua API thật; token ngắn hạn được đưa vào bootstrap refresh của trình duyệt do giới hạn OTP email theo IP. API bình luận và Socket.IO không mock: người xem kia nhận comment mới, người gửi không refetch; Core tự ẩn thì tác giả thấy khung xám, người khác không thấy dòng, API chỉ trả placeholder `hidden` đã redact và inbox không có `moderation.comment.hide`.

## Cách kiểm lại / ảnh
1. `pnpm turbo run lint typecheck test --affected`
2. Chạy Web :3100 rồi `node tools/verify-tf101-web.cjs` (PLAYWRIGHT_PACKAGE trỏ package đã cài nếu cần).
- Ảnh local: `D:/Sukem/VinUni/VSF/outputs/tf101-web/new-comments-pending.png`. Không commit ảnh.
- Ảnh live local: `D:/Sukem/VinUni/VSF/outputs/tf101-live/author-hidden.png`, `other-viewer.png`; kết quả và metadata socket: `result.json`. Không commit ảnh/kết quả QA.

## Ảnh hưởng
- API client socket dùng chung và Web của Thành. Callback được thêm metadata; callback cũ bỏ qua tham số vẫn dùng được.
- Mobile #208 vẫn draft và chưa nằm trong develop; hook invalidate của Mobile cần áp dụng cùng cách đọc theo phạm vi trước khi sẵn sàng merge.
