# TF05D — Xác thực email trên web

- Nhánh `dung/TF05D-xac-thuc-email` · Hoàng Đức Dũng · Có dùng AI · 2026-11-06

## Đã làm

- Trang `/xac-thuc-email` mở từ liên kết trong thư. Người dùng bấm nút xác nhận để gửi mã dùng một lần.
- Trang tài khoản cho phép gửi lại email và làm mới trạng thái sau khi xác thực trong trình duyệt khác.
- Web hiển thị lý do và liên kết đến trang tài khoản khi API trả `email_unverified`.
- Sinh client xác thực email từ OpenAPI của backend TF05D.

## Kết quả kiểm tra

- `pnpm turbo run lint typecheck test --affected` thành công 20/20 tác vụ.
- `pnpm --filter @tripflix/web build` và `node tools/check-boundaries.mjs` thành công.
- Chromium với API và Mailpit thật đã kiểm luồng đăng ký, gửi lại, xác nhận trên trình duyệt khác và cập nhật trạng thái ở trang tài khoản ban đầu.
- Đã chụp trang tài khoản ở 1366 px và trang xác thực ở 390 px trên Chromium.

## Cách kiểm lại

1. Đăng ký bằng mật khẩu trên web và kiểm tra thông báo xác thực trong trang tài khoản.
2. Bấm gửi lại, mở thư mới nhất trong Mailpit trên một trình duyệt khác rồi bấm xác nhận.
3. Quay lại trang tài khoản và bấm **Kiểm tra trạng thái**. Sau khi trạng thái cập nhật, thử đăng bài hoặc bình luận.

## Ảnh hưởng đến phần của người khác

- Thay đổi web và client dùng chung. Dũng xác nhận đã báo Thành và đồng ý thực hiện.

## Cập nhật form đăng ký web và mobile

- Hiển thị phản hồi mật khẩu trong khi nhập. Chỉ bật gửi mã khi mật khẩu đạt yêu cầu. Form chỉ gửi yêu cầu tạo tài khoản khi đã có mã gồm 8 chữ số.
- Chromium và Mailpit đã kiểm cảnh báo mật khẩu yếu, trạng thái chờ mã, từ chối mã sai và chuyển sang trang tài khoản sau mã đúng.
- Dũng xác nhận đã báo Trang và đồng ý cập nhật màn đăng ký mobile. Mobile đã qua kiểm tra mã nguồn và kiểu dữ liệu. Chưa chạy trên thiết bị Android.

## Cập nhật: đếm ngược gửi lại mã

- Sau khi gửi mã, nút đổi thành "Gửi lại mã sau N giây" và bị khoá tới khi hết giờ. Số giây lấy từ `resendAfterSeconds`, hoặc `retryAfterSeconds` khi gặp `429`. Khi `429` do bấm quá sớm, màn hình hiện số giây còn lại thay cho câu lỗi chung. Đổi email hoặc đổi tab thì bỏ đếm ngược. Thay đổi áp dụng cho cả web và mobile.
- Câu chú thích sau khi gửi mã cho biết rằng nếu email đã có tài khoản thì người dùng sẽ nhận hướng dẫn đăng nhập thay cho mã.
- `api-client` có thêm `sendRegistrationCode`. Hàm `requestRegistrationCode` vẫn giữ và được đánh dấu deprecated. Thêm `getRetryAfterSeconds` và `useResendCooldown`, có test.
- Kết quả sau khi merge `origin/develop`: lint và typecheck của web, mobile, api-client, i18n đều pass. api-client 81/81 test pass, i18n 2/2 test pass.
- Chưa chụp ảnh giao diện đếm ngược. Mobile chưa chạy trên thiết bị Android.
- Ảnh hưởng: `apps/web` của Thành và `apps/mobile` của Trang. Cần báo hai bạn trước khi merge.

## Sửa lỗi: bắt buộc tên hiển thị trước khi gửi mã, form đăng nhập nền trắng

- Nhánh `dung/TF05D-bat-buoc-ten-khi-gui-ma` · 2026-11-06
- Lỗi: chưa nhập tên hiển thị vẫn bấm được "Gửi mã xác thực". Thêm `canSendRegistrationCode` ở `packages/app-core`. Hàm này yêu cầu đã nhập tên, email và có mật khẩu mạnh. Web và mobile dùng chung hàm này cho nút gửi mã và nút tạo tài khoản.
- Khi email và mật khẩu đã đạt mà còn thiếu tên: web hiện cảnh báo nền vàng có icon "Nhập tên hiển thị để gửi mã xác thực." và tô viền cam ô "Tên hiển thị" (`aria-invalid`). Mobile hiện `Notice` cùng nội dung.
- Ô nhập đăng nhập, đăng ký, quên và đặt lại mật khẩu đổi từ nền kem sang nền trắng có viền, khi focus viền cam như trang tài khoản. Chặn nền xanh của autofill.
- `.auth-page` bám đầu trang (`align-items: start`), cột giới thiệu `sticky`: form dài ra khi hiện dòng nhắc thì cột trái không bị đẩy theo.
- Kiểm tra sau khi cập nhật `origin/develop`: lint, typecheck của app-core, i18n, web, mobile đều pass (10/10 task). app-core 40/40 test, có test mới cho `canSendRegistrationCode`. i18n 2/2 test. Chưa chụp ảnh giao diện. Mobile chưa chạy trên Android.
- Ảnh hưởng: `apps/web` (Thành), `apps/mobile` (Trang).

## Cập nhật: mật khẩu mới tối đa 64, tên hiển thị tối đa 30, có bộ đếm

- Nhánh `dung/TF05D-gioi-han-mat-khau-va-ten` · 2026-11-06 · Đi cùng PR BE Sukemcute/tripflix-be#78.
- `packages/app-core`: thêm `NEW_PASSWORD_MAX = 64`, `CURRENT_PASSWORD_MAX = 128`, `DISPLAY_NAME_MAX = 30` và hàm `countCharacters`. Hàm này đếm emoji là 1 ký tự, giống cách Core API đếm.
- Web: `AuthField` và `PasswordField` có thêm `maxChars`, hiện bộ đếm "x/tối đa" cạnh nhãn, chuyển màu cam khi chạm giới hạn. Áp dụng cho tên khi đăng ký (30), mật khẩu khi đăng ký (64), mật khẩu mới khi đổi và đặt lại (64), ô tên trong hồ sơ (30). Ô đăng nhập và ô mật khẩu hiện tại vẫn nhận tới 128 và không có bộ đếm.
- Mobile: dùng cùng các giới hạn ở màn đăng ký và màn cài đặt tài khoản.
- Kiểm tra: lint, typecheck và test của app-core, web, mobile đều pass (7/7 task). app-core 41/41 test, có test mới cho `countCharacters`. Chưa chụp ảnh giao diện, mobile chưa chạy trên Android.
- Ảnh hưởng: `apps/web` (Thành), `apps/mobile` (Trang), trong đó có `live-account-screens.tsx` của Trang.

## Cập nhật: bỏ dòng gợi ý mật khẩu khi ô còn trống

- Nhánh `dung/TF05D-bo-goi-y-mat-khau` · 2026-11-06
- Bỏ dòng "Dùng mật khẩu từ 12 đến 128 ký tự và tránh các mật khẩu phổ biến." trên web và mobile. Dòng này còn ghi sai giới hạn (nay là 64), và bộ đếm `0/64` cạnh nhãn đã cho biết giới hạn. Khi bắt đầu gõ, phản hồi ngắn, yếu hoặc mạnh vẫn hiện như cũ. Xoá khoá i18n `registerHint` vì không còn nơi nào dùng.
- Kiểm tra: lint, typecheck và test của web, mobile, i18n đều pass (7/7 task).
- Ảnh hưởng: `apps/web` (Thành), `apps/mobile` (Trang).
