# Evidence: TF-lich-trinh-trong — Trạng thái trống gọn & có ích cho cột Lịch trình

- **Worktree:** `D:\HCMUT\vinAI\vsf\ota-tripflix\tripflix\wt-fe-empty`
- **Nhánh:** `thanh/TF-lich-trinh-trong` (từ `origin/develop`)

## 1. Phạm vi thay đổi (chỉ đúng các file được phép)

- `packages/i18n/src/api.ts:882–887`:
  - `immersiveEstimatedCostNote`: `'Chi phí ước tính trung bình cho 1 người, bao gồm lưu trú và các điểm vui chơi gợi ý.'`
  - `itineraryNoTripTitle`: `'Bài này chưa gắn lịch trình'`
  - `itineraryNoTripDesc`: `'Chia sẻ ảnh và cảm nhận chuyến đi.'`
  - `itineraryBrowseTripPosts`: `'Xem các bài có lịch trình'`
  - `itinerarySuggestedHeading`: `'Lịch trình liên quan'`
  - `itinerarySuggestedAction`: `'Xem lịch trình này'`
- `apps/web/src/features/social/feed/itinerary-sidebar-panel.tsx`:
  - Chuyển ghi chú chi phí ước tính (`~dòng 186`) và toàn bộ chữ ở khối trống (`~dòng 199–238`) sang `@tripflix/i18n` (`vi.api.*`).
  - Thêm prop tuỳ chọn `onBrowseTripPosts?: () => void`: có prop thì hiện nút `.itineraryNoTripBrowseBtn` (`Xem các bài có lịch trình`); không có prop thì không render nút (giữ nguyên cho Reels và các nơi gọi khác).
  - Giữ nguyên giao diện khi bài có `trip` và giữ ô `Lịch trình liên quan` khi có `suggestedTripPost`.
- `apps/web/src/features/social/feed/social-feed.module.css` (chỉ các class `.itineraryNoTrip*`, `.itinerarySuggested*` từ dòng 893–1014):
  - Thu gọn khối trống: `.itineraryNoTripIcon` từ `52px` (`size={28}`) xuống `38px` (`size={18}`), canh dọc gọn phía trên bằng `padding: clamp(20px, 6dvh, 48px) 16px 20px; justify-content: flex-start;` để không bị khoảng trống lớn phía trên.
  - Thay các màu hex cứng (`#141B3D`, `#64748B`, `#94A3B8`, `#E2E8F0`, `#F1F5F9`, `#FFFFFF`, `#FFFBF8`) sang tokens (`--color-navy`, `--color-text-muted`, `--color-border`, `--color-background`, `--color-surface`, `--color-warm-mist`, `--color-coral`, `--color-coral-ink`), bổ sung `.itineraryNoTripBrowseBtn` theo kiểu nút phụ và `@media (prefers-reduced-motion: reduce)`.
- Tests mới:
  - `apps/web/src/features/social/feed/itinerary-sidebar-panel.test.tsx` (5 tests)
  - `apps/web/src/features/social/feed/itinerary-sidebar-panel-actions.test.tsx` (1 test kiểm tra callback `onBrowseTripPosts` và `onSelectSuggestedTrip`)

## 2. Kết quả kiểm tra tự động & giao diện thực tế

- `pnpm turbo run lint typecheck test --filter=./apps/web --filter=./packages/i18n --force`:
  - `@tripflix/i18n`: `lint` `0 warnings, 0 errors`; `typecheck` pass; `vitest run` `1 file passed, 2 tests passed`.
  - `@tripflix/web`: `lint` `28 warnings, 0 errors` (giữ đúng baseline 28); `typecheck` (`next typegen && tsc --noEmit`) pass `0 errors`; `vitest run` `80 files passed (80), 531 tests passed (531)`.
- CDP emulation `1440×900` trên dev server riêng cổng `3195` (`/inspiration`, đã tắt dev server khi xong):
  - Sidebar `Lịch trình chuyến đi` hiển thị đúng trạng thái trống mới: tiêu đề `Bài này chưa gắn lịch trình` (`height: 21px`), mô tả `Chia sẻ ảnh và cảm nhận chuyến đi.` đúng 1 dòng (`width: 207.42px`, `height: 17.39px` / `lineHeight: 17.4px`), không bị khoảng trống lớn phía trên (dù feed giữa không tải thêm bài do CORS từ cổng 3195 tới API cổng 3000).
  - Ảnh chụp: `D:\HCMUT\vinAI\vsf\ota-tripflix\tripflix\.orchestrator\lich-trinh-trong\inspiration-desktop-1440.png`.
