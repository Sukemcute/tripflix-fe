# TF25 — Reels web: giữ video 2 bài phía sau

- Notion: TF25 · Nhánh: `thanh/TF25-reels-giu-2-bai-phia-sau` · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-19

## Đã làm
- `reel-post.ts`: `REEL_BEHIND_VIDEO_COUNT` đổi từ 1 lên 2. Cửa sổ video giờ là N-2..N+2 (tối đa 5 thẻ `<video>`); N-3 và N+3 chỉ còn poster, xa hơn là khung giữ chỗ (`REEL_RENDER_WINDOW` = 3, không đổi). Lướt ngược 2 bài vẫn còn bộ đệm, không phải tải lại.
- Số bài được gắn nguồn mới không tăng. `shouldLoadReelSource` dùng hằng nội bộ `REEL_BEHIND_LOAD_COUNT = 1`: N và N+1 tải ngay; N+2 và N-1 tải khi video đang xem đã chạy; N-2 chỉ giữ nguồn đã gắn từ lúc còn là bài đang xem. Nhảy xa (ví dụ mở từ tìm kiếm) thì N-2 không tải mới, nên vẫn không quá 4 video tải cùng lúc (comment cũ: 5 video cùng tải làm video đang xem chậm).
- `getReelBufferSeconds` không đổi: mọi bài phía sau, kể cả N-2, dùng `REEL_BEHIND_BUFFER_SECONDS` (4 giây).
- `pruneReadyReelIds` (#300) dùng `getReelRenderMode` nên tự theo cửa sổ mới: N-2 còn nguồn thì vẫn được coi là có hình.
- Sửa comment mô tả cửa sổ ở đầu khối `ReelRenderMode`, `shouldLoadReelSource` và prop `hasVideo` (`live-posts.tsx`).

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| N-2 có thẻ video, N-3 là poster | Có | `reel-post.test.ts` › getReelRenderMode › bài đang xem, 2 bài phía trước và 2 bài phía sau có video; bài thứ 3 phía sau và phía trước chỉ còn poster |
| Tối đa 5 thẻ video khi lướt 100 bài | Có | `reel-post.test.ts` › lướt 100 bài thì số thẻ video luôn tối đa 5 |
| N-2 dùng bộ đệm phía sau | Có | `reel-post.test.ts` › getReelBufferSeconds (N-2 = `REEL_BEHIND_BUFFER_SECONDS`) |
| Không tăng số video tải mới | Có | `reel-post.test.ts` › bài thứ 2 phía sau có thẻ video nhưng không được gắn nguồn mới (tối đa 4 bài tải) |

## Kết quả kiểm tra
Chạy trong `apps/web`: lint 0 lỗi / 28 warning (không đổi), `next typegen && tsc --noEmit` pass, Vitest 49 file / 361 test pass.

## Cách kiểm lại
1. `pnpm --filter @tripflix/web test -- reel-post`.
2. Chạy tay: mở Reels, xem bài 1 tới khi chạy, lướt xuống tới bài 4, rồi lướt lên 2 bài về bài 2. Mong đợi: bài 2 phát ngay, Network không tải lại segment đầu của bài 2.

## Ảnh / video
- Không đổi giao diện. Chưa kiểm tay trên trình duyệt trong phiên này.

## Ảnh hưởng tới phần của người khác
- Không. Chỉ sửa `reel-post.ts`, `reel-post.test.ts` và comment trong `live-posts.tsx` (web, chủ Thành).
