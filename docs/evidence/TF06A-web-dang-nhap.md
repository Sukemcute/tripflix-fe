# TF06A — Web: thiết kế lại đăng nhập, quên mật khẩu, trang tài khoản

- Notion: <dán link task TF06A> · Nhánh: `dung/TF06A-web-dang-nhap` · Người làm: Hoàng Đức Dũng (dùng AI: có) · Ngày: 2026-11-05
- Phần đầu của 3 PR: TF06A web (kèm phần dùng chung) → TF06B admin → TF06C mobile.

## Đã làm
- **Đăng nhập, đăng ký** (`/login`): khung hai cột (lời chào, lợi ích, mascot bên trái; thẻ form bên phải; một cột trên màn hẹp), tab Đăng nhập / Tạo tài khoản, nút hiện/ẩn mật khẩu, link "Quên mật khẩu?", nút Google.
- **Báo lỗi đúng từng màn**: đăng ký trùng email hiện "Email này đã được sử dụng." (trước đây hiện câu chung "Dữ liệu đã thay đổi…"), sai mật khẩu, thử quá nhiều lần (429), Google lỗi.
- **Đăng nhập Google**: nạp Google Identity Services bằng `next/script` (không thêm thư viện npm), Client ID lấy từ `NEXT_PUBLIC_GOOGLE_CLIENT_ID`; biến trống thì không hiện nút.
- **Quên mật khẩu** (`/forgot-password`) và **đặt lại mật khẩu** (`/dat-lai-mat-khau?token=`, khớp `AUTH_PASSWORD_RESET_URL` mặc định của BE): nhập lại mật khẩu, báo link hết hạn kèm nút "Gửi lại liên kết".
- **Trang tài khoản**: tách thành 3 thẻ Hồ sơ / Đổi mật khẩu (có ô nhập lại, báo sai mật khẩu hiện tại) / Thiết bị đang đăng nhập (nhãn "Thiết bị hiện tại", hỏi lại trước khi đăng xuất mọi thiết bị, focus chuyển vào khung hỏi lại và trả về khi huỷ).
- **Tên thiết bị**: web gửi `deviceName` khi đăng nhập (ví dụ "Chrome · Windows") thay vì để trống.
- Dùng chung, chỉ **thêm**, không đổi hàm cũ:
  - `packages/api-client`: `SessionClient.loginWithGoogle`, `getAuthErrorKind(error, action)`. Thay cho `readApiErrorMessage` trong kế hoạch: trả khoá chữ để app tự lấy câu trong `vi.api`, không phụ thuộc câu tiếng Việt của BE.
  - `packages/app-core`: `describeDevice(userAgent)`.
  - `packages/i18n`: các khoá chữ mới của màn đăng nhập.
- Giữ nguyên export `LiveLogin`, `LiveAccount` trong `live-account.tsx` nên `app/login/page.tsx`, `app/account/page.tsx` không đổi.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Đăng nhập, đăng ký, giữ phiên khi tải lại | Có | Kiểm thật (3), (5), (6) |
| Báo lỗi đúng: trùng email, sai mật khẩu, quá nhiều lần | Có | Kiểm thật (4), (5), (18); `response.test.ts` |
| Quên → email → đặt lại → đăng nhập mật khẩu mới; link dùng lại báo hết hạn | Có | Kiểm thật (13)–(17) |
| Đăng nhập Google | Một phần | Nút Google thật hiện ra với Client ID (1); luồng chọn tài khoản cần kiểm tay bằng tài khoản có trong Test users; `session-client.test.ts` (3 ca Google) |
| Trang tài khoản: đổi tên, đổi mật khẩu, thiết bị, đăng xuất mọi thiết bị | Có | Kiểm thật (7)–(12b) |
| Màn hẹp không tràn | Có | Kiểm thật (19) ở 390px |

## Kết quả kiểm tra
Chạy ngày 2026-11-05, Node 24.22.1, pnpm 10.32.1:

```
pnpm turbo run lint typecheck test → 23/23 task pass, 0 cảnh báo lint
  api-client 25 test pass (thêm 6: 3 ca loginWithGoogle, 3 ca getAuthErrorKind)
  app-core 34 test pass (thêm 3 ca describeDevice) · i18n 2 · tokens 1 · utils 4
node tools/check-boundaries.mjs → "Luật FE: không có vi phạm."
pnpm --filter @tripflix/web build → Compiled successfully; có /forgot-password, /dat-lai-mat-khau
```

Kiểm thật bằng Chrome (playwright-core, script để ngoài repo) trên web `:3100` → gateway `:8080` → core-api, Postgres, Redis, Mailpit thật: **20/20 PASS**.

```
(1)  /login: khung hai cột, có nút Google
(2)  nút Hiện mật khẩu đổi ô sang dạng chữ
(3)  đăng ký xong vào /account
(4)  đăng ký trùng email: "Email này đã được sử dụng."
(5)  sai mật khẩu: "Email hoặc mật khẩu không đúng."
(6)  đăng nhập đúng, F5 vẫn đăng nhập
(7)  đổi tên hiển thị → tiêu đề đổi theo
(8)  nhập lại không khớp: "Hai mật khẩu chưa khớp."
(9)  sai mật khẩu hiện tại: "Mật khẩu hiện tại không đúng."
(10) đổi mật khẩu thành công
(11) thiết bị "Chrome · Windows", nhãn "Thiết bị hiện tại"
(12) "Đăng xuất mọi thiết bị" hỏi lại, focus vào nút xác nhận
(12b) bấm Hủy: focus quay về nút "Đăng xuất mọi thiết bị"
(13) quên mật khẩu: hiện câu chung
(14) email trong Mailpit có link /dat-lai-mat-khau?token=
(15) đặt lại mật khẩu bằng link trong email
(16) dùng lại link: báo hết hạn, có nút "Gửi lại liên kết"
(17) đăng nhập bằng mật khẩu đã đặt lại
(18) thử sai nhiều lần: "Bạn thử quá nhiều lần. Vui lòng chờ vài phút rồi thử lại."
(19) màn hẹp 390px: một cột, không tràn ngang
```

Ghi chú: console có một dòng `401` khi web khởi động lúc chưa đăng nhập (lần thử làm mới phiên không có cookie). Đây là hành vi có từ trước, có test `anonymous web startup refreshes once…`, không do PR này.

## Cách kiểm lại
1. BE: `pnpm stack:infra`, chạy core-api, `notification-service`, gateway (xem README `tripflix-be`).
2. FE: `pnpm install`, đặt `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (Client ID Web, dev) trong `apps/web/.env.local`, `pnpm dev`.
3. Mở `http://localhost:3100/login`, làm theo các bước ở trên; email quên mật khẩu xem ở `http://localhost:8025`.

## Ảnh / video
- Đính kèm trong PR: đăng nhập, đăng ký, đăng ký trùng, trang tài khoản, quên mật khẩu, đặt lại, link hết hạn, quá nhiều lần, màn hẹp 390px. Không commit ảnh vào repo.

## Ảnh hưởng tới phần của người khác
- Có: `apps/web`, `packages/api-client`, `packages/i18n` (chủ: Thành), `packages/app-core` (chủ: Thành). Đã báo Thành trước khi làm. Chỉ thêm hàm và khoá chữ; viết lại `LiveLogin`, `ProfileEditor` và giữ nguyên tên export.
