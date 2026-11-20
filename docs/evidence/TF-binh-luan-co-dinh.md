# TF-binh-luan-co-dinh — Cố định cột Bình luận tab Bài viết từ 1200px

- Nhánh: `thanh/TF-binh-luan-co-dinh` (tách từ `thanh/TF-nut-tab-dong-bo-2` @ `410f2a39`) · Người làm: Thành · Ngày: 2026-11-20

## Đã làm

- Mở rộng `apps/web/src/features/social/feed/itinerary-pin.ts` (dòng 3-78):
  - Thêm hằng số dùng chung `PINNED_SIDEBARS_MIN_WIDTH = 1200`, `PINNED_SIDEBARS_QUERY = '(min-width: 1200px)'` (giữ export `PINNED_ITINERARY_MIN_WIDTH` và `PINNED_ITINERARY_QUERY` cho code/test đang dùng).
  - Thêm hàm thuần `areFeedSidebarsPinned`, `isCommentPinned`, `resolveFeedRightOpen` và `shouldCloseCommentOnToggle`.
- Cập nhật `apps/web/src/features/social/feed/social-feed-view.tsx` (dòng 20, 108-112, 706-728, 758, 1033-1045):
  - Ghim cột Bình luận bên phải khi `isRightPinned = isItineraryPinned` (`>= 1200px`), mở luôn bằng `resolveFeedRightOpen(rightOpenChoice, isWideScreen, isRightPinned)` và gắn `data-comment-pinned="true"`.
  - Khi đang ghim (`>= 1200px`), ẩn nút đóng (`×`) trên header cột Bình luận (`{!isRightPinned && ...}`).
  - Khi bấm lại nút bình luận trên cùng bài đang mở ở `>= 1200px`, `shouldCloseCommentOnToggle` trả về `false` nên không đóng panel mà vẫn giữ bài được chọn và focus khung bình luận.
  - Giữ nguyên `focusCommentId` (từ thông báo), màn `< 1200px` + mobile, và Reels (`live-posts.tsx` không sửa).
- Cập nhật `apps/web/src/features/social/feed/social-feed.module.css` (dòng 1027, 2283-2295):
  - Bỏ `.splitViewNoRight` khỏi rule gốc (`>= 1440px`) và `@media (max-width: 1439px)` (`1200..1439px`) để lưới `.splitViewContainer` từ `1200px` trở lên luôn giữ 3 cột; giữ nguyên `.splitViewNoLeft`, `.splitViewNoRight`, `.splitViewCenterOnly` trong `@media (max-width: 1199px)` (`1024..1199px`).
- Cập nhật `apps/web/src/features/social/feed/split-view-columns.test.ts` (dòng 26-42) kiểm tra từ `1200px` không còn `.splitViewNoLeft` / `.splitViewNoRight` / `.splitViewCenterOnly` (không xoá test cũ, giữ kiểm tra `@media (max-width: 1199px)`), và mở rộng `apps/web/src/features/social/feed/itinerary-pin.test.ts` (9 tests).

## Đối chiếu "Xong khi"

| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Tab Bài viết `>= 1200px`: cột Bình luận luôn hiện, ẩn nút đóng (`×`), bấm lại nút bình luận cùng bài không đóng | Đạt | `itinerary-pin.test.ts` (9 tests); CDP `1440x900` & `1280x720`: `data-comment-pinned="true"`, `rightCloseBtnExists: false`, bấm nút bình luận cùng bài giữ nguyên `rightPanel` (`380px` / `294.39px`) |
| Lưới `.splitViewContainer` `>= 1200px` bỏ `.splitViewNoRight`, luôn 3 cột, dùng chung mốc 1200px | Đạt | `split-view-columns.test.ts` (4 tests); `PINNED_SIDEBARS_MIN_WIDTH = 1200` / `PINNED_SIDEBARS_QUERY` khớp `@media (min-width: 1200px)` |
| `< 1200px` (`1199x800`) và mobile (`390x844`) đóng/mở như cũ; Reels không đổi; `focusCommentId` giữ nguyên | Đạt | CDP `1199x800` (`rightCloseBtnExists: true`, đóng bằng `×` và toggle cùng bài đều về `rightPanel: null`), `reels1440` (`reelsRightCloseBtnExists: true` và đóng được), `390x844` (`rightPanel: null`, `overflowX: false`) |
| Lint (`<= 27` cảnh báo), typecheck (`next typegen && tsc --noEmit`), test pass | Đạt | `pnpm turbo run lint typecheck test --filter=./apps/web --force`: `27` warnings / `0` errors, `typecheck` pass, `88` files / `567` tests pass |

## Đo đạc CDP thực tế (`http://localhost:3230/inspiration`)

| Khổ màn / Tình huống | `data-comment-pinned` | Cột Lịch trình | Cột Bình luận | Nút `×` Bình luận | `overflowX` |
|---|---|---|---|---|---|
| `1440x900` ban đầu / bấm lại bình luận cùng bài | `"true"` | `340px` | `380px` (giữ mở) | Không render (`false`) | `false` |
| `1280x720` ban đầu / bấm lại bình luận cùng bài | `"true"` | `268.8px` | `294.39px` (giữ mở) | Không render (`false`) | `false` |
| `1440x900` Reels (ban đầu → bấm đóng `×`) | — | — | `380px` → `null` | Hiện trên Reels (`true`) | `false` |
| `1199x800` ban đầu → bấm `×` → mở lại → bấm cùng bài | `null` | `263.77px` | `287.75px` → `null` → `287.75px` → `null` | Hiện (`true`) | `false` |
| `390x844` mobile | `null` | `null` | `null` | — | `false` |

## Kết quả kiểm tra

- Lệnh: `pnpm turbo run lint typecheck test --filter=./apps/web --force`
  - `lint`: pass (`27` warnings sẵn có của repo, `0` errors)
  - `typecheck`: pass (`next typegen && tsc --noEmit`, `0` errors)
  - `test`: pass (`88` test files, `567` tests pass, gồm `itinerary-pin.test.ts` (9) và `split-view-columns.test.ts` (4))

## Cách kiểm lại

1. Chạy `pnpm turbo run lint typecheck test --filter=./apps/web`.
2. Mở `/inspiration` trên `1440x900` / `1280x720` (thấy cả 2 cột bên không có nút đóng, bấm nút bình luận cùng bài không đóng), so sánh với `1199x800`, `390x844` và tab Reels.

## Ảnh kiểm chứng (lưu ngoài repo tại `.orchestrator/binh-luan-co-dinh/`)

- `1440x900-pinned.png`, `1440x900-after-same-post-comment-click.png`, `1440x900-reels-right-closed.png`
- `1280x720-pinned.png`
- `1199x800-initial.png`, `1199x800-right-closed.png`
- `390x844-mobile.png`

## Ảnh hưởng tới phần của người khác

- Không: chỉ sửa các file thuộc tab Cảm hứng (`apps/web/src/features/social/feed/`) của anh Thành; không sửa `live-posts.tsx` hay `itinerary-sidebar-panel.tsx`.
