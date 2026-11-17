# TF101 phần 5 — Mobile: khung xám và tải lại bình luận realtime

- Jira: [SCRUM-125](https://tripflix.atlassian.net/browse/SCRUM-125)
- Nhánh: `trang/TF101-mobile-binh-luan-realtime` · Trang (dùng AI: có) · 2026-11-17
- Phụ thuộc FE [#206](https://github.com/Sukemcute/tripflix-fe/pull/206), BE [#249](https://github.com/Sukemcute/tripflix-be/pull/249) và [#250](https://github.com/Sukemcute/tripflix-be/pull/250). Nhánh tách từ TF101 Web, không sửa lại phần Web.

## Đã làm
- LiveComments dùng chung ở bài viết và bảng Reels: theo dõi bài qua watchPostComments của phần Web; chỉ danh sách gốc đăng ký, trả lời dùng chung lần tải lại.
- Hook tải lại comments, focus thread, chi tiết bài, danh sách bài và feed khi nhận sự kiện; giữ dữ liệu cache khi đang tải. Việc gom sự kiện, reconnect và rời phòng dùng helper đã có trong #206.
- Bình luận moderationState hidden hiện khung xám với chữ i18n, màu/spacing token; không hiện body hoặc các nút sửa/thích/trả lời/báo cáo. Tác giả vẫn có Xóa, disable khi mutation pending.
- Hủy trạng thái sửa/trả lời nếu bình luận đang sửa/trả lời trở thành hidden.
- Tìm hiểu thêm mở /moderation-status, đóng Modal trước để màn mới không bị che.

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`: 22/22 task đạt; API client 238/238 test. Lint có warning, 0 error.
- post-comments-realtime.test.ts: 2/2 đạt; sự kiện invalidate danh sách gốc/trả lời và số đếm, giữ dữ liệu cache/bình luận bài khác; danh sách trả lời không tạo watcher, cleanup rời watcher.
- `pnpm --filter @tripflix/api-client exec vitest run --globals --root ../.. tools/verify-tf101-mobile.test.tsx`: 2/2 đạt. Render component React Native bằng mock host: chữ vi phạm, tìm hiểu, quyền Xóa/pending; không có sửa/thích/trả lời.
- `tools/verify-tf101-mobile.cjs`: Expo web thật ở :8082, API và Socket.IO mô phỏng. Đạt: visible → hidden sau sự kiện, body cũ biến mất, số đếm cập nhật, Xóa còn hiện; Tìm hiểu thêm mở đúng màn trạng thái.

## Cách kiểm lại
1. `pnpm turbo run lint typecheck test --affected`
2. Chạy lệnh Vitest UI ở trên.
3. Chạy Expo web ở :8082 rồi `node tools/verify-tf101-mobile.cjs`; PLAYWRIGHT_PACKAGE trỏ package playwright đã cài nếu cần.
4. Trên Android, đăng nhập hai tài khoản với BE TF101, mở cùng bài public; tự ẩn bình luận rồi kiểm tra dòng thay thế của tác giả, người khác mất dòng, không thêm notification. Kiểm tra đóng bảng và mở màn kiểm duyệt.

## Ảnh / giới hạn
- Ảnh Expo web 390×844: `D:/Sukem/VinUni/VSF/outputs/tf101-mobile/hidden-comment-expo-web.png` (artifact local, không commit ảnh).
- Chưa có Android SDK/ADB hoặc emulator dùng được trong phiên này; chưa kiểm chứng Android native hoặc luồng hai tài khoản với backend thật. PR draft chờ bước này.
- Socket BE yêu cầu đăng nhập, nên realtime phòng bài áp dụng cho người dùng đã đăng nhập.

## Ảnh hưởng tới phần của người khác
- Mobile của Trang; thêm hook và test trong API client dùng chung. Không đổi API/schema, không thêm thư viện. Thành review sau khi #206 merge; PR này chưa merge trước #206.
