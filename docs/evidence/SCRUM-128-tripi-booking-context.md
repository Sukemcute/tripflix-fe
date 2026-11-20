# SCRUM-128 — Giữ kỳ ở và nhóm khách từ Tripi sang đặt phòng

- Jira: https://tripflix.atlassian.net/browse/SCRUM-128
- Nhánh: `trang/SCRUM-128-tripi-booking-context`; người làm: Trang (có AI); ngày: 2026-11-20.
- Base: `origin/develop` tại `c11638a1`.

## Hành vi

Trước đây, thẻ nơi ở chỉ mở mã khách sạn, khiến màn khách sạn dùng ngày và số người lớn mặc định. Nay thẻ mở màn xác nhận kỳ ở, lấy ngày và cả ba nhóm khách từ ngữ cảnh Tripi hiện tại. Thẻ của lượt chat cũ cũng dùng ngữ cảnh mới nhất và yêu cầu xác nhận lại trước khi tra giá.

Không có ngữ cảnh thì dùng ngày trên thẻ nếu có; thiếu ngày vẫn để trống. Ngữ cảnh đã xoá ngày không lấy lại ngày trên thẻ cũ. Nhóm khách chưa xác định hiển thị 2 người lớn/0 trẻ em/0 em bé để người dùng sửa và xác nhận, chưa gửi request khách sạn. Ngày phải từ ngày mai; trả phòng phải sau nhận phòng; kiểm tra ngày lịch thực, số khách nguyên, ít nhất 1 người lớn, tổng tối đa 9 và số em bé không vượt người lớn.

Sau xác nhận, chuyển đầy đủ kỳ ở/nhóm khách sang khách sạn và chọn phòng. Màn khách sạn có tóm tắt và nút đổi thông tin. Đường dẫn Tripi thiếu/hỏng dữ liệu không tự điền ngày mặc định và không tra giá. Khi sửa kỳ ở/khách ở màn phòng, phải cập nhật giá trước khi chọn phòng hoặc đặt phần đang chọn.

Màn xác nhận dùng màu vàng/xanh biển, góc bo 8px, không gạch chân chữ hay viền trang trí đầu card. `DateRangeField` thêm tuỳ chọn góc bo, giữ nguyên mặc định cho nơi gọi cũ. Chữ mới nằm trong i18n. Không thêm thư viện, sửa API, AI server hay logic thanh toán. Link quay lại sau đăng nhập giữ nguyên ngày và đủ ba nhóm khách; browser đã đối chiếu link, chưa thực hiện đăng nhập Google thật.

## Đối chiếu tiêu chí

| Tiêu chí                                                    | Kết quả và bằng chứng                                                                                                                              |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01–03/12, 2 khách xuyên suốt chat → khách sạn → phòng → giỏ | Đạt trên preview 390px; kiểm tra route, request khách sạn, nội dung giỏ lưu và request checkout.                                                   |
| 3 người lớn, trẻ em/em bé                                   | Đạt trên preview 430px: 3 người lớn + 1 trẻ em + 1 em bé, 12–15/12; kiểm tra cả giỏ và checkout.                                                   |
| Đổi lịch rồi mở thẻ cũ                                      | Đạt: khôi phục hội thoại có thẻ 01–03/12 và ngữ cảnh mới 12–15/12; thẻ cũ mở đúng ngữ cảnh mới. Unit test kiểm tra ưu tiên và trường hợp xoá ngày. |
| Tóm tắt có thể sửa trước khi tra giá                        | Đạt: chọn ngày còn thiếu và tăng số người lớn từ 2 lên 3, không có request trước xác nhận; request sau xác nhận đúng.                              |
| Thiếu ngày không tự dùng ngày khác                          | Đạt: nút xác nhận bị khoá; hotel/rooms deep link hỏng không gửi request tra giá.                                                                   |
| Bằng chứng trước/sau, phân biệt preview/native              | Ảnh audit trước và ảnh preview sau đính kèm Jira; Android/Expo Go chưa chạy, giữ In Review.                                                        |

## Kiểm tra

- `pnpm turbo run lint typecheck test --affected`: **23/23 tác vụ thành công**. Test totals: app-core 259, api-client 316, web 508, admin 67, tokens 1, i18n 2, mobile 3. Lint không lỗi; còn cảnh báo sẵn có mobile 19, web 28, admin 2.
- `node tools/check-boundaries.mjs`: không vi phạm; `git diff --check`: đạt.
- Unit hồi quy mới: `assistant-stay-context.test.ts`, **3/3** ca.
- `tools/verify-mobile-tripi-stay.cjs`: **5/5 nhóm ca** tại 320/390/430px, không lỗi JS, không tràn ngang ở màn xác nhận. Dùng Chromium/Edge với touch viewport, API fixture; không tạo đơn hay thanh toán thật. Ngày fixture lấy tháng sau để chạy lại; lần này là tháng 12/2026.
- Browser suite dùng hội thoại/ngữ cảnh đã khôi phục để kiểm tra hành vi thẻ cũ; không xác nhận khả năng suy luận ngày/số khách của AI thật hay SSE.
- API khách sạn hiện chỉ nhận `checkIn/checkOut/adults`. Trẻ em/em bé đi theo route, tính giá/khả năng chứa ở mobile, giỏ và payload checkout theo hợp đồng có sẵn; không tuyên bố đã gửi chúng trong query khách sạn.

## Bằng chứng

Đính kèm tại Jira:

- `20-tripi-booking-context-lost.jpg` (attachment 10038): ảnh audit 2026-11-16, hiển thị kỳ ở 17–19/11. Đây là ảnh trước từ bộ audit, không phải capture lại base hiện tại.
- `review-390.png` (10039): xác nhận kỳ ở 01–03/12 trước tra giá.
- `checkout-430.png` (10040): checkout cho kỳ ở mới và nhóm gia đình.
- `qa-results.json` (bản cuối 10042; bản 10041 trước khi bổ sung ca khách chưa đăng nhập): thông số request thực thu được từ browser fixture, không chứa thông tin xác thực.
- Kết quả JSON lưu cùng nhánh: `docs/evidence/SCRUM-128-tripi-booking-context-qa.json`.

## Kiểm lại

1. Mở mobile `/assistant`, nhờ Tripi tìm nơi ở cho 01–03/12 với 2 người lớn. Bấm thẻ nơi ở → xác nhận ngày/khách → xem khách sạn → chọn phòng → thêm giỏ → checkout. Đối chiếu cùng kỳ ở và nhóm khách.
2. Đổi yêu cầu thành 12–15/12, 3 người lớn, 1 trẻ em, 1 em bé; mở lại thẻ cũ, kiểm tra màn xác nhận dùng thông tin mới.
3. Hội thoại chưa có ngày: phải chọn ngày trước khi xác nhận. Sửa nhóm khách ở màn phòng: phải cập nhật giá trước khi chọn gói.
4. Chạy script browser với `PLAYWRIGHT_PACKAGE` trỏ tới Playwright đã cài, `MOBILE_PREVIEW_URL=http://localhost:8083`, `MOBILE_EVIDENCE_DIR` là thư mục output. Không cần đổi API/AI URL của app.
5. Còn cần thử trên Android/Expo Go: lịch, bàn phím/safe area, back stack, chat AI thật và tra giá backend thật. Chưa xác nhận giao dịch thật.

## Ảnh hưởng

Mobile thuộc Trang; app-core thêm bộ quy tắc ngữ cảnh có test và export mới, i18n thêm nội dung tiếng Việt. Không đổi mã web/admin, hợp đồng API hay file sinh. Các luồng khách sạn ngoài Tripi giữ hành vi mặc định hiện tại. Assignee Jira để trống.
