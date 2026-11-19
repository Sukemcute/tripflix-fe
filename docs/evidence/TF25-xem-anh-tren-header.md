# TF25 — Khung xem ảnh bài viết cố định kèm dải ảnh nhỏ như trang khách sạn (top layer)

- Nhánh: `thanh/TF25-xem-anh-tren-header` (từ `origin/develop`) · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-19

## Đã làm
1. **Khung kích thước cố định đồng bộ theo thiết kế trang khách sạn (`apps/web/src/features/social/live-posts.module.css`, `gallery-lightbox.tsx`):**
   - Tham khảo mẫu thiết kế từ `features/hotels/hotel-gallery.tsx` & `hotel.module.css` (chỉ đọc, không sửa file của khách sạn, không import chéo CSS module của `hotels`).
   - `.galleryStageOverlay`: hộp `<dialog>` top layer (`dialogRef.current.showModal()` / `close()` đồng bộ qua `syncGalleryDialogState`), kích thước cố định `width: min(60rem, calc(100% - 2 * var(--gallery-padding)))`, `height: min(44rem, calc(100dvh - 2 * var(--gallery-padding)))`, nền `--color-background`, viền `--color-border`, bo góc `18px`, bóng trung tính `--color-overlay`, `::backdrop` nền `--color-overlay`. Màn hẹp (`<= 640px`) co gọn theo `height: fit-content` và giới hạn chiều cao ảnh `calc(100dvh - 11rem)`.
   - Vùng ảnh `.galleryStage` kích thước cố định theo dòng giữa của lưới (`minmax(0, 1fr)`), nền `--color-surface`, bo góc `12px`, ảnh dùng `object-fit: contain` để mọi ảnh đều hiển thị trong cùng khung ổn định.
2. **Đầu khung & dải thumbnail (`gallery-lightbox.tsx`, `social-feed-view.tsx`):**
   - Đầu khung `.galleryHeader`: tiêu đề bài viết (cắt `ellipsis` khi dài) + bộ đếm `{safeIndex + 1} / {total}` + nút đóng (`vi.api.immersiveCloseGallery`).
   - Dải ảnh nhỏ `.galleryThumbnails` bên dưới ảnh lớn (hiện khi `images.length > 1`), cuộn ngang khi nhiều ảnh; ảnh đang xem đánh dấu `aria-current="true"` và viền `--color-coral-ink`, tự gọi `scrollIntoView({ block: 'nearest', inline: 'nearest' })` vào tầm nhìn khi chuyển ảnh; nút trước/sau và phím `ArrowLeft` / `ArrowRight` dùng `stepGalleryIndex` giới hạn `[0, total - 1]`.
3. **Top layer, bấm ra ngoài khung để đóng, khoá cuộn & trả focus (`gallery-lightbox.tsx`, `social-feed-view.tsx`):**
   - `shouldCloseGalleryBackdropClick`: bấm ra vùng nền tối (`event.target === dialog` trên `::backdrop`) thì đóng; bấm bên trong khung (ảnh, thumbnail, nút, khoảng trống trong `.galleryViewer`) giữ mở.
   - `Esc` đóng qua `onCancel` / `onClose`, khoá cuộn trang (`html` / `body` + `mainFeedColumn`), trả focus về thumbnail đã mở khi đóng.
   - Kiểm tra `apps/web/src/features/social/live-posts.tsx`: không dùng `.galleryStageOverlay` hay lightbox `<dialog>`.
4. **Unit tests (`apps/web/src/features/social/feed/gallery-lightbox.test.tsx`):**
   - Kiểm `clampGalleryIndex`, `stepGalleryIndex`, `shouldCloseGalleryBackdropClick`, `syncGalleryDialogState`, `renderToStaticMarkup` của `<GalleryLightbox>` (cấu trúc header, stage, `2 / 5`, dải 5 thumbnail có `aria-current="true"`), và kiểm CSS cố định `60rem`/`44rem`, viền `--color-coral-ink`, không import chéo `hotels`.

## Kết quả kiểm tra
- `pnpm --filter @tripflix/web lint`: **28 warnings, 0 errors** (bằng baseline).
- `pnpm --filter @tripflix/web typecheck`: **0 errors**.
- `pnpm --filter @tripflix/web test`: **51/51 files (376/376 tests) pass**, gồm `gallery-lightbox.test.tsx` (`6/6 pass`).
- Đo trên headless Chrome với CSS thật từ `live-posts.module.css` + `.ota-header { z-index: 40 }`:
  - Desktop `1440x900` (ảnh `300x200`, `2400x1200`, `1200x2400`): kích thước khung giữ cố định `962x706`, stage cố định `924x538`, dải 8 thumbnail cuộn ngang được, nằm trên `.ota-header`, bấm nền tối nhắm đúng `<dialog>`.
  - Mobile `375x667`: khung co gọn `353x637`, stage `327x491`, dải thumbnail cuộn ngang được.

## Cách kiểm lại
1. `pnpm --filter @tripflix/web lint && pnpm --filter @tripflix/web typecheck && pnpm --filter @tripflix/web test`

## Ảnh hưởng tới phần của người khác
- Chỉ sửa trong `apps/web/src/features/social/feed/gallery-lightbox.tsx`, `gallery-lightbox.test.tsx`, `social-feed-view.tsx`, và `.gallery*` trong `live-posts.module.css`. Không sửa file của `hotels`, không đụng `ComposerModal`.
