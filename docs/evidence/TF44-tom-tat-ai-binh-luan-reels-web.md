# TF44 — Tóm tắt AI ở đầu bình luận Reels trên web

- Jira: TF44 (AI summary chỉ ở bình luận Reels) · Nhánh: `thanh/TF44-tom-tat-ai-binh-luan-reels-web` · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-12

## Bối cảnh
Bảo đã chuyển AI summary sang panel bình luận Reels trên web (`6a28000`, prop `showSummary`), nhưng đoạn này mất khi merge `develop` vào nhánh `bao/TF10-mobile-reel-ux` (`96fc99d`), nên web hiện không còn tóm tắt. Mobile đã có (`apps/mobile/src/features/feed/post-summary.tsx`).

## Đã làm
- **`ReelCommentSummary`** (thêm vào `post-summary.tsx`, dùng lại CSS và chữ `vi.summary` của `CommunitySummary`):
  - Tự tải bằng `usePostSummary(postId, { autoLoad: true })`; chỉ hiện khi `status === 'ready'`. Đang tải, chưa có bình luận, chưa đủ dữ liệu hay lỗi thì không hiện gì – giống mobile.
  - Mascot Tripi, tiêu đề "Cộng đồng nói gì?", chip AI, "Từ N bình luận", hộp "Lưu ý từ cộng đồng" khi có cảnh báo an toàn.
  - Nội dung gọn 4 dòng; "Xem thêm"/"Thu gọn" chỉ hiện khi thật sự dài hơn 4 dòng (đo bằng `ResizeObserver`, đo lại khi panel đổi bề ngang).
  - Hiện dần nhẹ; tắt khi người dùng chọn giảm chuyển động.
- **`RightPanelCommentsSynchronized`** khôi phục prop `showSummary` (mặc định tắt); chỉ màn Reels bật, tab Bài viết không có. Bình luận mới làm mới cả bản tóm tắt (query `['social', 'summary', postId]`).
- `CommunitySummary` của Bảo giữ nguyên.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Panel bình luận Reels web có tóm tắt AI như mobile | Có | `ReelCommentSummary`, `showSummary` trong `live-posts.tsx` |
| Chỉ hiện khi đã có bản tóm tắt | Có | điều kiện `status === 'ready'` trong `ReelCommentSummary` |
| Tóm tắt dài gọn 4 dòng, có Xem thêm | Có | `.reelTextClamped`, nút `textAction` |
| Tab Bài viết không có tóm tắt | Có | `showSummary` mặc định `false` |

## Kết quả kiểm tra
- Sau khi merge `origin/develop` (2026-11-12): `pnpm turbo run lint typecheck test --filter=@tripflix/web --filter=@tripflix/api-client --filter=@tripflix/app-core --filter=@tripflix/mobile --filter=@tripflix/i18n` — 14/14 task; web 44, api-client 183, app-core 89, i18n 2 test pass; lint 0 lỗi (không có warning ở file đã sửa).
- Chưa kiểm được trên dữ liệu thật có bản tóm tắt sẵn trên máy dev.

## Cách kiểm lại
1. Mở `/inspiration?view=reels`, chọn bài đã có bản tóm tắt AI: thẻ "Cộng đồng nói gì?" ở đầu bình luận; tóm tắt dài gọn 4 dòng và bấm "Xem thêm" được.
2. Chọn bài chưa có bản tóm tắt: không hiện gì.
3. Mở tab Bài viết: panel bình luận không có tóm tắt.

## Ảnh / video
- Không đính kèm (theo yêu cầu).

## Ảnh hưởng tới phần của người khác
- Có: thêm `ReelCommentSummary` vào `apps/web/src/features/social/post-summary.tsx` (Bảo viết), không sửa `CommunitySummary`. Anh Thành đã nắm; Bảo đã làm phần mobile tương ứng.
- Phụ thuộc PR #127 (nhánh này đã merge `thanh/TF25-reels-web-giam-lag`).
