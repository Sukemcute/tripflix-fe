# SCRUM-168 — Tinh gọn giao diện đăng nhập và đăng ký mobile

- Jira: https://tripflix.atlassian.net/browse/SCRUM-168
- Nhánh: `trang/SCRUM-168-auth-ui`
- Ngày: 2026-11-18 · Người làm: Trang (có dùng AI)

## Đã làm

Hero cũ chiếm 220 px, cạnh tranh với tiêu đề và đẩy form xuống. Header mới giữ logo và nút quay lại; đăng nhập thông thường dùng ảnh toàn cảnh thấp. Khi quay về giỏ/đặt chuyến, tiêu đề nêu đúng mục đích và bỏ ảnh để ưu tiên thao tác. Đăng ký đi thẳng vào form, chia thành tài khoản, thông tin cá nhân và xác thực email.

Giữ bo góc nhẹ: nút/lựa chọn 6 px, ô nhập/ảnh/thông báo 8 px, bảng quốc tịch 10 px. Không có chữ gạch chân hay đường viền trang trí đầu card. Màu và font dùng tokens hiện có. CTA có trạng thái disabled rõ, kèm hướng dẫn còn thiếu gì. Mật khẩu có yêu cầu trước khi nhập và nút hiện/ẩn được gắn nhãn. Lỗi trường từ server đặt dưới ô tương ứng và focus vào ô đó.

Giữ nguyên trường đăng ký, mã xác thực, mã hóa mật khẩu, API và điều hướng sau xác thực. Nút Google chỉ đổi component trình bày; giữ callback kiểm tra khảo sát theo tài khoản. Không đổi hành vi hoàn tất/bỏ qua onboarding.

## Đối chiếu yêu cầu

| Tiêu chí                                        | Kết quả              | Bằng chứng                                                                           |
| ----------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------ |
| Hero không lấn át form                          | Đạt trên web preview | Ảnh trước/sau 375, 390, 430 px; CTA đặt chuyến nằm trong màn đầu                     |
| Nhóm form đăng ký rõ ràng                       | Đạt                  | Ba nhóm, giữ toàn bộ trường và điều khoản                                            |
| Hỗ trợ mật khẩu và trạng thái chưa đủ thông tin | Đạt                  | Hiện/ẩn giữ nguyên giá trị; hướng dẫn và CTA disabled                                |
| Bảo toàn luồng đăng ký/onboarding               | Đạt với API fixtures | 9 nhóm kiểm tra hồi quy, không có page error                                         |
| Lỗi dài và viewport thấp                        | Đạt trên web preview | Lỗi email nhiều dòng, focus và cuộn đến trường ở viewport cao 480 px                 |
| Kiểm tra trên Android thật                      | Chưa thực hiện       | Máy hiện không có adb khả dụng; web preview không thay thế bàn phím/safe area native |

## Kết quả kiểm tra

- `pnpm turbo run lint typecheck test --affected`: **22/22 task thành công**. Mobile lint còn 17 cảnh báo có sẵn ngoài phần auth, không có lỗi.
- `pnpm --filter @tripflix/mobile typecheck`, `pnpm --filter @tripflix/mobile lint`, `pnpm --filter @tripflix/i18n typecheck`: thành công.
- `node tools/check-boundaries.mjs`, `git diff --check`: thành công.
- `node tools/verify-mobile-auth-ui.cjs`: thành công ở 320/375/390/430 px, kiểm tra CTA, hiện/ẩn mật khẩu, lỗi giữ dữ liệu, chọn quốc tịch, không gạch chân, không tràn ngang; không có page error.
- `node tools/verify-mobile-signup-onboarding.cjs`: **9 nhóm kiểm tra thành công**: đăng ký và lưu khảo sát, bỏ qua và hỏi lại lần đăng nhập sau, tài khoản cũ chưa hoàn tất, lỗi lưu và thử lại, tách dữ liệu giữa tài khoản, tài khoản hoàn tất đi thẳng, đăng ký lỗi, cache không khả dụng, khôi phục phiên không lặp điều hướng.
- Kết quả máy đọc: `SCRUM-168-auth-ui-qa.json` và `SCRUM-168-account-regression-qa.json` trong thư mục evidence.

Các bài browser dùng app thật qua Metro cùng API fixtures, không gửi email thật hay xác thực OAuth Google thật. Bàn phím native, thiết bị Android/iOS và cỡ chữ hệ thống vẫn cần kiểm tra trên thiết bị. Đây là phần việc SCRUM-168; không đóng thay các task global UI và nghiệp vụ đăng ký riêng.

## Cách kiểm lại

### Bổ sung theo review: required và validate sau khi rời ô

- Email được kiểm tra định dạng ngay trên mobile cho cả đăng nhập và đăng ký; email rỗng, thiếu phần tên/miền, thiếu dấu chấm ở miền, có khoảng trắng bên trong hoặc nhiều dấu `@` đều bị chặn trước thao tác gửi. Khoảng trắng đầu/cuối được trim theo API hiện có. Đây là kiểm tra cú pháp; khả năng nhận email vẫn do bước OTP kiểm chứng.
- Tất cả trường nhập bắt buộc có dấu `*`, chú thích ở đầu form, thông tin required/invalid và liên kết thông báo cho web accessibility; native có hint bắt buộc/lỗi. Giới tính, quốc tịch và điều khoản cũng được đánh dấu bắt buộc.
- Tên, email, mật khẩu, ngày sinh và OTP báo lỗi dưới ô sau blur; nhóm giới tính/điều khoản báo cạnh điều khiển sau khi rời. Lỗi cập nhật khi sửa, không tự giành focus. Chỉ lỗi trường trả về từ server giữ hành vi focus hỗ trợ sửa.
- Dùng lại quy tắc mật khẩu/tuổi hiện có, không đổi validation dùng chung của web hay hợp đồng backend. Đổi chế độ login/register reset trạng thái đã chạm để không hiện lỗi sớm.
- Browser QA bổ sung các ca email sai định dạng, tên rỗng, mật khẩu yếu, ngày không có thật, dưới tuổi, chưa chọn giới tính/chấp thuận điều khoản, OTP thiếu 8 số, sửa đúng xóa lỗi, không focus trap và metadata required/invalid. Đạt trên app thật với API fixtures; 9 nhóm hồi quy account/onboarding tiếp tục đạt.
- Ảnh `signup-inline-validation.png` đính kèm Jira; kết quả mới ở `SCRUM-168-auth-ui-qa.json`. Thư mục local: `outputs/mobile-auth-validation-2026-11-18`. Chưa kiểm thử bàn phím và trình đọc màn hình trên thiết bị native.

1. Mở `/login`, rồi `/login?returnTo=/cart`. So sánh tiêu đề và độ cao ảnh; thử hiện/ẩn mật khẩu và thông tin sai.
2. Chuyển Đăng ký. Đi qua ba nhóm, đổi quốc tịch, xác thực email và đăng ký bằng tài khoản test.
3. Kiểm tra khảo sát xuất hiện sau đăng ký; bỏ qua rồi đăng nhập lại phải được hỏi lại, tài khoản đã hoàn tất không bị hỏi.
4. Chạy hai script trên với `PLAYWRIGHT_PACKAGE` trỏ tới Playwright, `MOBILE_PREVIEW_URL` trỏ Metro, `MOBILE_EVIDENCE_DIR` trỏ thư mục đầu ra; script dùng Edge headless mặc định.

## Ảnh và phạm vi ảnh hưởng

- Ảnh so sánh `SCRUM-168-before-after.png` đính kèm Jira; toàn bộ ảnh từng kích thước lưu tại thư mục local `outputs/mobile-auth-ui-2026-11-18` của workspace. Không commit ảnh vào repo.
- Mobile auth thuộc Trang. Chỉ thêm bản dịch trong package i18n, không đổi chữ đang dùng bởi web/admin; không thay API hay backend. Các component trình bày mới chỉ dùng trong auth, không làm đổi UI dùng chung toàn app.
