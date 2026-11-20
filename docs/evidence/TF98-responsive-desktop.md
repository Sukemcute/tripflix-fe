# TF98 — Web responsive laptop/tablet (PR 3)

- Notion: (chưa có link) · Nhánh: `thanh/TF98-web-responsive-desktop` · Người làm: Thành (dùng AI: có) · Ngày: 2026-11-20
- **Phụ thuộc PR 2** (`thanh/TF98-web-mobile-tab-bar`, vốn phụ thuộc PR 1): merge PR 1 → PR 2 → PR 3.

## Đã làm
- **Cột Bài viết co theo màn laptop** (`apps/web/src/features/social/feed/social-feed.module.css`, mốc `max-width: 1439px` và `1199px`): hai cột bên (Lịch trình, Bình luận) đổi từ số cứng sang `clamp(…vw…)`. Trước: ở 1024px tab Bài viết mở sẵn cả hai cột nên cột bảng tin giữa chỉ còn 278px. Dùng `clamp()` thay `minmax()` để `grid-template-columns` vẫn chuyển mượt khi mở/đóng cột. Ở 1439px cho đúng giá trị cũ; từ 1440px không đổi.
- **Khung Reels cao theo ô lưới** (`apps/web/src/features/social/live-posts.module.css`): `.viewerGrid` chốt một hàng `grid-template-rows: minmax(0, 1fr)`; `.mediaStageFrame` dùng `max-height: 100%` thay số cứng `calc(100dvh - 116px)` (chỉ đúng với header một hàng, trong khi header hai hàng ở 1024–1359px). Không đổi scroll-snap, không thêm listener: cảm giác vuốt giữ nguyên.

## Bảng lỗi theo khổ màn hình
| # | Khổ | Lỗi | Nguyên nhân | Mức | Trạng thái |
|---|---|---|---|---|---|
| 1 | 1024–~1150px | Tab Bài viết: cột bảng tin giữa 278px (1024) khi mở sẵn Lịch trình + Bình luận | `social-feed.module.css` mốc 1199px cột cố định `270px … 290px` | Cao | Đã sửa (PR này) |
| 2 | 1200–1439px | Cột giữa hẹp hơn cần (366px ở 1200px) | mốc 1439px cột cố định `300px … 330px` | Trung bình | Đã sửa |
| 3 | 1280×720 (báo cáo) | Khung Reels cao hơn khung trang ~6px | Nghi `.mediaStageFrame { max-height: calc(100dvh - 116px) }` + hàng lưới `auto` | Trung bình | Sửa phòng ngừa; **chưa tái hiện được** (xem dưới) |
| 4 | 1024–1359px | Header 2 hàng cao 127px (ở 1280×720 header + lề chiếm 151/720px = 21% màn) | `app/globals.css` `@media (max-width: 1359px)` (khối header 2 hàng) | Trung bình | **Không sửa** — phần của Trang, có đề xuất |
| 6 | 1024px | Tiêu đề cột Lịch trình xuống 2 dòng khi cột còn 225px | hệ quả của #1 | Thấp | Chấp nhận; có thể cho tiêu đề `white-space: nowrap` + `text-overflow: ellipsis` sau |
| 5 | ≥ 1440px | Cột giữa hẹp lại khi qua mốc (586px ở 1439 → 489px ở 1440) vì cột bên nhảy lên 340/380px | cột cố định ở rule gốc `.splitViewContainer` | Thấp | Không sửa (brief: giữ ≥1440); đề xuất cho anh Thành |

Không khổ nào có cuộn ngang, cuộn dọc ngoài ý ở Cảm hứng, hay phần tử vượt mép phải (117 lượt đo trước và sau).

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/web`: lint 0 lỗi / 28 cảnh báo (bằng mốc), typecheck pass, **68 file / 495 test pass**. Test mới: `feed/split-view-columns.test.ts`, `reel-stage-height.test.ts`.
- Đo bằng Chrome headless + CDP `Emulation.setDeviceMetricsOverride` (`mobile: false` desktop, `mobile: true` tablet), dev server cổng 3110, chưa đăng nhập. Khổ: 1024×768, 1280×720, 1280×800, 1366×768, 1440×900, 1536×864, 1920×1080, tablet 768×1024, 1024×768, 820×1180, 1180×820, 1280×720 @1.25 và @1.5. Trang: `/`, `/search`, `/flights`, `/hotels/<id>`, `/inspiration`, `/inspiration?view=reels`, `/trip-plans/<id>`, `/u/<id>`, `/account`.
- Độ rộng cột tab Bài viết (trái / giữa / phải, px), đo thật:

  | Khổ | Trước | Sau |
  |---|---|---|
  | 1024 | 270 / 278 / 290 | 225 / **367** / 246 |
  | 1100 | 270 / 348 / 290 | 242 / **402** / 264 |
  | 1199 | 270 / 439 / 290 | 264 / **448** / 288 |
  | 1200 | 300 / 366 / 330 | 252 / **468** / 276 |
  | 1280 | 300 / 440 / 330 | 269 / **506** / 294 |
  | 1366 | 300 / 519 / 330 | 287 / **548** / 314 |
  | 1439 | 300 / 586 / 330 | 300 / 586 / 330 (không đổi) |
  | 1440 | 340 / 489 / 380 | 340 / 489 / 380 (không đổi) |

  (Cột "Trước" tính từ CSS cũ và bề ngang khung đo được; cột "Sau" đo bằng CDP.)
- Khung Reels (mô hình: chèn tạm một khung video giả có nội dung cao 2000px vào cột giữa trong trình duyệt đo): sau sửa khung video bằng đúng ô lưới và lưới không vượt khung trang ở 1024×768, 1280×720, 1280×800, 1366×768, 1440×900, 1536×864, 1920×1080, 1280×720 @1.5 và 390×844 (ví dụ 1280×720: khung trang 151–720, lưới 151–720, khung video 163–708).
- Đo lại đủ 117 lượt sau sửa: 117/117 không cuộn ngang, không cuộn dọc ngoài ý ở Cảm hứng, không phần tử vượt mép phải. Khung trang Cảm hứng, lưới Reels, dock, header giống hệt trước sửa ở mọi khổ.
- Điện thoại (390/320/768, PR 2): khung Cảm hứng/Reels, dock ngang, thanh đáy giống hệt trước PR 3.
- Ghi nhận nhỏ: ở 1024px cột Lịch trình 225px nên tiêu đề "Lịch trình chuyến đi" xuống 2 dòng.

## Hạn chế khi đo
- API công khai chỉ cho CORS từ `https://tripflix.io.vn`, nên trên localhost Bài viết/Reels không có bài; giả lập phản hồi API bị từ chối quyền nên không dùng. Lỗi #3 cần khung video thật nên **chưa tái hiện được**; bản sửa là phòng ngừa, cần anh Thành kiểm ở 1280×720 với dữ liệu thật (so `viewerGrid` và `feedPageWrapper` trong DevTools).

## Cách kiểm lại
1. `pnpm --filter @tripflix/web dev`, DevTools chế độ thiết bị (hoặc cửa sổ) 1024×768 và 1280×720.
2. `/inspiration` (Bài viết, có bài): cột bảng tin giữa ≥ 360px khi mở cả Lịch trình và Bình luận; mở/đóng cột vẫn trượt mượt.
3. `/inspiration?view=reels` ở 1280×720: khung video không vượt đáy trang, không có cuộn dọc; vuốt/cuộn chuyển Reel như cũ.
4. ≥ 1440px: không đổi.

## Ảnh / video
- Ảnh mọi khổ trước/sau trong PR (không commit ảnh).

## Ảnh hưởng tới phần của người khác
- Không sửa file của người khác. `live-posts.module.css`, `social-feed.module.css` thuộc phần Thành.
- Đề xuất cho **Trang** (header, `app/globals.css`): ở 1280px nội dung header (logo 142px + menu 4 mục ~600px + cụm nút ~200px + khoảng cách) vừa một hàng trong ~1178px; đề xuất hạ mốc header 2 hàng từ 1359px xuống ~1100px và cho `nav` co theo `clamp()` (vd. `width: clamp(520px, 48vw, 680px)`, `padding-inline` nhỏ hơn ở 1100–1359px). Lợi: ở 1280×720 khung Cảm hứng cao thêm ~45px.
