# TF29 — Vé máy bay khứ hồi (web)

- Notion: [TF29](https://app.notion.com/p/40dcb9b9e5c281c888e4f3e134183ae6) · Nhánh: `trang/TF29-ve-khu-hoi` · Người làm: Lê Thị Thùy Trang (dùng AI: có) · Ngày: 2026-11-07

## Đã làm
- Form tìm chuyến bay có tab **Một chiều / Khứ hồi**. Chọn khứ hồi thì hiện thêm ô **Ngày về**.
  - Lịch ngày về khoá các ngày trước ngày đi và tô dải ngày từ ngày đi tới ngày về.
  - Đổi ngày đi sang sau ngày về thì ngày về tự dời theo.
- Trang kết quả khứ hồi đi theo 2 bước, toàn bộ trạng thái nằm trên URL (`trip=round&returnDate=…&out=…&outFare=…`), nên chia sẻ link hay quay lại sau khi đăng nhập vẫn đúng bước:
  1. **Chọn chuyến đi**: chọn hạng ghế và gói vé rồi bấm "Chọn chuyến đi". Bước này chưa giữ chỗ nên khách chưa đăng nhập vẫn chọn được.
  2. **Chọn chuyến về**: danh sách chiều ngược lại vào ngày về. Thanh tóm tắt hiện chuyến đi đã chọn (số hiệu, giờ, hạng ghế, gói vé, giá) kèm nút "Đổi chuyến đi". Cuống vé hiện **Tổng khứ hồi** = chiều đi + chiều về.
- Dải giá theo ngày đi theo chặng đang chọn. Ở bước chiều về, dải không cho chọn ngày trước ngày đi.
- Bấm "Đặt vé khứ hồi" tạo **một đơn gồm 2 vé** (`POST /checkout` với 2 item flight, mỗi item có `checkIn` riêng). BE đã hỗ trợ sẵn nên không phải sửa BE.
- Chuyến đi đã chọn mà không còn bán được (hết ghế hoặc dừng bán) thì khoá nút đặt và báo người dùng chọn lại.
- `api-client`: thêm `parseFlightReturnDate`, `getReturnFlightSearch`, `buildRoundTripCheckout`; `useFlightOffer` nhận thêm tuỳ chọn `enabled`. Chỉ thêm mới, không đổi chữ ký cũ, mobile không bị ảnh hưởng.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Chọn được vé một chiều hoặc khứ hồi, có ngày về | Có | Ảnh 01, 06; QA: `input[name=returnDate]` = `2026-11-23` |
| Ngày về không trước ngày đi | Có | Test `accepts a return date on or after the departure day…`; QA: ô 19/11 bị khoá trong lịch ngày về |
| Chọn chuyến đi rồi chọn chuyến về, đổi lại được chuyến đi | Có | Ảnh 03, 04, 07 |
| Một đơn chứa cả 2 chặng, tổng tiền đúng | Có | Test `builds one round-trip order…`; gọi API thật: đơn `pending`, 2 item flight (20/11 SGN→HAN 5.060.000 + 23/11 HAN→SGN 4.700.000), `total = 9.760.000`, khớp số ở cuống vé |
| Vé một chiều giữ nguyên như cũ | Có | QA: URL không có `trip` thì không có thanh khứ hồi và ô ngày về |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test`: 23/23 task pass. `api-client` 85 test pass (thêm 3 test mới), `app-core` 41, `utils` 4, `i18n` 2, `tokens` 1.
- `node tools/check-boundaries.mjs`: không có vi phạm.
- Lint web: 0 lỗi; 6 cảnh báo a11y có sẵn từ trước ở `airport-picker.tsx`, `date-picker.tsx`, `login-form.tsx`, không phát sinh cảnh báo mới.
- Chạy app thật (Next dev + stack docker) bằng Playwright, khổ 1360×900 và 390×844: không tràn ngang trên điện thoại.

## Cách kiểm lại
1. `pnpm dev`, mở `/flights`, chọn tab **Khứ hồi**, chọn SGN → HAN, ngày đi 20/11, ngày về 23/11, 2 khách, bấm Tìm.
2. Mở một chuyến, chọn gói vé, bấm **Chọn chuyến đi**: trang chuyển sang bước 2/2 với danh sách HAN → SGN.
3. Mở một chuyến về: cuống vé ghi "Tổng khứ hồi" bằng tổng 2 chặng. Đăng nhập rồi bấm **Đặt vé khứ hồi**: trang thanh toán có 2 vé.
4. Bấm **Đổi chuyến đi** để quay lại bước 1.

## Ảnh / video
- Đính kèm trong PR: bước chọn chuyến đi, lịch ngày về, bước chọn chuyến về, cuống vé tổng khứ hồi, màn hình điện thoại.

## Ảnh hưởng tới phần của người khác
- `apps/web` (Thành): chỉ trong `features/flights` và `app/flights`. `DatePicker` (chỉ form vé máy bay dùng) chuyển sang dạng điều khiển (`value`/`onChange`) và thêm `minDate`; `FlightDateStrip` nhận `hrefFor`/`minDate`; `FlightCard`/`useFlightHold` chỉ thêm prop/tham số tuỳ chọn.
- `packages/api-client`, `packages/i18n` (dùng chung): chỉ thêm mới, không đổi hành vi cũ.
- BE commerce (Thắng): không sửa.
