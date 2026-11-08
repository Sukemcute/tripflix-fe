# TF29 — Chọn người lớn, trẻ em, em bé khi đặt vé máy bay (web, mobile)

- Notion: [TF29](https://app.notion.com/p/40dcb9b9e5c281c888e4f3e134183ae6) · Nhánh: `trang/TF29-tre-em-em-be` (tách từ `trang/TF29-ve-khu-hoi`) · Người làm: Lê Thị Thùy Trang (dùng AI: có) · Ngày: 2026-11-08

## Đã làm
- `api-client`:
  - Đọc và kiểm `children`, `infants` từ URL: tối đa 9 ghế cho người lớn + trẻ em, em bé không quá số người lớn.
  - Gửi kèm hai trường này khi tìm chuyến, xem lịch giá, xem chi tiết chuyến và đặt vé, kể cả vé khứ hồi.
  - Không có trẻ em, em bé thì không gửi hai trường này, nên URL và yêu cầu cũ giữ nguyên.
  - Sinh lại client từ contracts mới của BE.
- Web:
  - Ô "Số hành khách" mở bảng chọn **Người lớn / Trẻ em / Em bé**. Mỗi dòng có tuổi gợi ý; các nút +/− tự khoá khi chạm luật.
  - Kết quả và trang chi tiết chuyến hiện "2 người lớn, 1 trẻ em, 1 em bé".
  - Cuống vé ghi giá từng loại khách và tổng cả nhóm.
  - Trang thanh toán gắn nhãn loại cho từng hành khách ("Trẻ em · 2–11 tuổi vào ngày bay"). Tóm tắt đơn vé bay ghi nhóm khách thay cho "số vé × đơn giá".
- Mobile: màn tìm vé có sheet chọn 3 loại khách, thẻ chuyến ghi giá trẻ em và em bé, form hành khách ghi loại của từng người.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Chọn được người lớn, trẻ em, em bé cùng lúc | Có | QA Playwright: bảng chọn khách, ảnh p01, p04 |
| Luật 9 ghế, mỗi em bé một người lớn | Có | Test `isValidFlightPassengerMix`, `rejects an impossible passenger mix`; QA: nút "+ em bé" khoá khi số em bé bằng số người lớn |
| Giá hiện đúng theo loại khách | Có | QA: cuống vé "Người lớn 2.530.000 · Trẻ em 1.900.000 · Em bé 250.000 /khách", tổng 7.210.000 khớp API |
| Đặt vé và nhập hành khách đúng loại | Có | QA: đặt đơn thật trên stack local, trang thanh toán có 4 hành khách với nhãn Người lớn ×2, Trẻ em, Em bé (ảnh p03); đơn giữ 3 ghế |
| Vé chỉ có người lớn không đổi | Có | Test cũ của `api-client` vẫn pass; URL không có `children`/`infants` như trước |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test`: 23/23 task pass. `api-client` 91 test (thêm 4 test cho nhóm khách).
- `node tools/check-boundaries.mjs`: không vi phạm.
- Lint web: không phát sinh cảnh báo mới (6 cảnh báo a11y cũ vẫn như trước).
- Chạy thật: stack docker local với `core-api` và `web` build từ hai nhánh này, Playwright ở khổ 1360×900 và 390×844; không tràn ngang trên điện thoại.

## Cách kiểm lại
1. Chạy BE nhánh `trang/TF29-tre-em-em-be` (có migration mới) và web nhánh này.
2. Mở `/flights`, bấm ô "Số hành khách", chọn 2 người lớn, 1 trẻ em, 1 em bé, tìm SGN → HAN.
3. Mở một chuyến: cuống vé ghi giá từng loại khách. Đăng nhập, bấm "Chọn chuyến": trang thanh toán có 4 hành khách kèm nhãn loại.

## Ảnh / video
- Đính kèm thủ công trong PR: bảng chọn khách (desktop, điện thoại), cuống vé, trang thanh toán.

## Ảnh hưởng tới phần của người khác
- `apps/web` (Thành): `features/flights`, `app/flights`, `features/checkout` (thêm nhãn loại khách và tóm tắt nhóm khách). Thêm `passenger-picker.tsx`; `FlightDetail` thêm prop `childCount`, `infantCount`; `FlightCard` thêm prop tuỳ chọn `passengerMix`.
- `apps/mobile` (Trang): màn tìm vé máy bay và form hành khách.
- `packages/api-client` (dùng chung): chỉ thêm hàm, trường. Lần sinh client kéo theo các thay đổi đã có trên develop của BE (searchPosts, tab feed `hot`, giới hạn độ dài form tài khoản), đều chỉ thêm trường hoặc sửa mô tả.
- Phụ thuộc BE: cần PR BE `trang/TF29-tre-em-em-be` (thêm trường API, migration) merge trước.
