# TF056 — Mã hoá mật khẩu trước khi gửi (phần FE)

- Jira: thuộc TF05 (SCRUM-9); phần làm tiếp: [SCRUM-106 TF056C](https://tripflix.atlassian.net/browse/SCRUM-106) · Nhánh: `dung/TF056-ma-hoa-mat-khau` (cùng tên ở tripflix-be) · Người làm: Hoàng Đức Dũng (dùng AI: có) · Ngày: 2026-11-10
- Thiết kế và kết quả kiểm thật đầy đủ: `tripflix-be/docs/evidence/TF056-ma-hoa-mat-khau.md`.

## Đã làm
- `@tripflix/api-client`:
  - `password-encryption.ts`: `encryptPassword` (X25519 → HKDF-SHA256 → AES-256-GCM, bằng `@noble/*` 2.4.0, khớp từng byte với core-api).
  - Khoá lấy từ `GET /api/auth/password-key`, giữ 10 phút và chỉnh theo lệch giờ với server.
  - `sendWithPasswords`: server chưa có khoá (503/404) thì gửi mật khẩu thường. Bị từ chối vì `password_envelope_invalid` thì lấy khoá mới và gửi lại đúng 1 lần.
  - `SessionClient.login` và `register` gửi `encPassword`. `sendRegistrationCode` chỉ gửi `{ email }`.
  - `changePassword`, `resetPassword` (`password-actions.ts`) gửi `encCurrentPassword`, `encNewPassword`.
- Web: đổi mật khẩu (`account-security.tsx`) và đặt lại mật khẩu (`reset-password.tsx`) dùng hai hàm trên. Form đăng ký xin mã chỉ bằng email.
- Admin: form tạo nhân sự (`staff-management.tsx`):
  - Bỏ ô mật khẩu, bỏ mật khẩu mặc định `Tripflix@2025`, bỏ lựa chọn superadmin.
  - Có dòng hướng dẫn: nhân sự nhận email để tự đặt mật khẩu.
  - Hiện đúng thông báo lỗi của core-api, ví dụ "Email đã tồn tại trong hệ thống".
- Mobile:
  - Đổi mật khẩu dùng `changePassword`.
  - `src/polyfills/crypto.ts` gắn `crypto.getRandomValues` từ `expo-crypto` 58.0.7, vì Hermes không có sẵn hàm này mà `@noble` cần. File được nạp đầu tiên trong `src/app/_layout.tsx`.
- `src/generated/core-api` sinh lại từ OpenAPI của nhánh BE cùng tên. Chỉ đổi phần auth và admin users.

## Kết quả kiểm tra
Chạy ngày 2026-11-10, Node 24.22.1, pnpm 10.32.1:

```
pnpm turbo run typecheck lint test --filter api-client --filter web --filter admin --filter mobile
  → 10/10 task pass, lint 0 lỗi (cảnh báo còn lại ở file không thuộc TF056)
  api-client 143 test pass, trong đó password-encryption.test.ts có bộ giải mã độc lập bằng node:crypto
  web 10 test pass
mobile
  giả lập Hermes (xoá globalThis.crypto): không polyfill thì báo "crypto.getRandomValues must be defined",
  có polyfill thì mã hoá được bằng số ngẫu nhiên từ expo-crypto
  expo export --platform android → đóng gói được, 5,5 MB Hermes bytecode
```

Kiểm thật trong Chrome, đọc body request như tab Payload. Web 5/5 PASS: đăng nhập, đổi mật khẩu 2 lần, đặt lại mật khẩu, đăng nhập lại. Admin: đăng nhập, tạo nhân sự. Không body nào chứa mật khẩu gốc.

## Lưu ý khi merge
- `expo-crypto` là module native: cần build lại APK hoặc dev client. Expo Go có sẵn module này.
- **Merge và deploy nhánh BE trước.**
  - Lý do: core-api cũ bắt buộc có `password` ở `POST /auth/registration-code`, mà FE mới chỉ gửi email, nên đăng ký sẽ lỗi 400 nếu FE lên trước.
  - Đăng nhập và đổi mật khẩu thì không vướng: gặp server cũ (404 ở `/password-key`), client gửi mật khẩu thường như trước.
- Server mới vẫn nhận mật khẩu thường từ app cũ cho tới khi bật `AUTH_PASSWORD_ENCRYPTION_REQUIRED=true`.
