# TF46E — Banner thông báo bình luận và nhảy tới bình luận trên mobile

- Notion: (chưa có link) · Nhánh: `dung/TF46E-thong-bao-binh-luan-mobile` · Người làm: Dũng (dùng AI: có) · Ngày: 2026-11-16

## Đã làm
- **Banner khi app đang mở:** mobile chưa nối WebSocket `/ws` (trước đây chỉ web dùng `useNotificationsRealtime`), nên thông báo chỉ hiện khi mở màn Thông báo. Giờ `NotificationBanner` ở `_layout` gốc nối socket. Có `notification.created` thì banner trượt từ trên xuống trong 5 giây, gồm tiêu đề, câu mô tả và đoạn trích bình luận (`data.excerpt`, BE TF46E).
- **Bấm thông báo thì tới đúng bình luận:** bấm banner hoặc một mục trong danh sách thì mở `/trip/<postId>?comment=<commentId>&thread=<parentId>`. Màn bài viết mở sẵn khung bình luận, mở luồng trả lời nếu cần, cuộn tới bình luận đó và tô nền vàng nhạt.
- `api-client`: thêm `useNotificationsRealtime(onNotificationCreated?)` (tham số tuỳ chọn, web không đổi), `readCreatedNotification` và `getNotificationPostTarget`.
- Không thêm thư viện: `socket.io-client`, `react-native-reanimated` và `safe-area-context` đã có sẵn.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| App đang mở thì hiện banner kèm nội dung | Chờ thử trên máy | `notifications-realtime.test.ts` (callback nhận payload), `notifications.test.ts` (đọc payload) |
| Bấm vào thì tới đúng bình luận | Chờ thử trên máy | `notifications.test.ts`: `getNotificationPostTarget` cho comment, reply, reaction, moderation và booking |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`: 21/21 task pass. api-client có 29 file, 220 test pass. Web có 93 test pass, app-core 159 test pass.
- Lint 0 lỗi. Cảnh báo còn lại là cảnh báo có sẵn (`refreshRetries` ở `notifications-realtime.ts` và các file reels của mobile).

## Cách kiểm lại
1. Chạy `pnpm --filter @tripflix/mobile start` rồi mở bằng Expo Go, đăng nhập tài khoản A.
2. Dùng tài khoản B (web hoặc máy khác) bình luận vào bài của A.
3. Trên máy A sẽ thấy banner trượt xuống. Bấm vào thì mở bài, khung bình luận mở sẵn và bình luận đó được tô nổi.
4. Thử thêm: B trả lời bình luận của A. Luồng trả lời được mở sẵn và câu trả lời được tô nổi.

## Ảnh / video
- (Sẽ thêm vào PR sau khi thử trên máy.)

## Ảnh hưởng tới phần của người khác
- Có, `apps/mobile` (của Trang): `_layout.tsx`, `live-account-screens.tsx`, `live-post-detail-screen.tsx`, `reel-comments-panel.tsx`, `live-comments.tsx`, cùng file mới `features/account/notification-banner.tsx`. Cần báo Trang trước khi mở PR.
- `packages/api-client`: chỉ thêm, không đổi chữ ký cũ. Web vẫn gọi `useNotificationsRealtime()` như trước.

## Giới hạn
- Bình luận chỉ được tìm trong các trang đã tải. Nếu bình luận rất cũ, không nằm ở trang đầu, thì khung bình luận vẫn mở nhưng không cuộn tới được.
- Push khi app đã đóng không chạy được trên Expo Go. Muốn có thì cần `expo-notifications` và một bản dev build, là thư viện mới nên chưa thêm.
