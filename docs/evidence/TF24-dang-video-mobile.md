# TF24 — Đăng bài video trên app (phần tải video lên)

- Task: TF24 (Jira SCRUM-28, Notion TF24) · Nhánh: `phong/TF24-dang-video-mobile` · Người làm: Phong (dùng AI: có) · Ngày: 2026-11-10
- Thành phụ trách TF24 và đồng ý để Phong làm phần mobile: chọn video, tải lên, tạo và đăng bài. Phần lộ trình và web Thành giữ.

## Đã làm
- `api-client`: thêm `uploadVideo` dùng chung cho web và mobile.
  - Gọi `POST /api/media/uploads`, PUT từng phần vào link S3 ký sẵn, rồi `complete`.
  - Lỗi mạng, 5xx, 408, 429 thì thử lại phần đó (chờ 1, 2, 4 giây). S3 trả 403 (link hết hạn) thì xin link mới cho đúng phần đó.
  - Huỷ được bằng `AbortSignal`, báo tiến độ theo số byte.
- `uploadChunkToPresignedUrl` ném `PresignedUploadError` có mã HTTP, nhận thêm `signal`. Web gọi như cũ vẫn chạy.
- Mobile, màn tạo bài thật (`live-create-screen.tsx`):
  - Nút chọn video từ thư viện; hiện thời lượng, dung lượng và nút bỏ video.
  - Bấm Đăng: tải video lên, hiện tiến độ phần trăm, rồi tạo bài `post_type: 'video'` có `media_ids`.
  - Tải xong mà tạo bài lỗi thì bấm lại không tải lại video.
  - Đăng xong báo video đang xử lý.
- Đọc video theo từng đoạn 10 MB bằng `expo-file-system` (`FileHandle.readBytes`), không nạp cả file vào bộ nhớ. Trên web dùng `File` của trình duyệt.
- Chỉ nhận MP4, MOV vì API media chỉ nhận hai loại này.

## Đối chiếu "Xong khi"
| Tiêu chí (chép từ task) | Đạt | Bằng chứng |
|---|---|---|
| Đăng được bài kèm lộ trình | Một phần | Đăng được bài có video. Chưa có lộ trình trên mobile (Thành làm). |
| Rút mạng giữa chừng rồi bật lại vẫn tải tiếp | Chưa | Mất mạng ngắn thì phần đang tải được thử lại 3 lần. Chưa lưu nháp "Đang chờ mạng" và chưa tải tiếp từ phần đã dừng sau khi đóng app. |
| Video ≤ 60 giây | Chưa | App và API đang cho tối đa 5 phút (`POST_MEDIA_LIMITS`, `content/media`). Cần chốt lại giới hạn. |
| Vlog ≤ 10 ảnh | Chưa | API media chưa nhận ảnh. |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test`: 23/23 task đạt, sau khi merge `develop` mới nhất.
- `node tools/check-boundaries.mjs`: không vi phạm.
- `api-client`: 120/120 test, trong đó 12 test mới ở `video-upload.test.ts`:
  - đủ phần, đúng đoạn byte, ETag gửi khi hoàn tất;
  - 403 thì xin link mới;
  - lỗi mạng và 503 thì thử lại, không đọc lại file;
  - dừng sau số lần thử tối đa;
  - 400 không thử lại;
  - huỷ giữa chừng;
  - 6 trường hợp đọc loại video.
- Cùng luồng API này đã chạy thật trên staging bằng script (2026-11-10): video 60 giây, 58 MB, 6 phần; worker chuyển mã xong 3 mức sau 245 giây; phát được qua CloudFront.
- Chưa thử trên điện thoại thật.

## Cách kiểm lại
1. `pnpm install && pnpm turbo run lint typecheck test --filter=@tripflix/api-client --filter=@tripflix/mobile`
2. `EXPO_PUBLIC_API_URL=https://api.tripflix.io.vn pnpm --filter @tripflix/mobile start --go --tunnel --clear`
3. Đăng nhập, mở tab Đăng bài, chọn video dưới 5 phút, điền tiêu đề và nội dung, bấm Đăng bài.
4. Chờ thanh tiến độ tới hết. Sau vài phút bài hiện video trong Reels.

## Ảnh / video
- Chưa có, bổ sung sau khi thử trên điện thoại.

## Ảnh hưởng tới phần của người khác
- `apps/mobile` (chủ: Trang): Trang đã đồng ý.
- TF24 (Thành): Thành đã đồng ý giao phần mobile.
- `packages/api-client/src/media-upload.ts` (web dùng, Thành viết ở TF25): chỉ thêm, test cũ vẫn qua.
- Thêm `expo-file-system ~58.0.13` vào `apps/mobile/package.json`.
