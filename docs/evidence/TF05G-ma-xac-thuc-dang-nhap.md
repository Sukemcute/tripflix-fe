# Bằng chứng kiểm thử: TF05G — Mã xác thực 8 chữ số khi đăng nhập bằng email và mật khẩu

## Mục tiêu
- Bổ sung bước nhập mã xác thực 8 chữ số gửi qua email khi người dùng đăng nhập bằng tài khoản email + mật khẩu trên trang `/login`.
- Bước 1: Kiểm tra email + mật khẩu qua `POST /api/auth/login-code` (`session.sendLoginCode`), hiển thị ô nhập mã 8 chữ số (`#auth-login-code`) và nút gửi lại mã kèm bộ đếm lùi 60 giây.
- Bước 2: Gửi `loginChallengeId` + `code` kèm thông tin đăng nhập qua `POST /api/auth/login` (`session.login`) để mở phiên đăng nhập.

## Các tệp thay đổi chính
- `packages/i18n/src/api.ts`: Thêm thông báo `loginCodeSent`.
- `packages/api-client/src/generated/core-api/...`: Sinh lại client Orval cho `POST /api/auth/login-code` (`LoginCodeDto`, `LoginCodeResultDto`) và các trường `loginChallengeId`, `code` của `LoginDto`.
- `packages/api-client/src/response.ts`: Ánh xạ lỗi HTTP 400 (không kèm lỗi trường cụ thể) ở hành động `login` sang `registrationCodeInvalid`.
- `packages/api-client/src/session-client.ts`: Thêm `sendLoginCode` và truyền `loginChallengeId`, `code` vào `login`.
- `packages/api-client/src/session-client.test.ts`: Bổ sung unit test cho luồng `sendLoginCode` -> `login` kèm `loginChallengeId` và `code`.
- `apps/web/src/features/auth/login-form.tsx`: Cập nhật form đăng nhập 2 bước trên Web.

## Kết quả kiểm thử
- `pnpm turbo run lint typecheck test --filter=@tripflix/i18n --filter=@tripflix/api-client --filter=@tripflix/web`:
  - `@tripflix/i18n`: lint, typecheck, test PASS (1 test file, 2 tests passed).
  - `@tripflix/api-client`: lint, typecheck, test PASS (27 test files, 196 tests passed).
  - `@tripflix/web`: lint, typecheck, test PASS (11 test files, 70 tests passed).
