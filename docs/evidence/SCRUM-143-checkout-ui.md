# SCRUM-143 — Tóm tắt đơn và thứ bậc checkout

- Jira: https://tripflix.atlassian.net/browse/SCRUM-143
- Nhánh: `trang/SCRUM-143-checkout-ui` · Trang thực hiện (có dùng AI)
- Ngày: 2026-11-19

## Đã làm

Tóm tắt cũ lấy tên phòng làm headline, giá chen bên cạnh, lặp pill chính sách và tổng tiền cả trong card lẫn footer. Tóm tắt mới ưu tiên tên khách sạn từ `propertyName`, tuyến từ `fromAirport`/`toAirport`, phòng và ngày/số lượng. Tên dài không bị cắt; có nút mở gói giá, điều kiện huỷ và giá từng dịch vụ. Thiếu tên khách sạn có trạng thái rõ, không trình bày tên phòng như tên khách sạn. Dữ liệu đọc từ đơn đang giữ, không lấy giá/tên mới từ catalogue để thay snapshot giao dịch.

Tổng tiền nằm ở footer khi có CTA thanh toán; ở OTP/hết hạn hoặc trạng thái không có CTA, tóm tắt vẫn giữ tổng để không mất ngữ cảnh. Chỉ đổi cách trình bày, không cộng lại đơn hoặc đổi số tiền chấp nhận. Form chia thông tin liên hệ, từng hành khách và thanh toán với tiêu đề 20/30, khoảng cách nhóm rõ. Ô nhập bo 6 px, khối nội dung bo 10 px. Nút phương thức thanh toán dùng nền chọn, không gạch dưới tab. Thẻ kiểm thử có vùng bấm ít nhất 44 px. Không thêm viền trang trí đầu card hoặc chữ gạch chân.

CTA thanh toán đủ bề ngang, chữ 15 px theo Button hiện có, số tiền 24/34. OTP dùng cùng bo nhẹ; bỏ câu hướng dẫn OTP trùng và không hiển thị thông báo chờ kết quả thay cho việc người dùng cần nhập OTP. Luồng token hoá thẻ, xác nhận chính sách, kiểm tra dữ liệu, giữ chỗ, VNPay và retry vẫn dùng logic cũ.

## Giới hạn dữ liệu cần theo dõi

CheckoutItemDto hiện có tên/mã khách sạn và sân bay nhưng **không có địa chỉ khách sạn hoặc khoản phải trả tại nơi lưu trú**. Task này không thay API/backend và không tra catalogue để giả làm dữ liệu của đơn đã giữ. Giao diện nói rõ khoản thu tại nơi lưu trú chưa có thông tin xác nhận, hướng người dùng đối chiếu chính sách; không hiển thị 0đ hay ngầm khẳng định đã bao gồm mọi khoản. Muốn xác nhận địa chỉ và số phí chính xác cần bổ sung snapshot từ backend. Vì vậy tiêu chí dữ liệu này chưa thể coi là hoàn tất đầy đủ.

## Đối chiếu yêu cầu

| Tiêu chí                                                      | Kết quả                          | Bằng chứng                                                                                                                                            |
| ------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Đối chiếu tên nơi ở, phòng, kỳ ở, tuyến và số khách           | Đạt với dữ liệu snapshot hiện có | Fixture 2 nơi ở + 2 chặng, tên dài, 375/390/430 px                                                                                                    |
| Mở được gói giá/điều kiện, tổng không lặp                     | Đạt                              | Expand/collapse và assert tổng chỉ một lần khi pending                                                                                                |
| Form trống/lỗi/đã nhập, lỗi gần trường và không bị footer che | Đạt trên browser                 | Scroll lỗi đến vùng đọc phía trên footer, ảnh error/filled, không request thanh toán khi dữ liệu sai                                                  |
| Bảo toàn payload và trạng thái thanh toán                     | Đạt với fixtures                 | Contact đầy đủ, guests=[] cho đơn chỉ phòng, token hoá số thẻ test, paymentToken/expectedTotal/policyVersion đúng; OTP còn tổng; hết hạn không có CTA |
| Địa chỉ và phí thu tại nơi lưu trú được xác nhận              | Chưa đủ dữ liệu                  | Giới hạn hợp đồng nêu trên; giao diện không suy đoán                                                                                                  |
| Native/keyboard/font hệ thống và giao dịch thật               | Chưa chạy                        | Text 140% là mô phỏng browser, không thay thế native                                                                                                  |

## Kiểm tra

- `pnpm turbo run lint typecheck test --affected`: **22/22 tác vụ thành công**, mobile còn 19 cảnh báo có sẵn; không thêm lỗi/cảnh báo ở phần thay đổi.
- `node tools/check-boundaries.mjs`, `git diff --check`: đạt.
- `node tools/verify-mobile-checkout-ui.cjs`: đạt 375/390/430 px, không page error/tràn ngang. Mixed order kiểm tra nhận diện và lỗi form; đơn chỉ phòng kiểm tra payload qua mock token/guests/pay tới OTP. Không charge hay tạo đơn thật.
- Bài kiểm tra dùng auth/order/gateway fixtures; không xem kết quả này là xác nhận VNPay hoặc OTP thật.
- Kết quả máy đọc: `SCRUM-143-checkout-ui-qa.json`.

## Cách kiểm lại

1. Tạo đơn test có nhiều khách sạn/chặng, mở checkout; đối chiếu tên khách sạn/phòng, ngày, tuyến và số khách.
2. Mở/thu gọn chi tiết, xem chính sách riêng và khoản thu chưa xác nhận; kiểm tổng ở footer.
3. Chọn thẻ test và đồng ý chính sách, gửi form trống để xem lỗi. Nhập đúng thông tin và thử OTP trong môi trường test. Không dùng thẻ thật cho bài test này.
4. Kiểm tra đơn hết hạn, text lớn và bàn phím native; các ca native còn chờ xác nhận.
5. Chạy script với `PLAYWRIGHT_PACKAGE`, `MOBILE_PREVIEW_URL` (mặc định 8083) và `MOBILE_EVIDENCE_DIR`. Edge headless; `CAPTURE_BASELINE=1` chỉ cho bản chưa sửa.

## Ảnh và phạm vi

- Ảnh trước/sau và form lỗi/OTP đính kèm Jira; local `outputs/mobile-checkout-ui-2026-11-19`. Không commit PNG.
- Mobile thuộc Trang; i18n thêm nhãn. Không sửa API client sinh tự động, backend, tính tiền, auth hoặc các trạng thái giao dịch.
- Giữ task In Review và assignee trống; chưa đóng thay SCRUM-137 hoặc công việc bổ sung snapshot backend.
