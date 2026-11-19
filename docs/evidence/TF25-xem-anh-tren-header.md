# TF25 — Khung xem ảnh nằm trên header, giới hạn cỡ vừa phải và đóng khi bấm ra ngoài ảnh

- Nhánh: `thanh/TF25-xem-anh-tren-header` (từ `origin/develop`) · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-19

## Đã làm
1. **Top layer qua `<dialog>.showModal()` (`apps/web/src/features/social/feed/gallery-lightbox.tsx`, `social-feed-view.tsx`, `live-posts.module.css`):**
   - Tách `<GalleryLightbox>` dùng `dialogRef.current.showModal()` / `close()` đồng bộ qua `syncGalleryDialogState` theo `galleryState`; xử lý `onCancel` / `onClose` (kể cả `Esc`) để đóng gọn và tránh rò `Escape` ra drawer nền.
   - Bỏ thuộc tính `open` và inline `position: 'fixed', zIndex: 9999, ...` trong `social-feed-view.tsx`; nền tối chuyển sang `::backdrop` của top layer trong `live-posts.module.css`, thêm `:not([open]) { display: none; }` để tránh lộ khung khi đóng.
   - Kiểm tra Reels (`apps/web/src/features/social/live-posts.tsx`): `live-posts.tsx` chỉ còn comment cũ ở dòng 1778, không có `<dialog>` lightbox hay dùng `.galleryStageOverlay`.
2. **Kích thước vừa phải + nút quanh ảnh không đè ảnh (`apps/web/src/features/social/live-posts.module.css`, `gallery-lightbox.tsx`):**
   - Đặt biến CSS trên `.galleryStageOverlay`: `--gallery-max-width: 960px`, `--gallery-max-height: 80vh`, `--gallery-mobile-max-width: 92vw`, `--gallery-control-gap: 12px`.
   - Đổi `<Image>` khỏi `fill` sang `width={0} height={0}` + CSS `width: auto; height: auto; object-fit: contain` (không phóng to ảnh nhỏ quá kích thước gốc); căn giữa màn hình.
   - Bố cục CSS Grid `.galleryFrame`: thanh bộ đếm + nút đóng đặt ở hàng trên ảnh; desktop đặt nút trước/sau ở hai bên ảnh, màn hẹp (`< 768px`) xếp nút trước/sau bên dưới ảnh, không đè lên ảnh.
3. **Bấm ra ngoài ảnh thì đóng + khoá cuộn + trả focus (`gallery-lightbox.tsx`, `social-feed-view.tsx`):**
   - `shouldCloseGalleryFromClick` + `getContainImageRect` / `isPointInsideContainImage`: bấm vào nền dialog hoặc viền trống (kể cả viền letterbox/pillarbox của `object-fit: contain`) thì đóng; bấm vào ảnh thật, bộ đếm hoặc nút trước/sau thì giữ mở.
   - Khoá `document.documentElement.style.overflow` & `document.body.style.overflow` và cột `mainFeedColumn` khi mở, khôi phục khi đóng; lưu `document.activeElement` trước `showModal()` và gọi `.focus({ preventScroll: true })` trả lại thumbnail khi đóng.
4. **Unit tests (`apps/web/src/features/social/feed/gallery-lightbox.test.tsx`):**
   - Kiểm `getContainImageRect`, `isPointInsideContainImage`, `shouldCloseGalleryFromClick`, `syncGalleryDialogState`, `renderToStaticMarkup` của `<GalleryLightbox>`, và kiểm CSS top layer + hằng số `960px` / `80vh` / `92vw`.

## Kết quả kiểm tra
- `pnpm --filter @tripflix/web lint`: **28 warnings, 0 errors** (bằng baseline).
- `pnpm --filter @tripflix/web typecheck`: **0 errors**.
- `pnpm --filter @tripflix/web test`: **51/51 files (377/377 tests) pass**, gồm `gallery-lightbox.test.tsx` (`7/7 pass`).
- Kiểm tra trên headless Chrome với CSS thật từ `live-posts.module.css` + `.ota-header { z-index: 40 }`:
  - Top layer nằm trên `.ota-header` (`topHitAboveHeader: true`), không nút nào đè lên ảnh (`overlapAny: false`).
  - Ảnh nhỏ `300x200` giữ nguyên `300x200`; ảnh ngang `2400x1200` (desktop `1440x900`) thu còn `960x480`; ảnh dọc `1200x2400` thu còn `360x720` (`80vh`); màn hẹp `375x667` ảnh `2400x1200` thu còn `345x173` (`92vw`).

## Cách kiểm lại
1. `pnpm --filter @tripflix/web lint && pnpm --filter @tripflix/web typecheck && pnpm --filter @tripflix/web test`

## Ảnh hưởng tới phần của người khác
- Chỉ sửa vùng khung xem ảnh phóng to ở `apps/web/src/features/social/feed/social-feed-view.tsx`, `gallery-lightbox.tsx`, và `.gallery*` trong `live-posts.module.css`. Không đụng pop-up đăng bài (`ComposerModal`).
