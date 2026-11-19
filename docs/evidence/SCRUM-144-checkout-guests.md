# SCRUM-144 — Nhập thông tin liên hệ và hành khách

- Jira: https://tripflix.atlassian.net/browse/SCRUM-144
- Nhánh `trang/SCRUM-144-checkout-guests` · Trang (AI) · 2026-11-20
- Base develop `3b8c425`, đã có checkout visual PR #302; không merge PR khác trong task này.

## Đã làm

- Giữ màu/card/typography của checkout mới, radius 6–10; bổ sung điều khiển min-height 48 và hướng dẫn. Áp dụng UI/UX Pro Max: `redundant entry validation` / UX → tái dùng dữ liệu đã có trong cùng quy trình, có thao tác chủ động của người dùng.
- Nút Dùng thông tin tài khoản chỉ điền ô liên hệ đang trống từ displayName/phone/email; không ghi đè tên/số/email người dùng đã nhập. Không mặc định coi tên hiển thị là tên trên giấy tờ, có nhắc kiểm tra.
- Hành khách 1 có thao tác Người liên hệ là hành khách 1 · chép tên. Chép một lần; không đồng bộ ngầm sau đó, không đổi tên/ngày sinh hành khách 2. Giữ nguyên ngày sinh đã nhập.
- Có thể dùng hồ sơ tài khoản cho tên/ngày sinh hành khách 1, chỉ vào ô trống. Không tự nhận mọi người liên hệ là hành khách; ngày sinh và loại tuổi vẫn kiểm theo luật chuyến đi hiện có.
- Tên trường phân biệt người liên hệ/hành khách 1/2; ngày sinh cũng mang số hành khách. Trường bắt buộc có `*`, email vẫn tùy chọn. Dùng label hiện có của Field/DateSingleField để tên hiển thị và truy cập khớp nhau.
- Validate từng ô khi blur, ngày sinh sau khi chọn xong; không hiện lỗi required của mọi người ngay khi vừa mở form. Submit vẫn kiểm toàn bộ bằng `findCheckoutFieldErrors`.
- Lỗi HTTP 400 `errors[{field,message}]` từ server được map về các field contact/guests hợp lệ và hiển thị dưới ô; giữ tất cả state input. Không gửi pay khi bước lưu khách bị từ chối. Không thay token hóa, expectedTotal, policyVersion, VNPay, OTP, khóa pending/uncertain hoặc payload API.
- Dữ liệu sau copy có thể sửa độc lập. Nút copy bị khóa cùng form khi đang trả tiền/OTP hoặc hết hạn.

## Đối chiếu nghiệm thu

| Tiêu chí | Kết quả |
|---|---|
| Phân biệt contact/guest 1/guest 2, sửa độc lập | Browser labels và payload xác nhận |
| Contact là guest 1, ít nhập lại | Chép tên chủ động và dùng profile vào ô trống; test giữ nội dung đã sửa |
| Lỗi sau tương tác, giữ dữ liệu khi server từ chối | Blur email, required sau submit, server 400 guest 2, không gửi payment |
| Bàn phím thật/text scaling | 140% browser đạt; bàn phím native/TalkBack chưa chạy, chưa coi nghiệm thu đầy đủ |

## Kiểm tra

- `pnpm turbo run lint typecheck test --affected`: **23/23 tác vụ đạt**. Lần đầu 22/23 do worktree thiếu dependency `hls.js` mới trong lockfile admin; `pnpm install --frozen-lockfile --ignore-scripts` đồng bộ, không sửa package/lockfile/admin; chạy lại đạt. 19 cảnh báo mobile có sẵn, không ở file thay đổi.
- `node tools/check-boundaries.mjs`, `git diff --check`: đạt.
- `tools/verify-mobile-checkout-ui.cjs`: app browser thật/API fixtures, 375/390/430 × 844. Nhãn riêng, email blur/không lỗi untouched, profile không ghi đè, contact copy một lần, guest 2 độc lập, chọn ngày qua UI lịch, server guest rejection giữ state/không pay. Đơn chỉ phòng, tổng/payload/OTP và expired giữ regression.
- Guest request được kiểm birthdate từng người (1995-01-01/1995-01-02); guest 2 bị server từ chối vẫn giữ tên cũ. Payment fixture chỉ chạy sau form hợp lệ ở ca khác, không charge thật.
- Chữ 140% và landscape expired là browser; không có page error/tràn ngang trong ca chạy. QA: `SCRUM-144-checkout-guests-qa.json`.

## Kiểm lại / ảnh

1. Đăng nhập, mở checkout đơn có hai hành khách. Dùng thông tin tài khoản, sửa contact rồi chép sang người 1; sửa người 2 và kiểm tra người 1 không đổi.
2. Chọn ngày sinh đúng giấy tờ/loại tuổi; nhập email sai rồi rời ô, sửa lại. Không dùng checkout thật để thử thanh toán nếu chỉ review UI.
3. Test fixtures bằng `node tools/verify-mobile-checkout-ui.cjs`, đặt PLAYWRIGHT_PACKAGE/MOBILE_EVIDENCE_DIR như các evidence checkout trước.
- Jira: `SCRUM-144-contact-and-passengers.png`, `server-guest-errors-390.png`.

## Giới hạn / ảnh hưởng

- Chưa chạy keyboard/safe area/TalkBack/Dynamic Type lớn nhất trên Android/iOS thật, payment thật, account switching trong khi form đang mở. Giữ In Review, assignee trống.
- Không sửa DateSingleField dùng chung, API/generated code/backend/web/admin/dependency. Module booking thuộc Trang; labels commerce và script kiểm tra cập nhật theo tên trường mới.
- Task giảm nhập lặp bằng lựa chọn dữ liệu đã có, không lưu giấy tờ/hồ sơ mới hoặc đưa dữ liệu nhạy cảm vào log/evidence. Dữ liệu QA hoàn toàn giả.
