# TF11 — Ô chọn và lịch mềm trên toàn web

- Notion: [TF11](https://app.notion.com/40dcb9b9e5c281708194d0561df200cd) · Nhánh: `bao/TF11-o-chon-va-lich-mem` · Người làm: Quốc Bảo (dùng AI: có) · Ngày: 2026-11-06

## Đã làm
- Bảng xổ của `<select>` và lịch của `<input type="date">` do trình duyệt vẽ (vuông, thô), CSS không đổi được. Viết 2 component dùng chung trong `features/shared/`:
  - `SoftSelect`: bảng xổ bo 16px, bóng mềm, mở trượt nhẹ; lựa chọn đang trỏ nền Sea Mist, đang chọn chữ Teal Ink có chấm Teal. Phím: mũi tên, Home/End, Enter, Esc, gõ chữ để nhảy.
  - `SoftDatePicker`: lịch bo tròn, tuần bắt đầu thứ Hai, ngày chọn nền Teal Ink, hôm nay viền Teal, ngày ngoài `min`/`max` bị khoá; có ô chọn năm khi truyền `yearRange` (ngày sinh). Phím: mũi tên, PageUp/PageDown, Home/End, Enter, Esc.
  - Bảng xổ/lịch nằm ở top layer (Popover API) nên không bị khung `overflow` cắt; bấm ra ngoài, Esc hoặc cuộn trang thì đóng. Hỗ trợ cả kiểu điều khiển bằng state và gửi theo form gốc (`name` → input ẩn).
- Thay 14 ô chọn và 7 ô ngày: khung tìm phòng (trang chủ, `/search`), chi tiết khách sạn, đánh giá khách sạn, chuyến bay (form tìm, hạng ghế/giá vé), tài khoản (ngày sinh, giới tính, quốc tịch), thanh toán (ngày sinh khách), trang tìm chuyến đi.
- Tripi ở thẻ "Có phòng cho chuyến đi sắp tới" nhích sát đường chia đôi (desktop).
- i18n: thêm chuỗi dùng chung cho ô chọn/lịch ở `vi.common`.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Không còn `<select>` / `<input type="date">` gốc trên web | Có | Tìm toàn bộ `apps/web/src`: chỉ còn trong chú thích |
| Giữ nguyên giá trị, giới hạn ngày, cách gửi form | Có | Chỉ thay ô nhập; `min`/`max`/`name`/`defaultValue` truyền nguyên; typecheck pass |
| Lint không thêm cảnh báo | Có | Còn đúng 1 cảnh báo có sẵn ở `login-form.tsx` |
| Bảng xổ/lịch mềm khi dùng thật | Chưa kiểm | Chưa bấm thử được trên trình duyệt trong lúc làm (khung xem trước bị ẩn); cần kiểm khi review |

## Kết quả kiểm tra
`pnpm turbo run lint typecheck test --filter=@tripflix/web... --filter=@tripflix/mobile`: xem mục Kiểm tra trong PR.

## Cách kiểm lại
1. `tripflix-be`: `pnpm stack:be`; `tripflix-fe`: `pnpm --filter @tripflix/web dev`.
2. Trang chủ: bấm ô Ngày nhận phòng / Ngày trả phòng, mở "Bộ lọc thêm" và các ô chọn trong đó.
3. `/hotels/<id>`: ô ngày và bộ lọc đánh giá. `/flights`: ô sân bay, ngày, số khách, hạng ghế. `/account`: sửa hồ sơ, ngày sinh (chọn năm), giới tính, quốc tịch.
4. Thử bàn phím: Tab tới ô, Enter mở, mũi tên chọn, Esc đóng.

## Ảnh / video
- Đính kèm trong PR.

## Ảnh hưởng tới phần của người khác
- `apps/web` (chủ Thành). Thay ô nhập trong file của Trang/Thắng/Dũng: `flights/*`, `hotels/hotel-screen.tsx`, `hotels/hotel-reviews.tsx`, `auth/account-profile.tsx`, `checkout/checkout-screen.tsx`, `discovery/search-screen.tsx` — chỉ thay ô, không đổi logic.
- Ô `required` trước đây do trình duyệt chặn khi trống; giờ dựa vào validation sẵn có của từng màn (khoá nút gửi/báo lỗi).
- Web chưa có bộ chạy test nên phần tính lịch (lưới 42 ô, cộng tháng) chưa có unit test.
