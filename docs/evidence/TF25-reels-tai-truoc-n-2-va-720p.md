# TF25 — Reels web tải sẵn N ± 2 video và bắt đầu ở 720p

- Notion: TF25 · Nhánh: `thanh/TF25-reels-tai-truoc-2-video` · Người làm: Thành (dùng AI: có) · Ngày: 2026-11-18

## Đã làm
- **Tải sẵn và giữ N ± 2** (`reel-post.ts`): bài đang xem và 2 bài mỗi phía có thẻ `<video>`. Trước đây chỉ bài đang xem và 1 bài kế tiếp có video, bài N+2 chỉ có ảnh bìa, lướt nhanh 2 bài là phải chờ tải. Cách 3 bài chỉ còn ảnh bìa: rời cửa sổ là gỡ nguồn (`removeAttribute('src')` + `load()`), trình duyệt xoá bộ đệm của video đó, nên lướt lâu bộ nhớ không tăng dần. Số thẻ video luôn tối đa 5.
- **Bắt đầu ở 720p như Reels mobile** (`reel-hls.ts`):
  - Chrome, Edge (bản mới tự phát HLS) và Safari: trước đây gắn `master.m3u8`, trình duyệt tự đo băng thông bằng **360p** rồi mới lên mức cao, nên mấy giây đầu mờ và video tải sẵn ở 360p. Giờ gắn thẳng playlist của mức nét nhất ≤ 720p (`getReelPlaybackSources` của `app-core`, mobile đang dùng). Mức đó lỗi hoặc 8 giây chưa có hình thì lùi một mức; nguồn cuối là master. Hết nguồn mới báo lỗi phát.
  - Firefox (phát bằng hls.js): chờ đọc xong master rồi mới tải, chọn mức ≤ 720p làm mức bắt đầu; ước lượng băng thông ban đầu 5 Mbps thay cho 500 kbps mặc định. Bộ đệm theo vị trí: bài đang xem 30 giây, bài phía trước 10 giây, bài phía sau 4 giây (đổi lúc đang chạy, không gắn lại nguồn).
- `live-posts.tsx`: truyền danh sách nguồn và số giây đệm cho từng Reel. Bỏ `onError` trên thẻ `<video>`: lỗi giờ báo qua `attachReelHlsSource` để lỗi của mức 720p không hiện lỗi khi còn mức thấp hơn để thử.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Tải sẵn 2 video phía trước, giữ 2 video phía sau | Đạt | `reel-post.test.ts` "N ± 2 có video"; đo trình duyệt: đứng ở video 3 có thẻ video 1–5 |
| Rời cửa sổ thì xoá bộ đệm | Đạt | `reel-hls.test.ts` "dọn thì gỡ nguồn"; đo: video 0 bị gỡ khi lướt tới video 3 |
| Lướt 100 bài, số video cố định | Đạt | `reel-post.test.ts` "số thẻ video luôn tối đa 5" |
| Bắt đầu ở 720p (mức nét nhất có, ≤ 720p) | Đạt | `reel-hls.test.ts` "gắn thẳng playlist 720p", `pickReelStartLevel`; đo: không còn request 360p hay master |
| Mạng chậm/lỗi vẫn phát | Đạt | `reel-hls.test.ts` "lỗi thì lùi một mức", "quá 8 giây chưa có hình thì lùi" |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/web`: 3/3 task pass; test `features/social`: 20 file, 144 test pass.
- `pnpm turbo run lint typecheck test --affected`: 14/17 task pass. `@tripflix/mobile#typecheck` fail do file sinh `apps/mobile/.expo/types/router.d.ts` trên máy cũ (route `/my-trips`, `/user/[id]`…), nhánh này không sửa file mobile nào.

### Đo bằng Chrome 157 headless qua CDP (như tab Network của F12), `localhost:3100/inspiration?view=reels`, lướt bằng phím ↓, chờ 10 giây mỗi bài

| | Trước | Sau |
|---|---|---|
| Video có thẻ `<video>` khi đứng ở bài N | N, N+1 | N−2 … N+2 |
| Bài N+2 khi lướt tới | Chưa tải gì, phải chờ | Đã tải sẵn 6 segment (~12 giây) |
| Request đầu mỗi video | `master.m3u8` → `360p/index.m3u8` → `360p/seg_000.ts` → mới lên 540p | Thẳng `540p/index.m3u8` → `540p/seg_000.ts` |
| Độ phân giải video tải sẵn | 360×640 | 540×960 (video dev chỉ có tới 540p; video có 720p sẽ lấy 720p) |
| Lướt tới video đã tải sẵn | — | Không tải lại playlist, phát tiếp từ bộ đệm |

## Cách kiểm lại
1. `pnpm --filter @tripflix/web exec vitest run src/features/social/reel-post.test.ts src/features/social/reel-hls.test.ts`
2. Mở `/inspiration?view=reels`, F12 → Network, lọc `m3u8|ts`: mỗi video bắt đầu bằng `<mức>p/index.m3u8` (không có `360p` trước), và có request của 2 video phía trước.

## Ảnh / video
- Không chụp ảnh; số đo ở bảng trên.

## Ảnh hưởng tới phần của người khác
- Có: `reel-hls.ts` do anh Phong viết (TF64). Anh Thành đã đồng ý sửa. Giữ nguyên hàm và tham số cũ, chỉ thêm tuỳ chọn (`sources`, `bufferSeconds`, `onBufferControl`).
- Phát hiện ngoài phạm vi (chưa sửa, báo anh Phong): hls.js gửi cookie bằng XHR bị CORS chặn ở cả CloudFront dev (`Access-Control-Allow-Origin: *`) lẫn `media.tripflix.io.vn` (đo từ `https://tripflix.io.vn`: `MissingAllowOriginHeader`, `WildcardOriginNotAllowed`). Chrome/Safari không bị vì tự phát HLS, nhưng Firefox máy tính hiện không phát được Reels.
