# TF118 — Đánh giá UI/UX mobile và cải thiện theo audit

- Jira: SCRUM-190 (TF118) · Nhánh: `trang/TF118-mobile-ux-audit` · Người làm: Trang (dùng AI: có) · Ngày: 2026-11-26
- Phụ thuộc: nhánh `trang/TF71-tripi-di-bo` (vòng bước đi của Tripi dùng ở màn chờ) — merge TF71 trước.

## Đã làm
- Báo cáo audit UI/UX mobile (EN + `vi/`) và lộ trình cải thiện trong `docs/ui-ux-review/`.
- Sửa các điểm làm mất niềm tin: bỏ mục "Sắp có", tên dự phòng thay mã tài khoản, thông báo lỗi thân thiện, trạng thái rỗng, viền focus ô nhập.
- Màn chờ dùng Tripi bước đi (vòng walk từ TF71), skeleton thay chỗ trống.
- Bình luận, bộ lọc tìm kiếm, thanh "Đã hiểu", khối điểm đến và số khách ở Tự lên lộ trình được thiết kế lại.
- Di chuyển hệ thiết kế (đợt A–E): thay `compactType` và `colors.*` bằng thang chữ và màu `explorer`; không đụng file Reels.
- Số tiền màu đỏ riêng (`explorer.*.price`, tách khỏi đỏ báo lỗi), tổng tiền in đậm hơn.
- Chip gợi ý của Tripi thành một hàng cuộn ngang; nút chính toàn app bo góc 12px thay vì viên thuốc.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Có báo cáo audit và lộ trình | Có | `docs/ui-ux-review/` |
| Điểm phá vỡ niềm tin đã sửa | Có | Ảnh trước/sau mục "Bước 1" trong báo cáo HTML |
| Token màu giá đạt tương phản | Có | `packages/tokens` test (47 pass, có cặp `price`) |
| Không đổi hợp đồng API | Có | Chỉ đổi mobile, tokens, i18n |

## Kết quả kiểm tra
`pnpm turbo run lint typecheck test`: 26/26 task thành công; lint mobile 0 lỗi, 21 cảnh báo (bằng mức trước thay đổi); test mobile 26 pass; tokens 47 pass.

## Cách kiểm lại
1. `pnpm turbo run lint typecheck test`.
2. Chạy `npx expo start --web` trong `apps/mobile`, mở `/assistant`, `/trip-plans/<id>`, `/hotel/<id>`, `/flights`, `/login`.

## Ảnh / video
- Báo cáo HTML trước/sau (`outputs/ui-redesign-report/index.html`, ngoài repo); sẽ đính ảnh vào PR, không commit ảnh vào repo.

## Ảnh hưởng tới phần của người khác
- Có, đã báo người dùng: `live-discovery-screens` (Duy, gỡ UnderstoodChips hơn 20 dòng), các file booking/hotel (Thắng) đổi kiểu chữ/màu/bo góc, không đổi hành vi hay hợp đồng. Nút chung `Button` đổi bo góc ảnh hưởng nhiều màn. Cần các chủ code xem lại trong PR.
