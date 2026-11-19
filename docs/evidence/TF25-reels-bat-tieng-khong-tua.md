# TF25 — Bật tắt tiếng Reels không tua về đầu

- Nhánh: `thanh/TF25-reels-bat-tieng-khong-tua` · Người làm: Thành (dùng AI: có) · Ngày: 2026-11-19
- Notion: chưa có liên kết trong brief.

## Đã làm

- Giữ callback phát ổn định và đọc trạng thái tắt tiếng mới nhất qua ref. Khi trình duyệt chặn tự phát có tiếng, vẫn thử lại với tiếng tắt.
- Chỉ tua và phát lại khi chuyển bài; hai điều khiển âm lượng tiếp tục cập nhật trực tiếp `muted` và `volume`.
- Thêm kiểm thử video giả cho đổi tiếng trên cùng bài, chuyển bài và video đã ở đầu.

## Kết quả kiểm tra

- Web lint: 0 lỗi, 28 cảnh báo.
- Web typecheck: `next typegen` và `tsc --noEmit` pass.
- Web Vitest: 50 file, 366 test pass.
- Kiểm thử thủ công trên trình duyệt: chưa thực hiện.

## Cách kiểm lại

1. Mở một Reel, để video phát qua vài giây rồi bật, tắt tiếng và kéo thanh âm lượng; kiểm tra video không tua về đầu hoặc phát lại.
2. Lướt sang bài khác rồi quay lại bài cũ; kiểm tra bài bắt đầu lại từ đầu và nút phát/dừng vẫn hoạt động.
3. Kiểm tra trình duyệt chặn autoplay có tiếng vẫn thử phát ở chế độ tắt tiếng.

## Ảnh / video

- Bản sửa lỗi tua không thay đổi giao diện; chưa có video kiểm thử thủ công.
- Bổ sung giao diện thumb âm lượng: đã xem mẫu thanh độc lập bằng Chromium headless, chưa chụp được màn hình Reels trong ứng dụng. Cần kiểm tra thực tế Chrome/Edge và Firefox, gồm kéo, phím và hai đầu thanh.

## Ảnh hưởng tới phần của người khác

- Có: logic phát Reels trong `apps/web` do Thành phụ trách; yêu cầu đã được Thành giao qua orchestrator. Không sửa HLS, cookie hay `packages/*`.
