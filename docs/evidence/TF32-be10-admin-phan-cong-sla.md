# BE-10 — Admin phân công và thời hạn xử lý

## Bổ sung 19/11/2026: tham chiếu bài đăng và ngữ cảnh trả lời

- Chi tiết bình luận có khối **Bài đăng chứa bình luận**: tiêu đề, trích nội dung, chủ bài (tên/email/ID), ID bài, trạng thái, quyền xem và ngày tạo.
- **Mở bài đăng gốc** mở tab mới tới đúng bài và comment qua `open`/`comment`. Chỉ có link khi bài đang công khai; bài ẩn/riêng tư hiển thị hướng dẫn đối chiếu ngay trong Admin, bài đã xóa có fallback rõ.
- Trả lời có nội dung và tác giả bình luận được trả lời. Dữ liệu cũ thiếu đích chính xác dùng nhãn bình luận gốc trong luồng; nội dung đã xóa không được hiển thị lại.
- Admin 41 test, lint/typecheck và production build đạt. Ba regression UI kiểm source/đích link, bài không công khai và trường hợp thiếu/xóa.
- Live Admin → Web đã mở đúng bài thật, đúng comment; chủ bài và người viết comment là hai tài khoản khác nhau. Đã xem ảnh `outputs/moderation-author-acceptance/comment-context-1440.png`, `comment-context-390.png`, không tràn ngang.

## Bổ sung 19/11/2026: nhận diện người bình luận

- Chi tiết có khối **Người bình luận** / **Người đăng bài** gồm tên hiển thị, email đăng ký và đầy đủ ID tài khoản; dòng tác giả phía trên dùng tên thay vì ID rút gọn.
- Tài khoản không còn tra cứu được có thông báo rõ và vẫn giữ ID; tên/email dài được xuống dòng trên màn hẹp.
- API client sinh lại từ OpenAPI. Admin 38 test đạt, gồm hai test render thông tin và fallback. Lint/typecheck đạt.
- `tools/verify-moderation-author-live.cjs` đạt với Core/Admin thật: tác giả bình luận khác chủ bài, đúng tên/email/ID, guest/member bị chặn, public comments không có email, card không tràn ở 1440/390px.
- Đã xem ảnh `outputs/moderation-author-acceptance/comment-author-1440.png`, `comment-author-390.png`; kết quả ở `result.json`. Dùng email seed local, không lưu token hay mật khẩu.

- Phạm vi: yêu cầu trực tiếp trong chat; tiếp nối epic TF32.
- Nhánh: `trang/TF32-be10-phan-cong-kiem-duyet`. Ngày: 18/11/2026. Dùng AI: có.

## Đã làm

- Khối phân công/SLA lấy số liệu tổng từ server: chưa nhận, của tôi, quá hạn, đến hạn trong 1 giờ, scan cần phục hồi. Có cảnh báo để trưởng nhóm kiểm duyệt xem backlog/scan thất bại.
- Bộ lọc người xử lý và SLA, tìm kiếm trên toàn bộ hàng chờ. Không lọc tìm kiếm chỉ trên các dòng đã tải nữa.
- Từng dòng hiển thị người giữ phiên/hết hạn và deadline. Phiên của mình ghi “Bạn đang xử lý”; người khác dùng ID ngắn để phân biệt.
- Chi tiết có nhận, gia hạn 15 phút, trả hồ sơ. Nút ra quyết định chỉ bật khi có lý do và mình đang giữ lease còn hạn. Đồng hồ cập nhật mỗi giây; BE vẫn kiểm lại khi ghi.
- Hàng loạt nhận từng hồ sơ trước khi quyết định; lỗi độc lập từng dòng và báo kết quả thật. Không chiếm hồ sơ Admin khác đang giữ.
- Lịch sử chi tiết có audit nhận/trả/gia hạn/xem bằng chứng; query của tôi/stats/detail tách theo danh tính đăng nhập.
- Khi mở lại chi tiết luôn tải bản mới, tránh cache “Chưa nhận” từ trước đó; thao tác lỗi cũng làm mới hàng chờ và phiên.
- API client sinh lại từ OpenAPI BE; không sửa tay code sinh. Phân trang cursor mới dùng được với UI hiện có.

## Kiểm tra

- Admin lint/typecheck đạt; Admin **36 test đạt**, gồm hai test capability chủ phiên, thiếu field, phiên hết hạn đúng biên thời gian và phiên không hợp lệ.
- API client **290 test**, i18n **2 test** đạt; lượt scoped lint/typecheck/test 9 tác vụ đạt.
- Production build Admin đạt; boundary check và `git diff --check` đạt.
- Script `tools/verify-be10-live.cjs`: Edge/Playwright, hai tài khoản staff, Core/Admin/Postgres/Redis thật, không mock API. Tự tạo và soft-delete các bài QA riêng; không ghi mật khẩu/token ra evidence.

| Luồng thật | Kết quả |
|---|---|
| Đăng nhập hai Admin, nhận và gia hạn | Đạt; gia hạn không đổi dueAt |
| Chưa nhận / người khác giữ: nút quyết định khóa | Đạt; API cũng chặn 409 |
| Trả rồi người khác nhận, mã phiên cũ bị từ chối | Đạt |
| Phiên hết hạn, nhận lại, lọc Của tôi + Quá hạn | Đạt |
| Lịch sử audit, quyết định UI và gọi lặp | Đạt |
| Hàng loạt gồm hồ sơ đang bị giữ bởi người khác | Đạt: 1 thành công, 1 thất bại, không ảnh hưởng hồ sơ người khác |
| Xem ảnh 1440px / 390px | Đạt; panel lease và nút không tràn khung |

Ảnh/kết quả tại workspace VSF `outputs/be10-acceptance`: `owner-lease-1440.png`, `owner-lease-390.png`, `other-admin-blocked.png`, `queue-bulk-partial.png`, `result.json`. Không commit ảnh vào repo.

## Cách thử local

1. Vào `http://localhost:3200/moderation`, đăng nhập moderator/superadmin.
2. Tab Chờ duyệt → Chi tiết → **Nhận hồ sơ**. Chọn lý do rồi xử lý, hoặc **Gia hạn 15 phút / Trả hồ sơ**.
3. Mở cùng hồ sơ bằng tài khoản Admin khác: xem người giữ phiên, nút nhận/duyệt bị khóa. Người đang giữ trả hồ sơ thì người kia nhận được.
4. Thử filter **Chưa nhận / Của tôi**, **Quá hạn / Đến hạn trong 1 giờ**; tìm theo nội dung/ID.

SLA ban đầu: ưu tiên cao 1 giờ, thường 24 giờ từ lúc mở hồ sơ. Gia hạn chỉ gia hạn quyền xử lý, không gia hạn SLA.

Ảnh hưởng: Admin của Thành, packages/api-client và i18n. Không sửa Web/Mobile, không thêm thư viện. Cần migration/Core BE-10 trước Admin mới. Cảnh báo escalation ở trong Admin; chưa có gửi email/Slack ngoài hệ thống. Chưa triển khai production.
