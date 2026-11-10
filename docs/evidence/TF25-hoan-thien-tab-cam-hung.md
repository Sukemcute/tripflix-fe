# TF25 — Hoàn thiện tab Cảm hứng và nâng cấp form đăng bài trên Web

- Jira/Task: TF25 · Nhánh: `thanh/TF25-social-travel-feed-va-theme-toggle` · Người làm: Thành (dùng AI: có) · Ngày: 2026-11-09

## Đã làm
- **Media Track cuộn dọc chuẩn TikTok**:
  - Chuyển cơ chế hiển thị trong Immersive Viewer sang Media Track với CSS `scroll-snap-type: y mandatory`, `scroll-snap-align: start`.
  - Giữ cố định khung tỷ lệ 9:16 ở trung tâm màn hình, cuộn mượt mà tự nhiên không bị giật lag.
  - Tách `MediaTrackItem` độc lập giúp quản lý trạng thái phát video, hiển thị ảnh và lộ trình trực quan.
- **Xử lý điều hướng con lăn chuột vật lý & Touchpad**:
  - Thêm logic `isPhysicalMouseWheel` phân biệt con lăn chuột vật lý (nhảy từng bài dứt khoát) và bàn di cảm ứng touchpad (lướt mượt mà liên tục).
  - Tự động đồng bộ bài active với Left Panel (lịch trình) và Right Panel (bình luận & chi tiết bài viết).
- **Nâng cấp form đăng bài (Composer Modal)**:
  - Hỗ trợ tải lên video, ảnh hoặc bài viết thuần chữ.
  - Cho phép đính kèm lộ trình chuyến đi theo từng ngày.
  - Hỗ trợ tách 2 luồng: Lưu bản nháp (draft) và Xuất bản (publish).
- **Tách OtaFooter**:
  - Tách `OtaFooter` thành component riêng, tự động ẩn ở chế độ xem toàn màn hình (immersive feed).

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Lướt xem bài viết cuộn dọc snap chuẩn TikTok | Có | Component `InspirationImmersiveViewer` và `MediaTrackItem` trong `live-posts.tsx` |
| Hỗ trợ tải video, đính kèm lộ trình và lưu nháp | Có | Component `ComposerModal` trong `live-posts.tsx` |
| Typecheck & Test pass 100% | Có | `pnpm --filter @tripflix/web typecheck` và `turbo run test` pass sạch |

## Kết quả kiểm tra
- `pnpm --filter @tripflix/web typecheck`: 0 lỗi.
- `pnpm --filter @tripflix/web lint`: 0 lỗi.
- `pnpm test`: 5/5 package test suites pass (46 tests app-core, 82 tests api-client,...).

## Cách kiểm lại
1. Chạy `pnpm --filter @tripflix/web dev`.
2. Mở trình duyệt tại `http://localhost:3100/`.
3. Bấm vào tab "Cảm hứng" trên thanh điều hướng để trải nghiệm cuộn dọc video, xem lịch trình, và mở modal tạo bài viết.

## Ảnh hưởng tới phần của người khác
- Không làm ảnh hưởng hay phá vỡ các component khác.
