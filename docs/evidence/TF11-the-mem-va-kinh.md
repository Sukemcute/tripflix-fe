# TF11 — Thẻ trang chủ không viền, thẻ khách sạn kính mờ, dải phòng giấy xé

- Notion: [TF11](https://app.notion.com/40dcb9b9e5c281708194d0561df200cd) · Nhánh: `bao/TF11-the-mem-va-kinh` · Người làm: Quốc Bảo (dùng AI: có) · Ngày: 2026-11-09

## Đã làm
- **Bỏ viền thẻ, hover nổi mềm:** thẻ vé "Có phòng cho chuyến đi sắp tới", banner Tripi, thẻ điểm đến/combo, thẻ khách sạn và thẻ bài chia sẻ không còn viền; thay bằng bóng đổ mềm. Rê chuột thì thẻ nhích lên 4–6px, bóng đậm dần (0,45s).
- **Thẻ khách sạn kính mờ:** ảnh thẻ trải dưới cả phần chữ; phần chữ là kính trắng 86% làm mờ nhẹ ảnh, nên ánh màu theo chính ảnh của thẻ. Hiệu ứng quạt xoè khi cuộn giữ nguyên.
- **Dải "Có phòng cho chuyến đi sắp tới":** bỏ nền hồng nhạt và 2 đường kẻ thẳng. Mép trên là giấy xé, mép dưới là sóng mềm, cả hai có bóng đổ lên ảnh phong cảnh Ninh Bình làm mờ phía dưới. Rê chuột thì bóng sâu hơn, ảnh nền phóng và mờ thêm như một lớp nằm dưới.
- Dải dùng `overflow: clip` (không phải `hidden`) để không thành vùng cuộn riêng, nếu không animation theo cuộn của thẻ bị đứng.
- Ảnh nền: `apps/web/public/brand/home-stays-ninh-binh.jpg` (Unsplash License, ghi nguồn trong `public/brand/README.md`).

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Thẻ không viền, hover nổi mềm | Có | Style tính toán trên trình duyệt: `border-top-width: 0px`, transition `transform, box-shadow` |
| Phần chữ thẻ khách sạn trắng, kính nhẹ theo ảnh | Có | Chạy local, xem trên trình duyệt |
| Dải phòng: giấy xé trên, sóng dưới, nền ảnh mờ, có hover | Có | Chạy local, xem trên trình duyệt |
| Animation quạt xoè vẫn chạy | Có | Giữa lúc cuộn: thẻ bên `rotate ≈ ±7.4deg`, `scale ≈ 0.67`; thẻ giữa `scale ≈ 0.92` |

## Kết quả kiểm tra
`pnpm turbo run lint typecheck --filter=@tripflix/web`: 2/2 task pass (lint 0 lỗi, 11 cảnh báo có sẵn).

## Cách kiểm lại
1. `pnpm --filter @tripflix/web dev`, mở `http://localhost:3100`.
2. Cuộn tới mục "Có phòng cho chuyến đi sắp tới": xem mép giấy xé, sóng, nền ảnh mờ; rê chuột vào dải.
3. Rê chuột lên thẻ vé, thẻ khách sạn, thẻ điểm đến, banner Tripi, thẻ bài chia sẻ.

## Ảnh / video
- Đính kèm trong PR.

## Ảnh hưởng tới phần của người khác
- Có: `apps/web` (chủ: Thành) — chỉ sửa `ota-home.module.css`, `ota-home-previews.tsx` của trang chủ. Ảnh khách sạn thật ở CDN (`d399hxccn6y84z.cloudfront.net/dev/bao/...`) đang trả 403 nên thẻ hiện icon; ngoài phạm vi task này.
