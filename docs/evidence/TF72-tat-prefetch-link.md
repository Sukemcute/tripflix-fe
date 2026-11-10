# TF72 — Tắt prefetch của `<Link>` trên web

- Jira: https://tripflix.atlassian.net/browse/SCRUM-93 · Nhánh: `bao/TF72-tat-prefetch-link` · Người làm: Bảo (dùng AI: có) · Ngày: 2026-11-10

## Đã làm
- Thêm `prefetch={false}` cho toàn bộ 94 thẻ `<Link>` còn thiếu trong `apps/web/src` (39 file; 3 thẻ ở `auth` đã có sẵn). Lý do: prefetch tự động bắn hàng loạt request `?_rsc=` khi Link vào viewport (footer, carousel đổi `href` mỗi 7 giây), làm nghẽn server Node.
- Không làm component Link bọc chung: phải đổi import ở mọi file mà không được thêm gì.
- `ota-home-recommendations.tsx`: chỉ thêm thuộc tính, phần còn lại để Duy làm ở TF84 (SCRUM-105).

## Đối chiếu "Xong khi"
| Tiêu chí (chép từ Jira) | Đạt | Bằng chứng |
|---|---|---|
| Mở trang chủ + cuộn tới footer, Network tab không còn loạt request `_rsc` prefetch | Có | Bản production (`next build` + `next start`), mở `/`, cuộn tới footer (10 link trong viewport), chờ 8 giây: 0 request chứa `_rsc` trên tổng 64 request |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck --filter=@tripflix/web`: 2/2 task đạt; lint 0 lỗi, 12 cảnh báo có từ trước.
- `pnpm --filter @tripflix/web build`: thành công.
- Không thêm test tự động (thay đổi chỉ là thuộc tính JSX, không có logic).
- Chưa kiểm được: carousel "Gợi ý" khi có dữ liệu thật, vì lúc thử không chạy backend (trang hiện "Không kết nối được máy chủ"). Chưa đo số request `_rsc` trước khi sửa để so sánh.

## Cách kiểm lại
1. `pnpm --filter @tripflix/web build`, rồi `pnpm --filter @tripflix/web exec next start --port 3100` (prefetch không chạy ở `next dev`).
2. Mở `/`, mở tab Network, lọc `_rsc`, cuộn tới footer và chờ carousel xoay vài vòng.
3. Không được có request `_rsc` nào khi chưa bấm link.

## Ảnh / video
- Đính trong PR.

## Ảnh hưởng tới phần của người khác
- Có: toàn bộ `apps/web` (chủ: Thành); `ota-home-recommendations.tsx` và `/search` Duy đang làm ở TF84, TF73. Chỉ thêm một thuộc tính trên mỗi Link, không đổi logic hay props. Cần báo Thành và Duy khi merge.
