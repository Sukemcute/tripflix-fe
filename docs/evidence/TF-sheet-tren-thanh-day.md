# TF-sheet-tren-thanh-day — Bottom sheet Lịch trình/Bình luận không bị thanh điều hướng đáy che

- Nhánh: `thanh/TF-sheet-tren-thanh-day` · Người làm: Thành (dùng AI: có) · Ngày: 2026-11-20

## Đã làm
- Trên điện thoại (<768px), sheet Bình luận và Lịch trình (tab Bài viết và Reels) neo sát đáy màn hình nên thanh điều hướng đáy (Trang chủ · Đặt chỗ · ⊕ · Cảm hứng · Tôi) đè lên ô nhập bình luận, không bấm vào soạn được (anh Thành báo trên Chrome Android thật và DevTools iPhone 16).
- Các sheet nay đặt đáy ở `var(--mobile-tab-bar-space, 0px)`: nằm ngay trên thanh đáy; từ 768px biến không có nên vẫn bằng 0.
  - `social-feed.module.css`: `.itineraryInFeed`, `.rightPanelInFeed`.
  - `live-posts.module.css`: `.itineraryInReels`, `.leftPanel`, `.rightPanel`.

## Kết quả kiểm tra
- `apps/web`: oxlint 0 lỗi (27 cảnh báo), `next typegen && tsc --noEmit` pass, vitest pass (thêm `bottom-sheet-above-tab-bar.test.ts`).

## Cách kiểm lại
1. Điện thoại (hoặc DevTools 393×852), `/inspiration`, mở Bình luận của một bài: ô nhập nằm trên thanh đáy, bấm vào soạn được. Làm tương tự ở Reels và với Lịch trình.

## Ảnh hưởng tới phần của người khác
- Không.
