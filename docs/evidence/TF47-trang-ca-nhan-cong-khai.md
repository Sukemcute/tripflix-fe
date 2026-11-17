# TF47 — Trang cá nhân công khai

- Notion: (chưa có) · Nhánh: `dung/TF47-trang-ca-nhan-cong-khai` · Người làm: Dũng (dùng AI: có) · Ngày: 2026-11-16
- Phụ thuộc BE: `GET /v1/users/:userId/profile` (nhánh `dung/TF47-trang-ca-nhan-cong-khai` bên `tripflix-be`).

## Đã làm
- Bấm vào tên tác giả hoặc người bình luận thì mở trang cá nhân của họ, giống TikTok: chữ cái đầu làm avatar
  (hệ thống chưa có ảnh đại diện), số đang theo dõi, người theo dõi, tổng lượt thích, nút Theo dõi/Bỏ theo dõi
  (ẩn khi xem trang của mình), hai tab Video và Bài viết dạng lưới, bấm vào thì mở bài.
- `packages/api-client`: sinh lại client cho endpoint mới; thêm `usePublicProfile`, `useAuthorReels`
  (`/v1/feed?author_id=`, có ảnh bìa video), `useAuthorVlogs` (`/v1/posts?author_id=&post_type=vlog`).
  Theo dõi/bỏ theo dõi xong thì làm mới số người theo dõi trên trang cá nhân.
- `packages/app-core`: `formatProfileCount` (1.2K, 3.4M) và `getNameInitials`, có test.
- `packages/i18n`: chữ của trang trong `api.profile*`.
- Mobile: route `/user/[id]` (`features/account/public-profile-screen.tsx`); bấm tên ở Reels, chi tiết bài và
  bình luận thì mở trang. Video mở trong Reels, bài viết mở `/trip/[id]`.
- Web: route `/u/[id]` (`features/social/public-profile.tsx`, dùng lại style lưới của kết quả tìm kiếm); tên ở
  Reels, chi tiết bài, bình luận và khung bình luận Reels thành link. Video mở `/inspiration?open=<id>&kind=reel`,
  bài viết mở `/trips/<id>`.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Mobile: bấm user mở trang của họ | Chờ BE lên staging | Chưa có ảnh Android |
| Web: bấm user mở trang của họ | Chờ BE lên staging | Chưa có ảnh |
| Hiện số follow, tổng like, lưới bài, nút Theo dõi | Chờ BE lên staging | |
| Định dạng số và chữ cái đầu đúng | Có | `public-profile.test.ts` |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`: 21/21 task pass, lint 0 lỗi, không có cảnh báo ở file của TF47.
- `app-core`: `public-profile.test.ts` 2 test pass.

## Cách kiểm lại
1. BE chạy nhánh TF47 (hoặc staging đã deploy).
2. Mobile: chạy Expo từ thư mục `.wt-fe-TF47`, mở Reels hoặc một bài, bấm tên tác giả.
3. Web: `pnpm --filter @tripflix/web dev`, mở `/inspiration`, bấm tên tác giả, hoặc mở thẳng `/u/<id>`.

## Ảnh / video
- Chưa có: `https://api.tripflix.io.vn` chưa có endpoint mới. Chụp sau khi BE deploy.

## Ảnh hưởng tới phần của người khác
- `apps/mobile` (Trang): thêm route `user/[id]` và một `Stack.Screen` trong `_layout.tsx`; tên tác giả ở
  `reel-social-overlay.tsx`, `live-post-detail-screen.tsx`, `live-comments.tsx` bấm được.
- `apps/web` (Thành): thêm route `u/[id]`, class `.profile-link` trong `globals.css`; tên ở `live-posts.tsx`,
  `post-detail.tsx`, `live-comments.tsx` thành link.
- Cần báo Trang và Thành trước khi merge.
