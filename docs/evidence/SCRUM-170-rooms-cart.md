# SCRUM-170 — Card phòng, gói giá và giỏ

- Jira: https://tripflix.atlassian.net/browse/SCRUM-170
- Nhánh: `trang/SCRUM-170-rooms-cart` · Người làm: Trang (có dùng AI)
- Ngày: 2026-11-19

## Đã làm

Danh sách phòng trước đây mở tất cả gói giá cùng tiện ích, nhiều lớp khung bo lớn; trong giỏ, gói/ngày nối thành chuỗi dài, bộ đếm và giá chen một hàng, Xoá đứng thành nút lớn riêng. Baseline đã chụp tại 375/390/430 px trước khi sửa.

Card phòng mới bo 10 px, tên 18/28, thông tin phụ 14/23; hiện ba tiện ích ban đầu và cho mở đủ tên mà không cắt dòng. Gói giá bo 6 px, dùng nền nhẹ thay khung viền màu; trạng thái chọn có dấu check. Mặc định hiện gói đầu tiên còn báo giá, hoặc các gói đang chọn; có nút xem các gói còn lại. Thu gọn vẫn giữ mọi gói được chọn, không xoá lựa chọn hoặc đổi giá. Chính sách, quyền lợi, giá trước giảm và mức giảm vẫn được giữ.

Nhãn giá phòng nêu rõ / phòng / đêm và số đêm của kỳ ở. Thanh đáy màn phòng đặt nút chính trọn hàng, Bỏ chọn/Thêm vào giỏ ở hàng phụ; giữ toàn bộ hành động. Nút và bộ đếm bo 6 px, vùng chạm tối thiểu 44 px. Tổng tiền, giới hạn số lượng, giảm trẻ em, thêm giỏ và giữ chỗ dùng logic hiện có.

Giỏ trình bày khách sạn → phòng → gói giá → hai ô ngày nhận/trả → số phòng/số đêm và giá. Giá có riêng bề ngang; Xoá trở thành thao tác phụ cạnh bộ đếm. Cảnh báo hết phòng/đổi giá vẫn hiện từ component kiểm tra giỏ. Không thêm chữ gạch chân hay viền trang trí đầu card. Giỏ ít/nhiều mục đều giữ footer, không chèn nội dung giả để lấp khoảng trống.

## Đối chiếu nghiệm thu

| Tiêu chí                                     | Kết quả                  | Bằng chứng                                                                                                                   |
| -------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Một/nhiều phòng có cấu trúc quét rõ          | Đạt trên preview         | Một/nhiều loại phòng, giỏ một/hai mục, tên dài tại 375/390/430                                                               |
| Ngày không đứt cặp; phân biệt phòng/đêm/tổng | Đạt trên preview         | Ngày có nhãn riêng, đơn vị mỗi phòng mỗi đêm, caption tổng theo số phòng/kỳ ở                                                |
| Bộ đếm đủ vùng chạm                          | Đạt bằng phép đo browser | Cả chọn phòng và giỏ đo ít nhất 44×44; chưa xác nhận native                                                                  |
| Hành động/dữ liệu được giữ                   | Đạt với API fixtures     | Mở/thu gọn giữ gói đã chọn, tiện ích đầy đủ, max số phòng, thêm giỏ đúng gói, đổi qty cập nhật tổng và storage, xoá về trống |
| Trạng thái lỗi và chế độ chọn cho lộ trình   | Đạt với fixtures         | Hết chỗ vẫn có thông báo, pick=trip hiện các gói khi mở rộng                                                                 |
| Font scale và thao tác native                | Chưa chạy                | Text 140% chỉ mô phỏng browser, không thay thế thiết bị thật                                                                 |

## Kiểm tra

- `pnpm turbo run lint typecheck test --affected`: **22/22 tác vụ thành công**; mobile có 19 cảnh báo có sẵn, không thêm cảnh báo trong các file thay đổi.
- `node tools/check-boundaries.mjs`, `git diff --check`: đạt.
- `node tools/verify-mobile-rooms-cart.cjs`: đạt 375/390/430 px, không page error, không tràn ngang; kiểm tra các hành động nêu trên, không gạch chân và text 140% trong browser.
- API dùng fixtures, giỏ seed trong browser riêng. Không tạo đơn, giữ chỗ hay thanh toán thật. Kết quả: `SCRUM-170-rooms-cart-qa.json`.
- Chưa xác nhận Android/iOS, cỡ chữ hệ thống, bàn phím hoặc màn hình đọc native. Không thay API hoặc tính giá để làm bài test pass.

## Cách kiểm lại

1. Khách sạn → Chọn phòng. Mở thêm gói giá/tiện ích, chọn gói phụ, thu gọn và kiểm tra gói đã chọn còn hiện.
2. Tăng/bớt số phòng tới giới hạn, Thêm vào giỏ; kiểm tra đúng gói và số lượng.
3. Trong giỏ một/nhiều mục, đối chiếu tên, hai ngày, số phòng/đêm và tổng. Đổi qty, xoá một dòng rồi xoá hết; thử thông báo hết chỗ/giá thay đổi bằng môi trường test.
4. Chạy script với `PLAYWRIGHT_PACKAGE` trỏ Playwright, `MOBILE_PREVIEW_URL` trỏ Metro (mặc định 8083), `MOBILE_EVIDENCE_DIR` trỏ đầu ra; dùng Edge headless. `CAPTURE_BASELINE=1` chỉ để chụp bản chưa sửa.

## Ảnh và phạm vi

- Ảnh trước/sau, gói đang chọn và giỏ nhiều mục được đính kèm Jira. Local: `outputs/mobile-rooms-cart-2026-11-19`; không commit ảnh vào repo.
- Mobile thuộc Trang; i18n chỉ thêm nhãn. Stepper dùng chung với phần sửa khách của màn phòng được giữ chữ ký, callbacks và giới hạn.
- Phần gallery từ SCRUM-169, gợi ý vé TF39, tìm kiếm, auth và nghiệp vụ giữ chỗ không bị sửa. Không đóng thay SCRUM-138 hoặc SCRUM-137; task giữ In Review, assignee trống để kiểm tra native.
