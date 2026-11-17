# TFxx — Bỏ trang chi tiết bài viết cũ trên web

- Notion: chưa có mã task · Nhánh: `dung/TFxx-bo-trang-bai-cu` · Người làm: Dũng (dùng AI: có) · Ngày: 2026-11-17

## Đã làm
- `/trips/<id>` không còn là trang riêng: chuyển hướng (307) sang `/inspiration?open=<id>`, giữ `?comment=` để link đã gửi (thông báo, link cũ) vẫn mở đúng bài.
- Trang Cảm hứng mở thẳng bài theo link: Reel tự chuyển sang trình xem Reels (`kind=reel`); bài nháp của chính mình mở khung soạn bài.
- `?comment=<id>`: khung bình luận (bài viết và Reels) mở sẵn, đưa luồng của bình luận lên đầu, mở trả lời, cuộn tới và tô nền; bình luận đã xoá thì báo "không còn".
- Nút "…" của tác giả trên thẻ bài và trên Reels: sửa tiêu đề/nội dung, xoá bài (bấm hai lần). Hộp số liệu tương tác bỏ vì thẻ bài đã hiện đủ.
- Mọi link nội bộ dùng chung `buildPostHref`: lưới bài /account, hồ sơ /u, nút "Chi tiết" sau khi lưu nháp, thông báo bình luận, link chia sẻ; admin "xem trên web".
- Xoá `post-detail.tsx`, `live-comments.tsx` (chỉ trang cũ dùng).
- BE không đổi: link `/trips/...` notification-service sinh ra (cả bản đã lưu trong inbox) đi qua redirect.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Link tới trang cũ trỏ sang trang đầy đủ | Có | grep `/trips/` trong `apps/` chỉ còn code chết (`trip-card.tsx`, `explore-results.tsx`, không ai import) |
| URL cũ chuyển hướng | Có | `app/trips/[slug]/page.tsx`, test `search-url.test.ts` |
| Thông báo bình luận mở đúng bình luận | Có | `notification-href.test.ts`, `search-url.test.ts` |
| Sửa/Xóa, số liệu có chỗ mới hoặc ghi bỏ | Có | `post-owner-menu.tsx`; số liệu đã có trên thẻ bài |

## Kết quả kiểm tra
- `pnpm --filter ./apps/web typecheck`, `pnpm --filter ./apps/admin typecheck`: pass.
- `pnpm --filter ./apps/web --filter ./apps/admin lint`: 0 lỗi (1 cảnh báo mới `set-state-in-effect` ở `inspiration-view.tsx`, mở composer cho nháp).
- `vitest run` (apps/web): 18 file, 108/108 test pass.
- Chưa chạy app thật (máy thiếu RAM để bật BE), chưa có ảnh.

## Cách kiểm lại
1. Chạy BE + web local, đăng nhập.
2. Mở `/trips/<id bài ảnh>` → về `/inspiration?open=<id>`, bài nằm đầu bảng tin.
3. Mở `/trips/<id Reel>` → `/inspiration?open=<id>&kind=reel`, Reel đó hiện đầu.
4. Mở `/trips/<id nháp của mình>` → khung soạn bài mở với nháp đó.
5. Bấm thông báo bình luận → khung bình luận mở, bình luận được tô nền.
6. Ở bài của mình bấm "…" → sửa tiêu đề, lưu; xoá bài.

## Ảnh / video
- Chưa có, cần bổ sung trước khi merge.

## Ảnh hưởng tới phần của người khác
- Có: `apps/web` (features/social, discovery, notifications) và `apps/admin` (moderation) của Thành. Cần Thành duyệt PR.
