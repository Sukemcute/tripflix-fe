# SCRUM-159 · Onboarding sau đăng ký mới

- Task: https://tripflix.atlassian.net/browse/SCRUM-159
- Nhánh: `trang/SCRUM-159-onboarding-sau-dang-ky`
- Ngày: 17/11/2026

## Đã làm

Đăng ký email/OTP thành công và thiết lập phiên xong sẽ chuyển thẳng tới bước chọn sở thích. Trạng thái đã bỏ qua/hoàn tất của thiết bị không chặn tài khoản mới. Câu trả lời của người trước trên thiết bị không được tự đưa vào khảo sát mới.

Luồng tiếp tục qua nhịp đi và xem lại. Lưu, bỏ qua hoặc khám phá tạm thời khi storage lỗi đều quay về đích đăng nhập ban đầu đã được kiểm tra bằng `resolveMobileLoginReturn`. Nếu không có đích hợp lệ, quay về Hồ sơ. Đăng nhập tài khoản hiện có và callback Google giữ luồng cũ; không đoán tài khoản Google mới từ thời gian tạo hồ sơ.

## Kết quả kiểm chứng

`tools/verify-mobile-signup-onboarding.cjs` dùng form thật, SessionClient thật và auth API fixture cô lập. Năm nhóm kiểm thử pass, không có pageErrors:

1. Đăng ký trên thiết bị đã completed → khảo sát mới trống → chọn/lưu → về tác vụ tạo bài.
2. Thiết bị đã skipped vẫn hiện khảo sát sau đăng ký; bỏ qua quay về Saved.
3. Đăng nhập mật khẩu tài khoản cũ quay thẳng về tác vụ, không reset onboarding.
4. API từ chối đăng ký: ở lại form, không reset sở thích cũ.
5. Storage lỗi: khám phá tạm thời vẫn quay về tác vụ ban đầu.

Mobile typecheck/lint và boundary check pass; lint còn cảnh báo có sẵn ngoài các file thay đổi. Chín nhóm regression onboarding hiện có cũng pass; đường mở lại đã được cập nhật theo menu `/settings` trên develop. Kết quả: [signup QA](SCRUM-159-signup-qa.json), [onboarding regression](SCRUM-159-onboarding-regression.json). Ảnh `01-after-signup.png`, `02-review-before-return.png` được lưu trong evidence cục bộ và liên kết từ Jira.

## Cách thử

1. Mở mobile → Hồ sơ → Đăng nhập → Chưa có tài khoản? Đăng ký.
2. Nhập thông tin bắt buộc, nhận OTP 8 số và bấm Tạo tài khoản.
3. Khi đăng ký/đăng nhập tự động thành công, thấy ngay bước chọn trải nghiệm.
4. Chọn gu và lưu hoặc bỏ qua; trở về Hồ sơ/tác vụ đang dở.
5. Muốn xem lại sau này: Tôi → Cài đặt (bánh răng) → Gu du lịch, hoặc `/onboarding`.

Chạy QA với runtime Playwright bên ngoài repo:

```powershell
$env:PLAYWRIGHT_PACKAGE='C:/path/to/node_modules/playwright'
$env:MOBILE_PREVIEW_URL='http://localhost:8083'
node tools/verify-mobile-signup-onboarding.cjs
```

## Giới hạn

Không thay API đăng ký hay cơ chế OTP. Chưa gửi email thật hoặc kiểm thử native trong đợt này. Gu vẫn lưu cục bộ như bản onboarding hiện tại; contract/API/ranking và đồng bộ tài khoản là phạm vi bàn giao Duy ở SCRUM-171. Chưa có tín hiệu backend để phân biệt chính xác tài khoản vừa được tạo bằng Google.
