# TF25 — Giao diện Adaptive Split View và thanh Dock Instagram cho tab Cảm hứng trên Web

- Jira: [SCRUM-29](https://tripflix.atlassian.net/browse/SCRUM-29) · Nhánh: `thanh/TF25-giao-dien-feed-cam-hung` · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-10
- Phạm vi: Tái cấu trúc và nâng cấp toàn diện giao diện tab Cảm hứng trên Web với kiến trúc Adaptive Split View:
  1. **Thanh Dock điều hướng phong cách Instagram (`InstagramLeftDock`)**: Cố định sát mép trái (64px) hỗ trợ chuyển đổi giữa Bài viết (`posts`) và Reels (`reels`), bộ lọc nhanh (Tất cả, Có lộ trình, Đã lưu), bật/tắt cột lịch trình và mở nhanh modal đăng bài.
  2. **Điều phối chế độ xem thông qua URL (`InspirationView`)**: Đồng bộ trạng thái URL `?view=reels` hoặc `?view=posts`, giữ feed mounted để không mất vị trí cuộn trang.
  3. **Giao diện dòng thời gian bài viết (`SocialFeedView`)**: Bố cục 3 cột thích ứng (Lịch trình chuyến đi đính kèm bên trái - Feed bài viết ở giữa - Bảng chi tiết/bình luận ngữ cảnh bên phải).
  4. **Thẻ bài viết và hiển thị phương tiện thích ứng (`PostCard`, `AdaptivePostMedia`)**: Thẻ bài viết hiện đại với avatar tác giả, badge tích xanh xác minh, hiển thị tên thật (`authorName`), thư viện ảnh/video lưới thích ứng theo số lượng ảnh.
  5. **Nâng cấp Composer Modal**: Hỗ trợ chuyển đổi tab trực quan giữa "Bài viết" và "Reels (Video)", hỗ trợ kéo thả tải lên ảnh/video đa định dạng và đính kèm lộ trình chi tiết.

## Đã làm
- **`apps/web/src/features/social/feed/instagram-left-dock.tsx`**:
  - Dock icon 64px phong cách Instagram với tooltip nổi, nút chuyển đổi view Bài viết / Reels, bộ lọc feed, nút bật/tắt lộ trình và tạo bài viết.
- **`apps/web/src/features/social/feed/social-feed-view.tsx` & `social-feed.module.css`**:
  - Giao diện feed dạng 3 cột responsive: cột trái hiển thị thông tin lộ trình của bài viết đang chọn, cột giữa cuộn bài viết vô tận, cột phải hiển thị bình luận & tương tác.
  - Tối ưu thuật toán nhận diện bài viết active bằng đường đọc trọng tâm (Reading Focus Line ở 35% viewport) kết hợp `requestAnimationFrame`, đảm bảo đồng bộ chính xác tức thời sang cột Lịch trình và Bình luận.
- **`apps/web/src/features/social/feed/post-card.tsx` & `adaptive-post-media.tsx`**:
  - Component thẻ bài viết hỗ trợ thả tim, bình luận, lưu bài viết, chia sẻ, hiển thị badge tác giả và lưới ảnh thích ứng (1 ảnh lớn, 2 ảnh ngang, 3 ảnh dạng tạp chí, 4+ ảnh dạng mosaic kèm số lượng còn lại).
- **`apps/web/src/features/social/feed/contextual-panel.tsx` & `itinerary-sidebar-panel.tsx`**:
  - Tách các panel ngữ cảnh tương tác và lịch trình chuyến đi thành component độc lập, tái sử dụng giữa Feed và Reels.
- **`apps/web/src/features/social/inspiration-view.tsx`**:
  - Container điều phối chung giữa Feed bài viết và Reels Immersive Viewer.
- **`apps/web/src/features/discovery/home-screen.tsx`**:
  - Chuyển sang sử dụng `<InspirationView initialKeyword={query} />`.
- **`apps/web/src/features/social/live-posts.tsx` & `live-posts.module.css`**:
  - Tối ưu hóa các style layout, hỗ trợ modal tạo bài viết sáng sủa chuẩn Light Theme, cải thiện nhãn nút chọn loại bài viết (Bài viết / Reels).
- **`apps/web/src/features/social/post-detail.tsx`**:
  - Thay icon cảnh báo emoji bằng SVG icon chuẩn phong cách UI.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Thanh dock Instagram mép trái chuyển đổi mượt mà | Đạt | `InstagramLeftDock` và `InspirationView` tích hợp URL query `?view=` |
| Hiển thị feed bài viết kèm lộ trình và bình luận | Đạt | `SocialFeedView`, `PostCard`, `AdaptivePostMedia` |
| Tên thật tác giả và avatar hiển thị chuẩn xác | Đạt | Truyền `post.authorName` qua `formatAuthorDisplay` trong `PostCard` |
| Tuân thủ quy tắc kiến trúc ranh giới FE | Đạt | `node tools/check-boundaries.mjs` trả về: "Luật FE: không có vi phạm." |
| Typecheck & Lint sạch sẽ không có lỗi | Đạt | `pnpm --filter @tripflix/web typecheck` (0 errors), `turbo run lint` (0 errors) |
| Kiểm thử đơn vị pass 100% | Đạt | `pnpm test` (5/5 packages thành công) |

## Kết quả kiểm tra
- `node tools/check-boundaries.mjs`: Luật FE: không có vi phạm.
- `pnpm --filter @tripflix/web typecheck`: 0 lỗi, route types và typescript pass.
- `pnpm --filter @tripflix/web lint`: 0 lỗi.
- `pnpm test`: 5/5 package test suites passed.

## Cách kiểm lại
1. Chạy `pnpm --filter @tripflix/web dev`.
2. Mở trình duyệt tại `http://localhost:3100/`.
3. Nhấp vào tab "Cảm hứng" trên thanh điều hướng chính (`/inspiration`).
4. Trải nghiệm thanh Dock bên trái: chuyển đổi giữa Bài viết và Reels, lọc bài viết có lộ trình, mở modal tạo bài viết.
