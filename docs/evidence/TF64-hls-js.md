# TF64 — Web: phát HLS bằng hls.js kèm cookie CloudFront, xin lại cookie khi gặp 403

- Jira: SCRUM-68 (TF64) · Nhánh: `phong/TF64-hls-js` · Người làm: Phong (Thành giao lại; dùng AI: có) · Ngày: 2026-11-17
- Cần chạy trước khi deploy: `tripflix-be/deploy/aws/setup-video-cors.sh` (nhánh BE `phong/TF64-video-cors`).

## Đã làm
- Thư viện mới `hls.js` 1.7.4 (Apache-2.0, phát hành 28/10/2026). Thêm vào catalog `pnpm-workspace.yaml`. Phong đã đồng ý dùng.
- `apps/web/src/features/social/reel-hls.ts` chọn cách phát theo tính năng của trình duyệt, không dò tên trình duyệt:
  1. Trình duyệt phát HLS sẵn (Safari, Chrome Android; Chrome 158 trên máy tính cũng trả `canPlayType` = `"maybe"`): dùng thẻ `<video>` như cũ. Thẻ này tự gửi cookie vì cùng site, và không tải hls.js.
  2. Còn lại, có MSE (Firefox, Chrome cũ): tải hls.js lúc cần (tách bundle), bật `xhr.withCredentials = true` để gửi cookie CloudFront.
  3. Không phát được bằng cả hai: vẫn gắn `src` để thẻ `<video>` báo lỗi như trước.
- Xin lại cookie khi gặp lỗi:
  - hls.js gặp lỗi mạng làm dừng phát với mã 403, hoặc mã 0 khi trình duyệt chặn phản hồi lỗi không có CORS: gọi `refresh` của `usePlaybackSession` rồi gắn lại nguồn. Chỉ xin lại một lần; lỗi tiếp thì hiện lỗi như cũ.
  - `usePlaybackSession` thêm hàm `refresh`.
- `live-posts.tsx` dùng `attachReelHlsSource` thay cho `attachReelVideoSource`. Hàm cũ vẫn dùng bên trong cho đường phát sẵn.

## Vì sao cần sửa CloudFront
Request XHR có `withCredentials` không được trình duyệt nhận khi phản hồi trả `Access-Control-Allow-Origin: *` (policy `Managed-SimpleCORS` đang dùng). `setup-video-cors.sh` tạo policy `tripflix-video-cors` chỉ cho `*.m3u8` và `*.ts`: trả đúng `https://tripflix.io.vn` kèm `Access-Control-Allow-Credentials: true`. Deploy bản web này trước khi chạy script thì Firefox không phát được video. Chrome bản mới và Safari không bị ảnh hưởng.

## Đối chiếu "Xong khi" (phần còn lại của TF64)
| Tiêu chí (Jira) | Đạt | Bằng chứng |
|---|---|---|
| `Hls.isSupported()`: hls.js với `xhrSetup` bật `withCredentials` | Có | `reel-hls.test.ts`: "Chrome, Firefox máy tính: phát bằng hls.js, XHR gửi kèm cookie" |
| Không có MSE mà `canPlayType` HLS: `video.src` | Có, đổi thứ tự | Phát sẵn được thì ưu tiên, để Safari và Chrome bản mới không phải tải hls.js |
| Gọi lại khi player gặp 403 | Có | `reel-hls.test.ts`: lỗi do cookie, `isPlaybackAuthError` |
| Gọi lại ở khoảng 80% TTL | Có (#184) | Xin lại trước khi hết hạn 30 phút (hạn 6 giờ, tức khoảng 92%) |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`: 22/22 tác vụ đạt. Web 119 test (8 test mới trong `reel-hls.test.ts`), api-client 227 test. Không có cảnh báo lint mới.
- Chrome 158 trên máy, chạy headless: `canPlayType('application/vnd.apple.mpegurl')` = `"maybe"` và có `MediaSource`, nên Chrome bản mới đi đường `<video>`.
- Chưa thử Firefox với hls.js trên staging: cần chạy `setup-video-cors.sh` trước.

## Cách kiểm lại
1. `pnpm --filter @tripflix/web exec vitest run src/features/social/reel-hls.test.ts`
2. Sau `setup-video-cors.sh` và deploy: mở Reels trên Firefox. DevTools → Network: request `.m3u8` và `.ts` là XHR, có header `Cookie: CloudFront-…`, phản hồi có `access-control-allow-credentials: true`.

## Ảnh / video
- Không đổi giao diện.

## Ảnh hưởng tới phần của người khác
- `apps/web` (Thành, đã giao TF64 cho Phong): `live-posts.tsx`, file mới `reel-hls.ts`.
- `packages/api-client`: `usePlaybackSession` thêm `refresh`, không đổi phần cũ.
- `pnpm-workspace.yaml` (cấu hình chung, Tech Lead): thêm một dòng catalog.
