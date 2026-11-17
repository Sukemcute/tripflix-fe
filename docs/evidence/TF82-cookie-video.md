# TF82 — App gửi cookie CloudFront khi phát Reels

- Jira: SCRUM-103 (TF82) · Nhánh: `phong/TF82-cookie-video` · Người làm: Phong (dùng AI: có) · Ngày: 2026-11-17
- Phụ thuộc BE: Sukemcute/tripflix-be#233 (`POST /api/media/playback-session`). Evidence phần BE và AWS nằm ở `tripflix-be/docs/evidence/TF82-cookie-video.md`.

## Đã làm
- `packages/api-client`:
  - Client sinh cho `POST /api/media/playback-session`. Chỉ đưa vào phần của endpoint này; các file sinh khác giữ nguyên như trên develop.
  - `usePlaybackSession` xin cookie, giữ một cookie cho mọi video, và xin lại trước khi hết hạn 30 phút.
  - Lỗi thì chỉ thử lại một lần, rồi phát không kèm cookie, giống khi BE chưa bật ký. Nhờ vậy app không kẹt khi BE chưa có endpoint.
- `apps/mobile`:
  - Màn Reels xin cookie cùng lúc với tải feed, nên video đầu không phải chờ thêm một lượt gọi API.
  - `use-player-pool` chờ có kết quả cookie rồi mới gắn nguồn video, kèm `headers: { Cookie }`.
  - Cookie mới (vài giờ một lần) không bắt video đang xem tải lại.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| App gửi cookie CloudFront khi phát video | Code xong, chưa thử máy thật | `use-player-pool.ts`; cần thử trên iPhone và Android sau khi staging có khoá |
| Không làm chậm video đầu | Chưa đo | Đo thời gian từ lúc mở Reels tới khung hình đầu, trước và sau |
| BE chưa bật ký thì app vẫn phát như cũ | Có | `playback-session.test.ts`: cookie rỗng thì không gắn header; lỗi thì `isSettled` vẫn true |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`: 22/22 tác vụ đạt. api-client 225 test, app-core 174 test, web 104 test.
- Không có cảnh báo lint mới; các cảnh báo trong `use-player-pool.ts` và `reels-screen.tsx` có từ trước.
- Test mới trong `playback-session.test.ts` (5 test):
  - ghép header Cookie, giữ nguyên ký tự `~ _ -`;
  - cookie rỗng thì không gắn header;
  - thời điểm xin lại;
  - gọi đúng endpoint;
  - phản hồi sai dạng thì báo lỗi.

## Cách kiểm lại
1. `pnpm --filter @tripflix/api-client exec vitest run src/playback-session.test.ts`
2. Sau khi staging có khoá: chạy app với `EXPO_PUBLIC_API_URL=https://api.tripflix.io.vn`, mở Reels, video phát bình thường.
3. Sau `set-video-lock.sh on` trên CloudFront: video vẫn phát. `curl` một link `.m3u8` không kèm cookie phải trả 403.

## Giới hạn
- Trên Android, `expo-video` gắn cache video với giá trị cookie, nên khoảng 6 giờ cache phải tải lại một lần.
- Một reel mở liền hơn 5,5 giờ có thể lỗi khi cookie cũ hết hạn; nút thử lại có sẵn sẽ lấy cookie mới.

## Ảnh / video
- Chưa có. Sẽ thêm khi thử trên máy thật.

## Ảnh hưởng tới phần của người khác
- `apps/mobile` (Trang): `reels-screen.tsx` và `use-player-pool.ts` thêm tham số cookie, không đổi hành vi khi không có cookie.
