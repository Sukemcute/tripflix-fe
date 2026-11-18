# TF25 — Reels web tua video bằng thanh tiến độ, bỏ chú thích thừa

- Notion: TF25 · Nhánh: `thanh/TF25-reels-tua-video` · Người làm: Thành (dùng AI: có) · Ngày: 2026-11-18

## Đã làm
- **Thanh tua như TikTok** (`reel-seek-bar.tsx`, mới):
  - Bấm vào một điểm trên thanh: tua tới đó.
  - Nhấn giữ rồi kéo: thanh đi theo chuột, hiện mốc "0:17 / 0:23" phía trên thanh; tên, chú thích, thẻ lộ trình tạm ẩn để mốc nổi rõ. Thả chuột mới tua (tua liên tục khi kéo làm HLS tải lại liên tục).
  - Phím ← / → lùi, tiến 5 giây; Home / End về đầu, cuối. ↑ / ↓ vẫn chuyển bài.
  - Dùng `<input type="range">` trong suốt phủ lên thanh: có sẵn chuột, bàn phím, trình đọc màn hình (`aria-label` "Tua video", `aria-valuetext` "0:17 / 0:23"). Thanh nhìn vẫn mảnh 4px, vùng bấm cao 20px; rê chuột hoặc kéo thì dày lên và hiện nút tròn.
  - Vòng cập nhật thanh tiến độ và vệt sáng khi chờ tải chuyển từ `live-posts.tsx` sang component này.
- **Bỏ chú thích thừa**: 6 nút ở thanh bên trái của Cảm hứng (đang hiện hai bong bóng cùng lúc: CSS `::before` và `TooltipLayer`) và 2 nút lên/xuống của Reels. Giữ `aria-label`. Xoá CSS chú thích của dock không còn dùng.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Bấm một điểm trên thanh thì tua tới đó | Đạt | Chrome qua CDP: bấm 75% → 59,1 / 78,4 giây |
| Kéo thì thấy mốc "giây / tổng", thả mới tua | Đạt | Kéo 20% → 60%: hiện "0:47 / 1:18", video chưa tua; thả → 47,1 giây |
| Mốc thời gian dạng 0:17 | Đạt | `reel-post.test.ts` `formatReelTime` |
| Bàn phím tua được, ↑ / ↓ vẫn chuyển bài | Đạt | `reel-post.test.ts` `getReelKeySeekTarget` |
| Không còn chú thích ở dock và nút lên/xuống | Đạt | CDP: không nút nào còn `data-tooltip`, rê lên nút Reels không hiện bong bóng |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/web`: 3/3 task (lint 0 lỗi; 21 cảnh báo có sẵn trên develop).
- Test mới: `formatReelTime`, `getReelKeySeekTarget` (`reel-post.test.ts`), `reel-seek-bar.test.tsx` (render thanh tua).

## Cách kiểm lại
1. `pnpm --filter @tripflix/web exec vitest run src/features/social/reel-post.test.ts src/features/social/reel-seek-bar.test.tsx`
2. Mở `/inspiration?view=reels`: bấm một điểm trên thanh dưới video; nhấn giữ rồi kéo để thấy mốc thời gian; rê chuột lên các nút ở thanh bên trái và nút lên/xuống: không còn chú thích.

## Ảnh / video
- Không chụp ảnh; kết quả đo ở bảng trên.

## Ảnh hưởng tới phần của người khác
- Không. `live-posts.tsx`, `instagram-left-dock.tsx`, `social-feed.module.css` là phần web của anh Thành.
