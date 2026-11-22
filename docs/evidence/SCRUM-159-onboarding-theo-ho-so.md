# SCRUM-159 · Kiểm tra onboarding theo hồ sơ tài khoản

- Ngày: 18/11/2026
- Nhánh: `trang/SCRUM-159-onboarding-theo-ho-so`
- Task: https://tripflix.atlassian.net/browse/SCRUM-159

## Hành vi

Sau khi đăng nhập Google, mật khẩu hoặc đăng ký email thành công, mobile kiểm tra `travelPreferences` trong hồ sơ vừa tải từ API. `completed` đi thẳng về tác vụ; `null`, chưa có dữ liệu hoặc `skipped` mở khảo sát. Theo lựa chọn của người dùng, đã bỏ qua sẽ được hỏi lại ở lần đăng nhập sau.

Không cần đoán tài khoản Google mới bằng ngày tạo. Tài khoản mới và cũ chưa hoàn tất đều dùng cùng một cơ chế. Khi khôi phục phiên từ màn gốc, tài khoản chưa điền cũng được mời làm khảo sát; bỏ qua không tạo vòng lặp trong phiên hiện tại.

## Lưu dữ liệu

- Người đã đăng nhập: PATCH `/api/auth/me` qua API client hiện có, sau đó tải lại hồ sơ để xác nhận. API lỗi giữ bản nháp, không báo hoàn tất và có retry/khám phá tạm thời.
- Không xoá các trường vùng/chi phí hoặc mã sở thích đã chọn từ web nhưng chưa có trong 4 lựa chọn UI mobile.
- Bản nháp tài khoản có accountId để không lẫn người khi đổi tài khoản. Bộ nhớ khách riêng; trạng thái local không được coi là bằng chứng tài khoản đã hoàn tất.
- API hiện chưa hỗ trợ pace. Giao diện nói rõ sở thích lưu vào tài khoản, nhịp đi chỉ lưu trên thiết bị; không gửi field không có trong contract.
- Lỗi cache thiết bị không làm một kết quả lưu tài khoản đã được server xác nhận trở thành thất bại. Đóng/bỏ qua màn chỉnh sửa không xoá hồ sơ completed hiện có.

## Kiểm chứng

- Mobile/i18n typecheck, mobile lint, boundary/diff checks pass. Lint còn cảnh báo có sẵn ngoài phần sửa.
- `pnpm --filter @tripflix/api-client exec vitest run src/session-client.test.ts`: 22 test pass, bao gồm Google tải đúng hồ sơ null/skipped/completed trước khi hoàn tất đăng nhập.
- `node tools/verify-mobile-onboarding-profile.cjs`: chính sách cho Google/mật khẩu, trạng thái server ưu tiên và mapping không làm mất trường web pass.
- `tools/verify-mobile-signup-onboarding.cjs`: 9 nhóm QA với form/session thật và auth API fixture pass. Bao gồm hỏi lại skipped, không hỏi completed dù cache khách khác trạng thái, lưu API lỗi/retry, bảo toàn fields, đổi tài khoản, cache lỗi và khôi phục phiên không lặp.
- Guest onboarding regression được chạy lại bằng `tools/verify-mobile-onboarding.cjs`.

Kết quả máy đọc được: [account QA](SCRUM-159-account-qa.json).

## Giới hạn kiểm thử

Chưa chạy OAuth Google thật, email thật hoặc thiết bị native. Môi trường kiểm thử Google có client ID giả bị kiểm duyệt tự động chặn khởi chạy; đã kiểm thử SessionClient Google và chính sách chung bằng fixture, không sửa/bỏ kiểm tra OAuth để thử. Không thay cấu hình Google production, không đổi backend/auth API.

Luồng ranking recommendation vẫn là phạm vi riêng; lưu hồ sơ thành công không được coi là bằng chứng ranking đã đổi.
