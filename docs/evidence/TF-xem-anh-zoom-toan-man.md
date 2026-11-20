# Evidence: Zoom ảnh (1x–4x) & Phóng to khung xem ra hết tab

- **Task / Nhánh:** `thanh/TF-xem-anh-zoom-toan-man` (`Refs: TF-xem-anh-zoom-toan-man`)
- **Worktree:** `D:\HCMUT\vinAI\vsf\ota-tripflix\tripflix\wt-fe-zoom`

## 1. Thay đổi theo góp ý anh Thành (bỏ Fullscreen API -> phóng to khung xem ra hết tab)

- **Bỏ hẳn Browser Fullscreen API:** không dùng `requestFullscreen`, `exitFullscreen`, `document.fullscreenElement`, `document.fullscreenEnabled`, listener `fullscreenchange`, hay `:fullscreen` trong CSS.
- **Trạng thái `isExpanded` (`use-image-zoom.ts`, `image-zoom.ts`, `image-viewer-controls.tsx`):**
  - Thêm state `isExpanded`, nút `Phóng to khung xem` / `Thu nhỏ khung xem` (`vi.api.imageExpandViewer` / `vi.api.imageShrinkViewer` trong `packages/i18n/src/api.ts`) luôn hiển thị (không phụ thuộc trình duyệt), kèm `aria-pressed={isExpanded}` và icon 2 trạng thái.
  - Phím `F`/`f` bật/tắt `isExpanded`.
  - Khi `isExpanded === true`: `<dialog>` nhận `data-expanded="true"`, chiếm `100vw × 100dvh`, `margin: 0`, `border: 0`, `border-radius: 0`, `box-shadow: none`, ảnh co `object-fit: contain` vừa khung lớn; thanh công cụ header và cặp nút trước/sau vẫn giữ nguyên.
  - **Quyết định hiển thị dải thumbnail khi phóng to:** ẩn `.photoThumbnails` (khách sạn) và `.galleryThumbnails` (bài viết) khi `[data-expanded='true']` để vùng ảnh đạt chiều cao tối đa, trong khi vẫn giữ cặp nút `‹` / `›` chuyển ảnh.
  - **Esc khi đang phóng to:** lần nhấn `Esc` đầu tiên (`cancel` của `<dialog>`) qua `handleExpandedDialogCancel` chỉ thu khung về kích thước thường (`isExpanded = false`) và chặn đóng hộp thoại (`event.preventDefault()`); nhấn `Esc` lần 2 mới đóng hộp thoại. Khi đóng / mở lại hộp thoại luôn đặt `shrinkExpanded()` về kích thước thường.
  - **Re-clamp pan khi đổi kích thước khung:** gắn `ResizeObserver` vào stage trong `useImageZoom` để tự `clampPanOffset` lại mỗi khi `isExpanded` bật/tắt hoặc viewport thay đổi kích thước lúc đang zoom `1x–4x`.
- **Chạm code của Trang (`apps/web/src/features/hotels/hotel-gallery.tsx`, `hotel.module.css`):**
  - Chỉ cập nhật phần gắn `useImageZoom` / `ImageViewerControls` / `<dialog data-expanded>` và `onCancel`/`onClose` đã thêm ở commit trước cùng CSS `.photoDialog[data-expanded='true']` (thay cho `:fullscreen`), giữ nguyên 3 layout preview và dải thumbnail thường của Trang.
- **Grep kiểm chứng sạch Fullscreen API:** trong `apps/web/src/features/shared/*`, `apps/web/src/features/hotels/hotel-gallery*`, `hotel.module.css`, `apps/web/src/features/social/feed/gallery-lightbox.tsx`, `live-posts.module.css` không còn bất kỳ tham chiếu `requestFullscreen`, `exitFullscreen`, `fullscreenElement`, `fullscreenEnabled` hay `:fullscreen` (được kiểm tra tự động trong `hotel-gallery-zoom.test.tsx`).

## 2. Kết quả kiểm tra tự động

- `@tripflix/i18n` (`oxlint`, `tsc --noEmit`, `vitest run`):
  - `lint`: `0 warnings, 0 errors`
  - `typecheck`: pass (`0 errors`)
  - `vitest run`: `1 file passed, 2 tests passed`
- `@tripflix/web` (`oxlint`, `next typegen && tsc --noEmit`, `vitest run`):
  - `lint`: `28 warnings, 0 errors` (giữ đúng baseline 28)
  - `typecheck`: pass (`0 errors`, gồm cả các file test)
  - `vitest run`: `79 files passed, 531 tests passed` (gồm `image-zoom.test.ts` 8 tests, `use-image-zoom.test.ts` 1 test, `image-viewer-controls.test.tsx` 3 tests, `hotel-gallery-zoom.test.tsx` 5 tests, `gallery-lightbox.test.tsx` 6 tests)
