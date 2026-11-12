# TF44 — AI summary chỉ đặt ở bình luận reel

- Notion: (chưa có link) · Nhánh: `bao/TF44-ai-summary-chi-reel` · Người làm: Bảo (dùng AI: có) · Ngày: 2026-11-12

## Đã làm

- Trước đây AI summary nằm trong khung bình luận dùng chung, nên hiện ở cả trang chi tiết bài. Yêu cầu mới: chỉ hiện ở bình luận của reel, web và mobile giống nhau.
- Mobile: `LiveComments` và `ReelCommentsPanel` có thêm prop `showSummary` (mặc định `false`). Chỉ `ReelSocialOverlay` (reel) bật. Trang chi tiết bài `/trip/[slug]` dùng chung `ReelCommentsPanel` nhưng không bật nên không còn summary.
- Web: bỏ `CommunitySummary` khỏi `LiveComments` (trang chi tiết bài). `RightPanelCommentsSynchronized` có thêm prop `showSummary` (mặc định `false`), chỉ `InspirationImmersiveViewer` (trình xem reel) bật. Feed bài viết dùng chung panel này nên không hiện summary.
- Không đổi API, sự kiện hay schema. Phía AI và BE giữ nguyên: worker vẫn sinh summary cho mọi bài, FE chỉ hiện ở reel.

| Nơi | Trước | Sau |
|---|---|---|
| Web – bình luận reel | không có | có |
| Web – trang chi tiết bài | có | không |
| Web – feed bài viết | không có | không |
| Mobile – bình luận reel | có | có |
| Mobile – trang chi tiết bài `/trip/[slug]` | có | không |

## Đối chiếu "Xong khi"

| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| AI summary hiện ở bình luận reel trên mobile | Có | `reel-social-overlay.tsx` truyền `showSummary`; ảnh chụp Android (bổ sung sau) |
| AI summary hiện ở bình luận reel trên web | Có | `live-posts.tsx`, `InspirationImmersiveViewer` truyền `showSummary`; ảnh chụp web (bổ sung sau) |
| Không hiện ở trang chi tiết bài và feed bài viết | Có | `showSummary` mặc định `false`; web `live-comments.tsx` không còn `CommunitySummary` |
| Web và mobile giống nhau | Có | Cùng quy tắc: chỉ khung bình luận reel bật |

## Kết quả kiểm tra

`pnpm turbo run lint typecheck test --filter=@tripflix/web --filter=@tripflix/mobile --continue`:

- `@tripflix/web` lint: 0 lỗi (13 cảnh báo có sẵn, không thuộc thay đổi này).
- `@tripflix/web` typecheck: đạt.
- `@tripflix/web` test: 1 file, 10/10 test đạt.
- `@tripflix/mobile` lint: 0 lỗi (1 cảnh báo có sẵn).
- `@tripflix/mobile` typecheck: 1 lỗi ở `src/features/booking/hotel-screen.tsx` (route `/hotel-rooms`), không thuộc thay đổi này. Nguyên nhân: file kiểu route sinh tự động `apps/mobile/.expo/types/router.d.ts` trên máy còn từ ngày 10/11, chưa có route `hotel-rooms.tsx` mới merge. Chạy `expo start` một lần sẽ sinh lại.

## Cách kiểm lại

1. Chạy BE, AI service và AI summary worker trên local; tạo một reel có ít nhất 5 bình luận để worker sinh summary.
2. Web: mở `/inspiration?view=reels`, bấm nút bình luận của reel, thấy khối AI summary ở đầu panel. Mở trang chi tiết bài `/trips/<id>`: không có khối AI summary.
3. Mobile: mở tab Reels, mở bình luận, thấy khối AI summary. Mở chi tiết bài `/trip/<id>`, mở bình luận: không có khối AI summary.

## Ảnh / video

- Bổ sung trong PR sau khi chạy local (web và Android).

## Ảnh hưởng tới phần của người khác

- Có: `apps/web/src/features/social/live-comments.tsx`, `live-posts.tsx` (chủ: Thành); `apps/mobile/src/features/feed/live-comments.tsx`, `reel-comments-panel.tsx`, `reel-social-overlay.tsx` (chủ: Trang). Chỉ thêm prop tuỳ chọn, mặc định tắt, không đổi chữ ký có sẵn. Cần Thành và Trang duyệt PR.
