# TF31 — Thẻ chuyến bay trong chat Tripi hiện ra và mở đúng màn chọn vé

- Notion: TF31 · Nhánh: `bao/TF31-the-chuyen-bay` · Người làm: Bảo (dùng AI: có) · Ngày: 2026-11-16
- Kế hoạch: bước A3. Đi cùng AI nhánh `bao/TF31-san-bay-theo-ten`: thẻ chuyến bay nào cũng có số khách.

## Đã làm
- **Sửa lỗi:** thẻ chuyến bay của Tripi **không hiện** trên mobile.
  - Bộ lọc "thẻ lạ thì bỏ qua" thêm ở FE #164 chỉ giữ `stay`, `post`, `plan`.
  - Nay giữ cả `flight`, có biểu tượng máy bay.
- **Bấm thẻ chuyến bay mở màn `/flights` có sẵn**, truyền `from`, `to`, `date`, `passengers` từ thẻ.
  - Trước đây thẻ đi nhầm sang `/trip/[slug]` với mã sản phẩm vé.
  - Màn vé tự tìm lại nên giá và chỗ luôn mới; đặt vé qua checkout sẵn có.
  - Thẻ cũ không có số khách thì mở với 1 khách.

## Đối chiếu "Xong khi"
| Tiêu chí (kế hoạch A3) | Đạt | Bằng chứng |
|---|---|---|
| Thẻ chuyến bay hiện trong chat | Đạt | `assistant-cards.tsx`: `others` gồm `flight` |
| Bấm thẻ mở màn chọn vé đúng tuyến, ngày, số khách | Đạt (code) | `openCard`; màn `/flights` đọc đúng các tham số này (`flight-search-screen.tsx`) |
| Ảnh trên app | **Chưa** | Xem mục Ảnh / video |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`: **16/16** task thành công.

## Cách kiểm lại
1. Chạy BE, ai-service (nhánh `bao/TF31-san-bay-theo-ten`) và `pnpm --filter @tripflix/mobile web`.
2. Hỏi Tripi "bay từ sài gòn ra hà nội thứ 7 này 2 người".
   - Kết quả đúng: hiện thẻ chuyến bay.
   - Bấm một thẻ: mở màn vé SGN → HAN đúng ngày, 2 khách.

## Ảnh / video
- **Chưa có.** Docker BE đang tắt và khung trình duyệt dùng để chụp không gọi được core, AI ở localhost. Cần chụp bổ sung trước khi merge (RULES §10 FE).

## Ảnh hưởng tới phần của người khác
- Có: `apps/mobile/src/features/assistant/assistant-cards.tsx` (chị Trang). Thêm nhánh cho thẻ `flight`, không đổi thẻ khác. Chờ chị Trang duyệt.
