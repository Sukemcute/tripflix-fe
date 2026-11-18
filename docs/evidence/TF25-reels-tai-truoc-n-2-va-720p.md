# TF25 — Reels web tải trước video, bắt đầu ở mức nét nhất, lướt không lag

- Notion: TF25 · Nhánh: `thanh/TF25-reels-tai-truoc-2-video` · Người làm: Thành (dùng AI: có) · Ngày: 2026-11-18

## Đã làm
- **Tải trước theo vị trí** (`reel-post.ts`): bài đang xem, 2 bài phía trước và 1 bài phía sau có thẻ `<video>`. Rời cửa sổ là gỡ nguồn (`removeAttribute('src')` + `load()`) để trình duyệt xoá bộ đệm; số thẻ video luôn ≤ 4.
- **Ưu tiên video đang xem** (như app video ngắn): vừa lướt chỉ tải bài đang xem và bài kế tiếp; bài thứ 2 phía trước chỉ tải khi video đang xem đã chạy (hoặc sau 2 giây).
- **Không tua thừa**: trước đây đổi bài là `currentTime = 0` kể cả video tải sẵn đang ở đầu; Chrome tua thật và tải lại, mất 1,2–2,8 giây (lỗi có sẵn ở develop). Giờ chỉ tua khi video đã chạy dở.
- **Bắt đầu ở mức nét nhất ≤ 720p** (`reel-hls.ts`): Chrome bản mới (157) và Safari tự phát HLS, gắn `master.m3u8` thì bắt đầu ở 360p. Giờ gắn thẳng playlist mức nét nhất (`getReelPlaybackSources`, như mobile). Lỗi, hoặc người xem đang chờ (bấm phát chưa có hình, hay đang phát mà đứng chờ tải) quá 8 giây thì lùi một mức, phát tiếp đúng chỗ; nguồn cuối là master. Video tải sẵn ngoài màn hình không bị lùi mức.
- **Mạng yếu như TikTok**: video đứng chờ tải thì thanh tiến độ có vệt sáng chạy qua; bài chưa có hình hiện vòng chờ (cả khung rỗng khi lướt quá nhanh).
- **Chặn lướt khi bài kế tiếp chưa có hình**: khung video trượt lên 64px lộ dải dưới có vòng chờ "Đang tải video tiếp theo…", tối đa 3 giây (Safari iPhone không tải trước video, chặn mãi thì kẹt). Hết bài đã tải thì chờ trang sau, về rồi tự sang.
- hls.js (Firefox): chọn mức ≤ 720p sau khi đọc master; bộ đệm 30/10/4 giây cho bài đang xem/phía trước/phía sau.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Tải trước video phía trước, giữ video phía sau, rời cửa sổ thì xoá bộ đệm | Đạt | `reel-post.test.ts` (`getReelRenderMode`, `shouldLoadReelSource`); `reel-hls.test.ts` "dọn thì gỡ nguồn" |
| Lướt tới video đã tải sẵn là chạy ngay | Đạt | Đo bên dưới: ~0,5 giây (bằng thời gian cuộn) |
| Bắt đầu ở mức nét nhất, mạng yếu tự lùi | Đạt | `reel-hls.test.ts` "gắn thẳng playlist 720p", "đứng chờ tải quá 8 giây thì lùi một mức, phát tiếp đúng chỗ" |
| Mạng yếu có báo đang tải | Đạt | Hạ băng thông giữa chừng: thanh tiến độ bật `data-buffering` lúc đứng, tắt khi chạy lại |
| Lướt nhanh không vào khung đen | Đạt | `reel-post.test.ts` `canStepToNextReel`; đo: lướt bị chặn khi bài kế chưa có hình |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/web`: 3/3 task (lint 0 lỗi, 16 cảnh báo có sẵn).
- `--affected`: `@tripflix/mobile#typecheck` fail do file sinh `apps/mobile/.expo/types/router.d.ts` cũ trên máy; PR không sửa file mobile.

### Đo lướt Reels (Chrome 157 headless qua CDP, `localhost:3100/inspiration?view=reels`, phím ↓, 8 lần lướt)
Thời gian từ lúc lướt tới khi video của bài mới bắn `playing`. Mạng tới CloudFront dao động, mỗi cấu hình đo 1–2 lần.

| Bản | Lướt mỗi 1,5 giây | Lướt mỗi 3 giây |
|---|---|---|
| develop | trung vị 2.491 ms (chậm nhất 3.567) | trung vị 869 ms (chậm nhất 1.260) |
| Bản đầu của PR (N ± 2, chưa sửa) | trung vị 6.724 ms, 2/6 lần > 8 giây | — |
| Bản này | trung vị 505–529 ms; 4/8 lần bị chặn chờ bài kế | trung vị 488–529 ms; 2–3/8 lần bị chặn |

Đánh đổi đo được: gắn `master.m3u8` thay vì mức nét nhất thì lướt mỗi 3 giây không bị chặn lần nào giữa danh sách (trung vị 542 ms) nhưng bắt đầu ở 360p. Trình duyệt tự phát cần lâu hơn để có hình khi tải trước một playlist một mức.

## Cách kiểm lại
1. `pnpm --filter @tripflix/web exec vitest run src/features/social/reel-post.test.ts src/features/social/reel-hls.test.ts`
2. Mở `/inspiration?view=reels`, F12 → Network, lọc `m3u8|ts`; lướt nhanh bằng phím ↓: video chạy ngay khi cuộn xong, bài kế chưa tải xong thì khung trượt lên có vòng chờ. Network → Slow 3G giữa chừng: thanh tiến độ có vệt sáng.

## Ảnh / video
- Không chụp ảnh; số đo ở bảng trên.

## Ảnh hưởng tới phần của người khác
- `reel-hls.ts` của anh Phong (TF64): giữ hàm và tham số cũ, chỉ thêm tuỳ chọn (`sources`, `bufferSeconds`, `onBufferControl`). Đã báo anh Phong.
- Phát hiện ngoài phạm vi (đã báo anh Phong, chưa sửa): hls.js gửi cookie bị CloudFront chặn CORS ở dev lẫn `media.tripflix.io.vn`, nên Firefox máy tính chưa phát được Reels.
