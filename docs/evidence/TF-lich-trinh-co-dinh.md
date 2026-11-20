# TF-lich-trinh-co-dinh — Tách trạng thái Lịch trình Bài viết/Reels và cố định cột Lịch trình Bài viết ở >=1200px

- Nhánh: `thanh/TF-lich-trinh-co-dinh` (base `origin/develop` @ `a3b8c6c`) · Người làm: Thành · Ngày: 2026-11-20

## Đã làm

- Thêm module thuần `apps/web/src/features/social/feed/itinerary-pin.ts` (dòng 1-34):
  - Khai báo `PINNED_ITINERARY_MIN_WIDTH = 1200`, `PINNED_ITINERARY_QUERY = '(min-width: 1200px)'`, `isItineraryPinned(viewportWidth, view)` và `resolveTabItineraryOpen(...)`.
  - Mốc 1200px dùng chung giữa hook JS (`useIsPinnedItineraryScreen`) và `@media (min-width: 1200px)` trong CSS.
- Cập nhật `apps/web/src/features/social/use-wide-screen.ts` (dòng 2, 7-32): thêm `useIsPinnedItineraryScreen()` dùng `useSyncExternalStore` với server snapshot `false` để tránh lệch hydration.
- Cập nhật `apps/web/src/features/social/inspiration-view.tsx` (dòng 28-29, 100-131, 267-268, 284-290, 326-327):
  - Tách state `itineraryChoice` dùng chung thành hai state độc lập `postsItineraryChoice` và `reelsItineraryChoice`.
  - Bài viết giữ mặc định mở từ `1024px`, luôn ghim ở `>= 1200px` (`isItineraryPinned={isPinnedScreen}`), đóng/mở bình thường ở `< 1200px`; Reels mặc định đóng và đóng/mở độc lập không ảnh hưởng tab Bài viết.
- Cập nhật `apps/web/src/features/social/feed/social-feed-view.tsx` (dòng 19, 49, 74, 89-101, 745-750):
  - Ghim cột trái khi `isItineraryPinned = true`, chặn `handleCloseItinerary`, gắn class `styles.splitViewPinnedLeft` và `data-itinerary-pinned="true"` lên `.splitViewContainer` (cột Bình luận bên phải giữ đóng/mở như cũ).
- Cập nhật `apps/web/src/features/social/feed/social-feed.module.css` (dòng 1033-1036, 2288-2293):
  - Ẩn `.itineraryCollapseBtn` qua `.splitViewPinnedLeft .itineraryCollapseBtn` và `@media (min-width: 1200px) { .splitViewContainer .itineraryCollapseBtn { display: none; } }` mà **không sửa `itinerary-sidebar-panel.tsx`** (chỉ áp dụng cho `.splitViewContainer` của Bài viết, không ảnh hưởng Reels).
  - Ở `>= 1200px` (base và `@media (max-width: 1439px)`), bỏ `.splitViewNoLeft` và `.splitViewCenterOnly`, chỉ giữ trạng thái mở hai cột và `.splitViewNoRight`; giữ đủ các trạng thái ở `@media (max-width: 1199px)` (`1024..1199px`) và bottom sheet `< 1024px`.
- Ghi nhận thực tế về dock (`instagram-left-dock.tsx`): từ commit `75cc86b`, dock trái chỉ còn 6 nút (`Tìm kiếm`, `Bài viết`, `Reels`, `Tạo bài viết mới`, `Đang theo dõi`, `Đã lưu`), không có nút Lịch trình trên dock, nên giữ nguyên dock và `instagram-left-dock.test.tsx`.
- Cập nhật `apps/web/src/features/social/feed/split-view-columns.test.ts` (dòng 26-49) theo quy tắc `>= 1200px` mới (không xoá test, vẫn kiểm đầy đủ `1200..1439px`, `1024..1199px`, `>= 1440px`), và thêm `apps/web/src/features/social/feed/itinerary-pin.test.ts` (6 tests).

## Đối chiếu "Xong khi"

| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Tách trạng thái Lịch trình giữa Bài viết và Reels | Đạt | `itinerary-pin.test.ts` (6 tests); CDP `tabIsolation` trên `1440x900` và `1199x800`: mở/đóng Lịch trình trên Reels không đổi Bài viết, đóng ở Bài viết `<1200px` không đổi Reels |
| Bài viết `>= 1200px` luôn hiện Lịch trình, ẩn nút đóng, chỉ còn mở cả hai hoặc đóng Bình luận | Đạt | CDP `1920x1080`, `1440x900`, `1280x720`: `data-itinerary-pinned="true"`, `collapseBtnVisible: false`, đóng Bình luận thì `rightPanel: null` và `leftPanel` vẫn giữ |
| Bài viết `< 1200px` (`1024..1199` và `390x844`) giữ nguyên hành vi đóng/mở & bottom sheet | Đạt | CDP `1199x800`, `1024x768` (`collapseBtnVisible: true`, bấm đóng thành `leftPanel: null`); `390x844` (`leftPanel: null`, `overflowX: false`) |
| Không sửa `itinerary-sidebar-panel.tsx`, tránh lệch hydration | Đạt | `git status` không chạm `itinerary-sidebar-panel.tsx`; `useIsPinnedItineraryScreen` trả `false` ở server snapshot |
| Lint, typecheck (`next typegen && tsc --noEmit`), test pass | Đạt | `pnpm turbo run lint typecheck test --filter=./apps/web --force` pass (`28` warnings sẵn có / `0` errors, `79` files / `531` tests pass) |

## Đo đạc CDP thực tế (`http://localhost:3190/inspiration`)

| Khổ màn / Tình huống | `data-itinerary-pinned` | Cột Lịch trình | Nút `<` thu Lịch trình | Cột Bình luận | `overflowX` |
|---|---|---|---|---|---|
| `1920x1080` (ban đầu / đóng Bình luận) | `"true"` | `340px` (luôn mở) | Ẩn (`false`) | `380px` → `null` | `false` |
| `1440x900` (ban đầu / đóng Bình luận) | `"true"` | `340px` (luôn mở) | Ẩn (`false`) | `380px` → `null` | `false` |
| `1280x720` (ban đầu / đóng Bình luận) | `"true"` | `268.8px` (luôn mở) | Ẩn (`false`) | `294.39px` → `null` | `false` |
| `1199x800` (ban đầu → bấm đóng trái) | `null` | `263.77px` → `null` | Hiện (`true`) | `287.75px` | `false` |
| `1024x768` (ban đầu → bấm đóng trái) | `null` | `225.27px` → `null` | Hiện (`true`) | `245.75px` | `false` |
| `1440x900` Reels (ban đầu → mở thẻ Lịch trình → đóng) | — | Đóng → `340px` → Đóng | Hiện (`true`) khi mở | `380px` | `false` |
| `1440x900` quay lại Bài viết sau Reels | `"true"` | `340px` (vẫn mở) | Ẩn (`false`) | `380px` | `false` |
| `1199x800` đóng Bài viết → sang Reels → về Bài viết | `null` | `null` → Reels đóng → `null` | Hiện khi mở | `287.75px` | `false` |
| `390x844` mobile | `null` | `null` (đóng sẵn) | `false` | `null` | `false` |

## Kết quả kiểm tra

- Lệnh: `pnpm turbo run lint typecheck test --filter=./apps/web --force`
  - `lint`: pass (`28` warnings sẵn có của repo, `0` errors)
  - `typecheck`: pass (`next typegen && tsc --noEmit`, `0` errors)
  - `test`: pass (`79` test files, `531` tests pass, gồm `itinerary-pin.test.ts` (6), `split-view-columns.test.ts` (4), `instagram-left-dock.test.tsx` (2))

## Cách kiểm lại

1. Chạy `pnpm turbo run lint typecheck test --filter=./apps/web` trong worktree.
2. Mở `/inspiration` ở các mốc `1440x900`, `1280x720`, `1199x800`, `1024x768`, `390x844`, và chuyển qua lại `Bài viết` ↔ `Reels` để kiểm tra cột Lịch trình và Bình luận.

## Ảnh kiểm chứng (lưu ngoài repo tại `.orchestrator/lich-trinh-co-dinh/`)

- `1920x1080-1-initial.png`
- `1440x900-1-initial.png`, `1440x900-2-right-closed.png`, `1440x900-reels-open.png`, `1440x900-reels.png`
- `1280x720-1-initial.png`
- `1199x800-1-initial.png`, `1199x800-2-left-closed.png`
- `1024x768-1-initial.png`, `1024x768-2-left-closed.png`
- `390x844-mobile.png`

## Ảnh hưởng tới phần của người khác & việc cần nối với `thanh/TF-lich-trinh-trong`

- Không sửa `itinerary-sidebar-panel.tsx` (đang do nhánh `thanh/TF-lich-trinh-trong` làm).
- Lưu ý khi merge với `thanh/TF-lich-trinh-trong`:
  1. Giữ nguyên class `styles.itineraryCollapseBtn` trên nút thu gọn trong `itinerary-sidebar-panel.tsx` để rule CSS `.splitViewPinnedLeft .itineraryCollapseBtn` / `@media (min-width: 1200px)` tiếp tục ẩn nút đúng trên Bài viết `>= 1200px`.
  2. Tuỳ chọn sau khi hai nhánh vào `develop`: nếu muốn bỏ hẳn `<button>` khỏi DOM khi ghim, có thể thêm prop `isPinned?: boolean` (tương ứng `onClose?: () => void`) trong `ItinerarySidebarPanelProps` và truyền `isPinned={isLeftPinned}` từ `SocialFeedView`.
