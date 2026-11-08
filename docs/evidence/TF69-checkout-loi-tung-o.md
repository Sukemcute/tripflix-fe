# TF69 — Checkout báo lỗi đúng từng ô thông tin khách (web)

- Jira: [SCRUM-73](https://tripflix.atlassian.net/browse/SCRUM-73) · Nhánh: `trang/TF69-checkout-loi-tung-o` · Người làm: Lê Thị Thùy Trang (dùng AI: có) · Ngày: 2026-11-08

## Đã làm
- `packages/app-core/src/checkout-guests.ts`: `findCheckoutFieldErrors` kiểm người liên hệ và từng hành khách theo đúng luật server (người lớn từ 12 tuổi ở chặng đầu, trẻ em 2–11, em bé dưới 2 tới chặng cuối), trả lý do theo từng ô; `findTravelDates` lấy ngày bay đầu và cuối của đơn. Dùng được cho cả mobile.
- `apps/web/src/features/checkout/checkout-screen.tsx`: bấm Thanh toán thì kiểm từng ô; ô sai viền đỏ, có câu lý do ngay bên dưới, tự cuộn và focus tới ô sai đầu tiên; câu tổng ghi "Còn N ô chưa đúng…". Sửa ô nào thì lỗi của ô đó mất. Lỗi 400 của server có `errors[]` cũng được gắn vào đúng ô.
- Trước đây web chỉ kiểm ngày sinh hợp lệ và không sau hôm nay, không kiểm tuổi theo loại khách. Vì vậy người lớn sinh hôm nay vẫn gửi lên server và chỉ nhận câu chung "Thông tin khách chưa đủ hoặc chưa đúng."
- `packages/i18n/src/commerce.ts`: thêm `invalidFields` và nhóm `fieldErrors`; không sửa key cũ.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Người lớn ngày sinh dưới 12 tuổi: báo ngay dưới ô ngày sinh đúng hành khách | Đạt | `checkout-guests.test.ts` › "người lớn sinh hôm nay báo sai tuổi người lớn ở đúng ô ngày sinh"; ảnh màn hình |
| Thiếu tên, số điện thoại sai, email sai: báo đúng ô | Đạt | `checkout-guests.test.ts` › "báo riêng từng ô liên hệ và hành khách" |
| Hiện lỗi theo ô khi server trả về | Đạt | `readServerFieldErrors` trong `checkout-screen.tsx`, đọc `errors[]` của BE TF69 |
| Test pass, có ảnh evidence | Đạt test / ảnh bổ sung trong PR | xem bên dưới |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`: 20/20 task pass; app-core 46 test pass (thêm 5), i18n 2, api-client 91, tokens 1. Lint web có 6 cảnh báo cũ ở `flights/` và `auth/`, không thuộc task này.

## Cách kiểm lại
1. `pnpm --filter @tripflix/app-core test`
2. Chạy web + core-api, đặt vé bay 1 người lớn, sang bước "Thông tin & thanh toán", nhập ngày sinh hôm nay rồi bấm Thanh toán: ô ngày sinh hành khách 1 viền đỏ, dưới ghi "Hành khách 1 là người lớn, phải đủ 12 tuổi vào ngày bay."
3. Xoá số điện thoại, nhập email sai rồi bấm Thanh toán: từng ô có câu riêng, câu tổng ghi số ô còn sai.

## Ảnh / video
- Đính trong PR.

## Ảnh hưởng tới phần của người khác
- Có: `apps/web/src/features/checkout/` của Thành (`checkout-screen.tsx`, `checkout-form.module.css`). Người dùng đã đồng ý sửa trong phiên. Không đổi props hay export của component dùng chung; `Field` là component nội bộ của file, chỉ thêm prop `error`. Form thêm `noValidate` vì đã tự báo lỗi từng ô.
- `copy.invalidContact` và `copy.invalidGuests` không còn dùng ở web nhưng vẫn giữ trong i18n.
