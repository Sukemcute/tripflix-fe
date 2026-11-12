# TF11 — Hero trang chủ, hiệu ứng quạt thẻ khách sạn và đoàn tàu thẻ bài viết

- Notion: [TF11](https://app.notion.com/40dcb9b9e5c281708194d0561df200cd) · Nhánh: `bao/TF11-hero-va-the-phong` · Người làm: Quốc Bảo (dùng AI: có) · Ngày: 2026-11-06

## Đã làm
- **Hero:** khẩu hiệu tách 2 dòng cố định — "Chạm cảm hứng," màu đen, không xuống dòng (cỡ chữ co theo bề rộng cột bằng `cqi`), "trọn hành trình" màu Teal. Bỏ link "Lướt xuống khám phá"; nút chính to hơn, đổi thành "Chọn chuyến đi của bạn".
- **3 thẻ khách sạn — quạt xoè (scroll-driven):** khi cuộn tới, thẻ bắt đầu chồng ở giữa, nhỏ (hai thẻ bên 60%, thẻ giữa 90%, thẻ giữa trồi lên từ dưới), rồi xoè ra hai bên và phóng to theo nhịp cuộn; xoè hết thì 3 thẻ bằng nhau (lưới 3 cột đều).
- **3 thẻ bài viết — đoàn tàu (scroll-driven):** cuộn tới đâu, thẻ chạy từ phải sang trái tới đó, nối đuôi nhau; lúc chạy ngửa ra sau, lúc phanh chúi về trước, trượt quá rồi lùi về; mỗi thẻ kéo vệt khói mờ. Mốc là chính hàng thẻ, khoảng cuộn tính bằng px (toa 1 bắt đầu khi hàng thẻ ló 80px, toa cuối xong ở 580px) nên thẻ cuối luôn tới nơi dù mục ở gần cuối trang.
- Cắt ngang ở `body` của trang chủ (`overflow-x: clip`) để thẻ còn ngoài mép phải không tạo thanh cuộn ngang mà thẻ đầu vẫn trượt quá được.
- Hiệu ứng chỉ chạy trên desktop (≥641px), tắt khi người dùng chọn giảm chuyển động hoặc trình duyệt chưa hỗ trợ `animation-timeline` (thẻ hiện bình thường).

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| "hứng" nằm dòng 1, màu đen | Có | Đo ở 1536px: dòng 1 "Chạm cảm hứng," một dòng, rộng 574px trong cột 601px, màu `rgb(24,36,43)` |
| Bỏ "Lướt xuống khám phá", nút "Chọn chuyến đi của bạn" to hơn | Có | Nút cao 52px, rộng ~236px; không còn link |
| Quạt thẻ khách sạn, xoè hết thì bằng nhau | Có | Rule `stay-fan-out` với `animation-timeline: view()` đã nạp; lưới 3 cột đều |
| Đoàn tàu thẻ bài viết, thẻ cuối không bị kẹt, thẻ đầu không bị cắt | Có | Còn >1000px cuộn sau khi hàng thẻ ló ra; `body` cắt ngang, trang không có thanh cuộn ngang (scrollWidth 1521 < 1536) |
| Xem chuyển động thật | Chưa kiểm | Khung xem trước bị ẩn nên dữ liệu không tải trong lúc làm; cần xem khi review |

## Kết quả kiểm tra
`pnpm turbo run lint typecheck test --filter=@tripflix/web... --filter=@tripflix/mobile`: xem mục Kiểm tra trong PR.

## Cách kiểm lại
1. `tripflix-be`: `pnpm stack:be`; `tripflix-fe`: `pnpm --filter @tripflix/web dev`.
2. Mở `http://localhost:3100/` ở cửa sổ rộng hơn 640px trên Chrome/Edge: xem hero, cuộn chậm qua mục "Có phòng cho chuyến đi sắp tới" và "Chuyện kể từ những chuyến đi".

## Ảnh / video
- Đính kèm trong PR.

## Ảnh hưởng tới phần của người khác
- `apps/web` (chủ Thành): `ota-hero.tsx`, `ota-hero.module.css`, `ota-home.module.css` (CSS trang chủ do Trang viết — thêm khối hiệu ứng, đổi lưới thẻ khách sạn thành 3 cột đều trên desktop).
- `packages/i18n`: đổi chữ `heroSearch`; `heroExplore` không còn dùng nhưng chưa xoá.
