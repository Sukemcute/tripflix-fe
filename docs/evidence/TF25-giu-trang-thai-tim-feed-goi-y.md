# TF25 — Giữ trạng thái tim, lưu ở feed gợi ý và kết quả tìm bài

- Notion: TF25 · Nhánh: `thanh/TF25-giu-trang-thai-tim-feed-goi-y` · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-16

## Đã làm
- `explore-search.ts`: `searchPublicPosts` và `recommendPublicPosts` gắn `viewerContext` của chi tiết bài (nằm ngoài `post`) vào từng bài qua helper `withViewerContext`, giống cách `post-search-feed.ts` đã làm.
- Lý do: feed Bài viết dùng nguồn gợi ý (`social-feed-view.tsx`) và kết quả tìm bài (`live-posts.tsx`) đọc `post.viewerContext`. Mất field này thì sau F5 bài đã thả tim hiện tim trắng, bấm lại làm số nhảy 6 → 7 → 6. Lỗi lộ ra từ BE PR #188 (gợi ý không còn loại bài đã tương tác).

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Feed gợi ý giữ tim, lưu của người xem | Đạt | `recommend-public-posts.test.ts` › "gắn viewerContext … để F5 vẫn hiện tim đã thả" (fail trước, pass sau) |
| Kết quả tìm bài giữ tim, lưu của người xem | Đạt | `search-public-posts.test.ts` › "gắn viewerContext … để kết quả tìm hiện đúng tim đã thả" (fail trước, pass sau) |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected --continue`: 15/16 task thành công. `@tripflix/mobile#typecheck` fail sẵn trên máy local (file `.expo/types/router.d.ts` sinh tự động đã cũ), CI không bị.

## Cách kiểm lại
1. Đăng nhập web, thả tim một bài ở tab Bài viết, F5: tim vẫn đỏ, bấm lại thì bỏ tim và số giảm 1.

## Ảnh / video
- Không đính kèm.

## Ảnh hưởng tới phần của người khác
- Có: `packages/api-client/src/explore-search.ts` và 2 file test của Duy. Thành đồng ý sửa thay Duy trong phiên này; chỉ đổi cách lấy bài từ chi tiết, chữ ký hàm không đổi. Mobile không gọi hai hàm này.
