# SCRUM-143 — Checkout theo phong cách màu mới

- Jira: https://tripflix.atlassian.net/browse/SCRUM-143 · Trang (AI) · 2026-11-19
- Nhánh `trang/SCRUM-143-checkout-visual`, base develop `675fffc`.

## Thay đổi và phạm vi

- Theo phản hồi ảnh checkout: bỏ một khối trắng dài, chia vé bay nền vàng nhạt và nơi ở nền biển; headline rõ, ngày và số lượng cùng hàng khi đủ chỗ. Giữ đầy đủ tên nơi ở/phòng/tuyến bay từ snapshot, không cắt chữ dài.
- Điều kiện/gói giá mở rộng; khoản thu tại nơi lưu trú giữ nhãn chưa có thông tin xác nhận. Không giả số phí hoặc địa chỉ mà API chưa trả.
- Footer chỉ một tổng phải trả; OTP/hết hạn giữ tổng trong summary khi không có footer. Nút chưa khả dụng có chỉ dẫn đồng ý điều kiện/chọn phương thức, màu navy có chữ trắng, khi có thể trả chuyển san hô đậm.
- Form liên hệ/hành khách/phương thức có phân cấp và nền phân nhóm, input 16/25; radius 6–10, vùng chạm nút chính 52 và phương thức 48. Không underline/tab gạch chân hoặc viền trang trí đầu card. Dùng UI/UX Pro Max và tokens hiện có, không thêm dependency.
- Develop có commit `7303e90` khôi phục checkout trước SCRUM-143. Nhánh này chỉnh giao diện trên base hiện hành, nối lại component summary tách riêng; không thay nguyên file từ nhánh cũ. Giữ cập nhật mới TF37/tripStatus, expectedTotal, policyVersion, tokenization, VNPay, retry/khóa thao tác và validation.
- Bỏ hint OTP trùng và thông báo chờ kết quả khi đang yêu cầu nhập OTP; không đổi nghiệp vụ OTP.

## Kiểm tra

- `pnpm turbo run lint typecheck test --affected`: 22/22 tác vụ đạt; `node tools/check-boundaries.mjs`, `git diff --check` đạt. Cảnh báo repo cũ ngoài phạm vi không được tắt.
- `tools/verify-mobile-checkout-ui.cjs`: 375/390/430 × 844, app thật và API/gateway fixtures. Hai nơi ở/hai chặng nhận diện được; mở/đóng điều kiện, đổi phương thức, card nền màu/bo 10/không viền đầu; tổng không lặp và nút chưa khả dụng có hướng dẫn.
- Form lỗi không gửi guest/pay request; lỗi đọc được phía trên footer. Đơn chỉ phòng đã điền giữ đúng contact/guests/paymentToken/expectedTotal/policyVersion, tới OTP với đúng một hint. Hết hạn không có nút thanh toán. Không tạo đơn hoặc charge thật.
- Chữ 140% và landscape expired 844×390 là browser preview; không thay cho native Dynamic Type/keyboard/TalkBack. Không page error/tràn ngang trong ca đã chạy.
- QA JSON: `SCRUM-143-checkout-visual-qa.json`. Ảnh trước/sau đính kèm Jira, không commit PNG.

## Kiểm lại

1. Mở checkout của đơn còn hạn trên mobile preview 8083; kiểm tra thẻ vé/phòng, mở điều kiện rồi cuộn tới liên hệ/hành khách/phương thức.
2. Để trống thông tin, chọn phương thức và đồng ý điều kiện, bấm trả để kiểm tra lỗi từng ô; không xác nhận giao dịch thật khi review giao diện.
3. Fixture: đặt PLAYWRIGHT_PACKAGE tới Playwright, MOBILE_EVIDENCE_DIR tới output và chạy `node tools/verify-mobile-checkout-ui.cjs`.

## Giới hạn

- Chưa kiểm tra native Android/iOS, bàn phím/safe area thực tế hay cổng thanh toán thật. API thiếu địa chỉ/số phí thu tại nơi lưu trú, không đánh dấu tiêu chí đó hoàn tất. Giữ Jira In Review, assignee trống.
- Chỉ sửa module booking (Trang), nhãn commerce và script/evidence; không thay API/generated client, backend, shared components, web/admin hoặc cấu hình hệ thống. Không gộp PR #295 trong nhánh này.
- Ảnh Jira `SCRUM-143-checkout-visual-before-after.png`, `form-errors-390.png`.
