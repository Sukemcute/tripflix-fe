# TF-anh-bia-reels-tim-kiem — Ảnh bìa video trong lưới kết quả tìm kiếm

- Nhánh: `thanh/TF-anh-bia-reels-tim-kiem` · Người làm: Thành (dùng AI: có) · Ngày: 2026-11-20

## Đã làm
- Lưới kết quả tìm kiếm (`search-results-grid.tsx`) lấy ảnh bìa từ `thumbnail` của discovery. Discovery chưa có thumbnail cho video nên thẻ Reel hiện khung trống.
- `socialPostToGridCard` (`search-author-items.ts`): Reel không có thumbnail thì dùng `post.video.posters.w360` (cùng nguồn poster trang cá nhân dùng), không có thì ảnh bìa lịch trình. Thumbnail rỗng (`''`) cũng được coi là không có.

## Kết quả kiểm tra
- `apps/web`: oxlint 0 lỗi (27 cảnh báo), `next typegen && tsc --noEmit` pass, vitest toàn bộ pass.
- Test mới trong `search-author-items.test.ts`: Reel không thumbnail → poster video; thumbnail rỗng → poster; có thumbnail → giữ thumbnail; không có video → không có ảnh bìa.

## Cách kiểm lại
1. Mở `/inspiration?q=<từ khoá có Reels>`, tab Reels hoặc Tất cả: thẻ video có ảnh poster như ở trang cá nhân.

## Ảnh hưởng tới phần của người khác
- Không.
