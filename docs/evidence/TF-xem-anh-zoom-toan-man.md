# Evidence: Zoom ảnh (1x–4x) & Toàn màn hình cho khung xem ảnh bài viết và khách sạn

- **Task / Nhánh:** `thanh/TF-xem-anh-zoom-toan-man` (`Refs: TF-xem-anh-zoom-toan-man`)
- **Worktree:** `D:\HCMUT\vinAI\vsf\ota-tripflix\tripflix\wt-fe-zoom`

## 1. Phạm vi triển khai & lưu ý chạm code của Trang

- **Module dùng chung (`apps/web/src/features/shared/`):**
  - `image-zoom.ts`: hàm thuần tính toán & giới hạn `scale` `[1, 4]` (`clampZoomScale`), `pan` theo kích thước stage (`clampPanOffset`), zoom quanh con trỏ (`zoomAroundPoint`), toggle double-click/double-tap 2x <-> 100% (`toggleDoubleTapZoom`), wheel zoom (`computeWheelZoomScale`), pinch 2 ngón (`computePinchZoomStep`), khóa chuyển slide khi `scale > 1` (`canNavigateSlides`), phím tắt `+`, `=`, `-`, `_`, `0`, `F` (`resolveZoomKeyboardAction`), và chặn `Esc` đóng `<dialog>` khi vừa thoát fullscreen (`shouldPreventDialogCancelOnEsc`).
  - `use-image-zoom.ts`: React hook gắn listener `wheel` (`passive: false`) trực tiếp vào stage, xử lý kéo chuột / chạm (`pointerdown`/`move`/`up`), pinch 2 ngón qua Pointer Events, double-click / double-tap, tự reset `100%` theo `scopeKey` (`isOpen ? slideKey : '__closed__'`), đồng bộ `document.fullscreenElement` + `document.fullscreenEnabled`, thoát fullscreen trước khi đóng dialog khi nhấn `Esc`, và thoát fullscreen nếu dialog đóng.
  - `image-viewer-controls.tsx` & `image-viewer-controls.module.css`: cụm nút `−` / `{percent}%` (`aria-live="polite"`, bấm để reset về `100%`) / `+` / nút toàn màn hình (`aria-pressed`, tự ẩn khi `canFullscreen === false` tức `!document.fullscreenEnabled`), cùng component `ImageZoomSurface` áp `transform: translate3d(x, y, 0) scale(s)`, `touch-action: none` khi zoomed, `will-change: transform` chỉ khi đang kéo/pinch, tắt transition dưới `@media (prefers-reduced-motion: reduce)`.
- **Khung xem ảnh bài viết (`apps/web/src/features/social/feed/gallery-lightbox.tsx`, `apps/web/src/features/social/live-posts.module.css`):**
  - Gắn `ImageViewerControls` vào `.galleryHeader` (cùng `.galleryHeaderActions`), bọc `<Image>` trong `ImageZoomSurface`, nâng `width={2000} height={1400} sizes="100vw"` chỉ khi `scale > 1` (chưa zoom giữ `1000×700`, không preload trước).
  - Thêm style `.galleryStageOverlay:fullscreen` tràn `100vw × 100dvh`, `onCancel` kiểm tra `zoom.shouldPreventEscCancel()` trước khi gọi `onClose()`.
  - Không đụng `live-posts.tsx` và `mention-picker.tsx`.
- **Khung xem ảnh khách sạn — code của Trang (`apps/web/src/features/hotels/hotel-gallery.tsx`, `apps/web/src/features/hotels/hotel.module.css`):**
  - **Lý do & phạm vi sửa code của Trang:** Thêm cùng hệ zoom + fullscreen vào `<dialog>` của `HotelGallery` (`photoHeader`, `photoStage`, `HotelPhoto` nhận `highRes?: boolean`) và chặn `navigateByKey` (`ArrowLeft`/`ArrowRight`) khi `!canSwitchSlideRef.current`. Giữ nguyên toàn bộ 3 layout preview grid/compact/carousel, bộ đếm ảnh, logic mở/đóng trigger và dải thumbnail bên dưới.
  - Trong `hotel.module.css`, cập nhật `.photoStage > img` -> `.photoStage img` (kể cả trong `@media (max-width: 640px)`) vì ảnh nằm trong `.zoomSurface` bên trong `.photoStage`, và bổ sung `.photoDialog:fullscreen`.
- **i18n (`packages/i18n/src/api.ts`):** Thêm khóa `imageZoomIn`, `imageZoomOut`, `imageZoomReset`, `imageZoomLevel`, `imageEnterFullscreen`, `imageExitFullscreen`.

## 2. Kết quả kiểm tra tự động

Lệnh đã chạy: `pnpm turbo run lint typecheck test --filter=./apps/web --filter=./packages/i18n` (trong `wt-fe-zoom`):
- `@tripflix/i18n`: `lint` `0 warnings, 0 errors`; `typecheck` pass; `test` `1 file, 2 tests passed`.
- `@tripflix/web`:
  - `lint` (`oxlint`): `28 warnings, 0 errors` (bằng baseline `28`, không phát sinh warning mới).
  - `typecheck` (`next typegen && tsc --noEmit`): pass (`0 errors`).
  - `test` (`vitest run`): `78 files passed, 529 tests passed` (bao gồm `image-zoom.test.ts` 7 tests, `image-viewer-controls.test.tsx` 3 tests, `hotel-gallery-zoom.test.tsx` 5 tests, `gallery-lightbox.test.tsx` 6 tests gốc giữ nguyên).

## 3. Kiểm tra runtime trên trình duyệt (CDP cổng 3160)

- Khởi chạy dev server cô lập `pnpm --filter @tripflix/web exec next dev --port 3160` và đo bằng headless Chrome qua CDP `Emulation.setDeviceMetricsOverride` (`1440×900` và `390×844`), không dùng `--window-size`; đã tắt dev server cổng 3160 sau khi đo xong.
- Khi mở `http://localhost:3160/hotels/P-osm-can-tho-050`, trình duyệt bị chặn gọi API `http://localhost:3000/api/hotels/P-osm-can-tho-050` với lỗi `net::ERR_FAILED` do backend chỉ mở CORS cho origin cổng `3100` (trang giữ trạng thái `"Đang tải thông tin khách sạn…"` và không render `<HotelGallery>`). Trang `/inspiration` cũng gặp `net::ERR_FAILED` với API feed trên cổng `3160`. Không can thiệp/vượt qua CORS.
- Ảnh chụp hiện trạng đã lưu tại `D:\HCMUT\vinAI\vsf\ota-tripflix\tripflix\.orchestrator\xem-anh-zoom\` (`hotel-desktop-1440-cors.png`, `hotel-mobile-390-cors.png`, `inspiration-desktop-1440.png`).
