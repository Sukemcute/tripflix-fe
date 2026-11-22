# TF25 — Reels web xin lại cookie CloudFront khi phát bằng thẻ <video>

- Notion: TF25 · Nhánh: `thanh/TF25-reels-xin-lai-cookie` · Người làm: Thành (dùng AI: có) · Ngày: 2026-11-18

## Đã làm
- Anh Phong review PR #225: từ khi Chrome máy tính tự phát HLS, Chrome đi đường thẻ `<video>` thay cho hls.js. Đường này không gọi `onAuthError`, nên cookie CloudFront hết hạn (6 giờ) thì video lùi hết các mức rồi báo lỗi, không xin cookie mới (trước đây hls.js thấy mã 403 nên tự xin lại).
- `reel-hls.ts`: đường thẻ `<video>` (Chrome, Edge, Safari; và trình duyệt không có MSE) lùi hết các mức mà vẫn lỗi thì gọi `onAuthError` một lần (thẻ `<video>` không cho biết mã lỗi, nên coi như có thể do cookie). Lỗi tiếp mới gọi `onFatalError`.
- `live-posts.tsx` không đổi: `onAuthError` đã xin cookie mới (`usePlaybackSession().refresh`) rồi gắn lại nguồn từ mức nét nhất, mỗi Reel một lần; lần sau vẫn lỗi thì báo lỗi phát.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Lùi hết mức thì xin cookie mới một lần trước khi báo lỗi | Đạt | `reel-hls.test.ts` "hết nguồn mà vẫn lỗi … xin cookie mới một lần, lỗi tiếp mới báo lỗi phát" |
| Còn nguồn thì chỉ lùi mức, không xin cookie | Đạt | `reel-hls.test.ts` "mức đang thử lỗi thì lùi một mức, chưa báo lỗi khi còn nguồn" |
| Trình duyệt không có MSE cũng xin lại | Đạt | `reel-hls.test.ts` "không có MSE … xin cookie mới một lần" |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/web`: 3/3 task (lint 0 lỗi; 21 cảnh báo có sẵn trên develop).
- `reel-hls.test.ts`: 20/20 test pass.

## Cách kiểm lại
1. `pnpm --filter @tripflix/web exec vitest run src/features/social/reel-hls.test.ts`

## Ảnh / video
- Không đổi giao diện.

## Ảnh hưởng tới phần của người khác
- `reel-hls.ts` của anh Phong (TF64): anh Phong đề nghị sửa trong review PR #225.
