# SCRUM-131 — Card dịch vụ trong Đặt lộ trình

- Jira: https://tripflix.atlassian.net/browse/SCRUM-131
- Nhánh: `trang/SCRUM-131-trip-cards` · Người làm: Trang (có dùng AI)
- Ngày: 2026-11-18

## Vấn đề và kết quả

Ảnh baseline trên app thật ở 375/390/430 px xác nhận tên khách sạn, phòng và gói giá bị giới hạn hai dòng trong vùng hẹp giữa checkbox, icon và giá. Một card chưa đủ bề rộng cho các thông tin quyết định đặt chỗ.

Card mới tách nhãn loại dịch vụ/checkbox khỏi tên, phần chi tiết và giá. Tên và chi tiết không giới hạn số dòng; số tiền có nguyên bề ngang. Thao tác xem/đổi vé hoặc phòng có nút riêng, không chen vào dòng giá. Loại dịch vụ dùng icon đơn sắc; lựa chọn dùng cùng màu teal. Bỏ đường timeline bên trái ở màn đặt để trả lại bề rộng cho nội dung; bảng xem lộ trình từ Reels vẫn giữ timeline hiện có.

Bo card 10 px, nút 6 px; không viền màu hoặc viền trang trí đầu card, không gạch chân. Chữ chi tiết 14/23, tên 18/28, giá 20/30; nút đặt có chữ 15/24 và vùng bấm tối thiểu 52 px. Tổng tiền và CTA tách hàng để giá lớn không đẩy nút vào cột hẹp. Bộ đếm khách chia đều không gian và có thể xuống hàng khi cần.

Hiển thị đầy đủ gói vé/phòng và kỳ ở. Chính sách hoàn huỷ lấy từ gói giá đang được chọn trong response hiện có, dùng đúng bản dịch đang dùng trên màn chi tiết. Không thay API, điều kiện chọn, số khách, thuật toán lấy giá, tổng tiền, giữ chỗ hoặc điều hướng. Hai màn đặt dùng chung card; luồng xem từ Reels giữ tương thích props/style.

## Đối chiếu nghiệm thu

| Tiêu chí                                     | Kết quả                | Bằng chứng                                                                     |
| -------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------ |
| Tuyến đọc liền tại 375 px                    | Đạt trên preview       | Assert chiều cao một dòng của HAN → CXR ở 375/390/430                          |
| Tên phòng, gói giá, chính sách và giá đầy đủ | Đạt trên preview       | Tên dài, số tiền 98.765.432đ/123.456.789đ, không line clamp; ảnh card riêng    |
| Không hỏng hành động/dữ liệu                 | Đạt với quote fixtures | Toggle cập nhật tổng, đổi vé/phòng giữ params, tăng khách, xoá dịch vụ builder |
| Hết chỗ/lỗi báo giá không cho đặt            | Đạt với quote fixtures | CTA và checkbox bị khóa, trạng thái vẫn đọc được                               |
| Cỡ chữ hệ thống lớn trên thiết bị native     | Chưa chạy              | Mới kiểm tra text 140% bằng browser; không thay thế native font scale          |

## Kiểm tra

- `pnpm turbo run lint typecheck test --affected`: 22/22 tác vụ thành công. Mobile có 17 cảnh báo lint có sẵn; không lỗi mới trong phần thay đổi.
- `node tools/check-boundaries.mjs` và `git diff --check`: đạt.
- `node tools/verify-mobile-trip-cards.cjs`: đạt 3 bề rộng 375/390/430 px, không page error. Dùng app thật qua Metro và API fixtures, không gọi checkout/ghi tồn kho.
- Fixture kiểm tra phòng/tên dài, hoàn huỷ đúng gói giá, giá lớn, route một dòng, tổng tiền khi bỏ vé, tăng người lớn, params đổi chuyến/phòng, hết chỗ và 503, builder xoá đến trống và khoá CTA.
- Preview text 140% không tràn ngang. Chưa kiểm tra Android/iOS, cỡ chữ hệ thống native, bàn phím và giao dịch với backend thật.
- Kết quả máy đọc: `SCRUM-131-trip-cards-qa.json`.

## Cách kiểm lại

1. Mở tab Đặt, chọn lộ trình có vé bay và khách sạn; thử tại 375/390/430 px.
2. Đọc tên/phòng/gói giá, ngày/kỳ ở, chính sách và số tiền; chọn/bỏ từng dịch vụ rồi đối chiếu tổng.
3. Mở Xem chi tiết & đổi, Đổi chỗ ở; kiểm tra ngày và số khách được giữ theo luồng cũ. Mở bộ đếm và tăng/bớt khách.
4. Mở Tự lên lộ trình, thêm dịch vụ và bỏ từng mục. Kiểm tra tổng/CTA khi trống. Không cần tạo đơn để kiểm UI.
5. Chạy script với `PLAYWRIGHT_PACKAGE` trỏ Playwright, `MOBILE_PREVIEW_URL` trỏ Metro (mặc định 8083), `MOBILE_EVIDENCE_DIR` trỏ đầu ra. Edge headless được dùng; đặt `CAPTURE_BASELINE=1` chỉ để chụp bản chưa sửa.

## Bằng chứng và phạm vi

- Ảnh trước/sau và card riêng đính kèm Jira. Bản local: `outputs/mobile-trip-cards-2026-11-18`, không commit PNG vào repo.
- Thay đổi mobile thuộc Trang; i18n chỉ thêm nhãn Tổng dịch vụ, không sửa bản dịch hiện dùng. Không thay backend của Duy hay các cấu hình chung.
- Không coi SCRUM-137 hoặc các task checkout/thông tin giá Tripi là hoàn thành nhờ thay đổi này. Task để In Review chờ kiểm tra native.
