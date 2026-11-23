# TF-tooltip-tripi — Chú thích nút Tripi đồng bộ kiểu chú thích của web

- Nhánh: `thanh/TF-tooltip-tripi` · Người làm: Thành (dùng AI: có) · Ngày: 2026-11-20

## Đã làm
- Rê chuột vào nút Tripi (và nút Trò chuyện mới, Thu nhỏ trong khung chat) hiện chú thích mặc định của trình duyệt (`title`), khác kiểu chú thích nền mực của tab Cảm hứng.
- `TooltipLayer` chuyển từ `features/social/feed` sang `features/shared`, gắn một lần trong `app/providers.tsx` cho cả trang (bỏ bản gắn riêng trong `inspiration-view.tsx`, tránh vẽ hai lần).
- `assistant-widget.tsx`: 3 nút đổi `title` → `data-tooltip` (vẫn giữ `aria-label`).

## Kết quả kiểm tra
- `apps/web`: oxlint 0 lỗi (27 cảnh báo), `next typegen && tsc --noEmit` pass, vitest pass (thêm `assistant-tooltip.test.ts`).

## Cách kiểm lại
1. Rê chuột vào con Tripi trên header ở bất kỳ trang nào: chú thích "Tripi" nền mực, chữ trắng, giống chú thích ở tab Cảm hứng.

## Ảnh hưởng tới phần của người khác
- `assistant-widget.tsx` (Bảo): chỉ đổi thuộc tính `title` → `data-tooltip` của 3 nút.

## Bổ sung: icon nút gửi bình luận
- `live-posts.tsx`: thêm `SocialIcon` `sendUp` (cùng path mũi tên lên của nút gửi Tripi, `assistant-icon.tsx` `arrowUp`), nút gửi bình luận dùng `sendUp` cỡ 18 thay máy bay giấy `send`. Test trong `assistant-tooltip.test.ts`. Web: 577 test pass.
