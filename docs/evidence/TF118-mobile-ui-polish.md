# TF118 · Chỉnh giao diện mobile sau khi thử trên Expo Web

- Jira [SCRUM-190](https://tripflix.atlassian.net/browse/SCRUM-190) · Nhánh `trang/TF118-mobile-ui-polish` · Trang (dùng AI) · 26/11/2026.
- Tiếp nối [PR #367](https://github.com/Sukemcute/tripflix-fe/pull/367) trên `develop`.

## Thay đổi đã kiểm

| Hạng mục | Kết quả |
| --- | --- |
| Đăng nhập | Màu nền ô tự điền đồng bộ với khung đăng nhập trên web. Hai ô vẫn khai báo autofill email và mật khẩu. |
| Checkout | Phiếu giữ chỗ màu xanh ngọc hiển thị giá từng dịch vụ, thời hạn và tổng tiền. Form liên hệ, hành khách, lựa chọn phương thức và thanh thanh toán có bố cục mới. |
| Dùng thông tin tài khoản | Điền các trường có trong hồ sơ, giữ lại dữ liệu ở trường hồ sơ còn thiếu. Form báo khi thông tin đã khớp. |
| Tripi | Hiện ba chấm trong lúc chờ phản hồi. Cả câu trả lời và lỗi đều kết thúc trạng thái chờ. |

## Kiểm tra

- `pnpm turbo run lint typecheck test --affected` với base `origin/develop`: 12/12 tác vụ đạt. Mobile 26/26 test, lint 0 lỗi và 21 cảnh báo.
- `node tools/check-boundaries.mjs` và `git diff --check`: đạt.
- `tools/verify-mobile-checkout-ui.cjs`: đạt ở 320, 375, 390 và 430 px. Kiểm tổng tiền, đến OTP bằng gateway fixture, lỗi form và trường hợp hồ sơ thiếu số điện thoại.
- `tools/verify-assistant-chat-design.cjs`: đạt ở 375, 390 và 430 px. Kiểm cả phản hồi SSE và lỗi tức thì bằng fixture.

## Ảnh và phạm vi

Ảnh kiểm tra được chụp trên Expo Web và lưu ngoài repo trong hai thư mục `tripflix-tf118-polish-checkout` và `tripflix-tf118-polish-assistant` dưới thư mục tạm của máy. Chưa chạy trên thiết bị Android thật, với autofill có mật khẩu đã lưu, hoặc với giao dịch thanh toán thật.

Các thay đổi nằm trong mobile, chuỗi i18n và bộ test giao diện. Phần checkout dùng dữ liệu và hợp đồng API hiện có.

## Đợt tiếp theo (26/11/2026)

Tiếp nối PR #368 đã merge. Năm commit mới, chỉ đổi giao diện mobile và một chuỗi i18n:

| Hạng mục | Kết quả |
| --- | --- |
| Chọn hành khách (vé máy bay) | Dùng lại bộ chỉnh số tròn chung (`Stepper`), giống bảng chọn số khách ở khách sạn. |
| Onboarding | Nút "Chọn gu của tôi" bo 12px như nút chung, bỏ dạng viên thuốc. |
| Chi tiết khách sạn | Mỗi mục thành thẻ trắng có viền mảnh, tiêu đề cùng cỡ kèm icon, dùng một bộ cỡ chữ chung. Chính sách thành danh sách có icon (ẩn mức cọc 0đ vì trùng dòng "Không yêu cầu đặt cọc"). Đánh giá: tóm tắt ý kiến có vạch vàng, thanh sắp xếp và lọc chủ đề cuộn ngang, mỗi đánh giá một ô viền. |
| i18n | Thêm `hotel.filterByTopic`. Không đổi chuỗi có sẵn. |

### Kiểm tra

- `pnpm turbo run lint typecheck test`: 26/26 tác vụ đạt. Mobile lint 0 lỗi, 21 cảnh báo (bằng mức trước); `tools/check-boundaries.mjs` và `git diff --check`: đạt.
- Kiểm trên Expo Web 390 px: màn chi tiết khách sạn (cuộn hết các mục), bảng Chọn hành khách, onboarding, và 16 màn khác sau khi đổi nút chung.
- Chưa chạy trên thiết bị Android thật.

### Ảnh hưởng tới phần của người khác

- `features/booking/hotel-detail-sections.tsx`, `hotel-screen.tsx` (commerce, chủ code Thắng): chỉ đổi kiểu hiển thị, không đổi dữ liệu, hợp đồng hay luồng đặt phòng.
- `packages/i18n/src/hotel.ts`: chỉ thêm khóa mới.
