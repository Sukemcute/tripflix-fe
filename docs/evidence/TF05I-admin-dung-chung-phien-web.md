# TF05I — Trang quản trị dùng chung phiên đăng nhập với web (FE)

- Notion: chưa có task · Nhánh: `dung/TF05I-admin-dung-chung-phien-web` · Người làm: Dũng (dùng AI: có) · Ngày: 2026-11-17
- Phụ thuộc PR BE `tripflix-be` nhánh cùng tên (endpoint `/api/auth/admin-handoff`, `/api/auth/admin-handoff/exchange`).

## Đã làm
- **Web:** nút "Mở trang quản trị" (menu avatar, trang tài khoản) xin mã một lần rồi chuyển sang `ADMIN_URL/auth/handoff#code=…`. Mã nằm sau `#` nên không vào log máy chủ hay Referer. `/login?returnTo=admin`: đã đăng nhập sẵn hoặc vừa đăng nhập xong thì chuyển thẳng về admin; không phải nhân viên thì hiện lỗi "không có quyền", ở lại web.
- **Admin:** bỏ trang `/login` riêng (và bản đăng nhập demo không còn dùng). Chưa đăng nhập thì chuyển sang `NEXT_PUBLIC_WEB_URL/login?returnTo=admin`. Trang mới `/auth/handoff` đọc mã, xoá mã khỏi URL, đổi mã qua BFF rồi vào dashboard. Đăng xuất admin về trang chủ web (phiên web giữ nguyên).
- **BFF admin:** thay nhánh đăng nhập mật khẩu bằng nhánh đổi mã (`POST /bff/api/auth/admin-handoff/exchange`), giữ nguyên kiểm `/api/admin/me`, thu hồi phiên khi không phải nhân viên, cookie `__Host-tripflix-admin`. Bỏ `password-key`.
- **api-client:** sinh lại từ OpenAPI; thêm `SessionClient.createAdminHandoff`, `exchangeAdminHandoff`.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Đã đăng nhập web, bấm mở admin thì vào thẳng bằng đúng tài khoản | Có (test) | `session-client.test.ts` › admin handoff; `admin-handoff.test.ts` (web); `route.test.ts` (BFF) |
| Bỏ trang đăng nhập riêng của admin | Có | `route.test.ts` › bỏ đăng nhập mật khẩu (404); xoá `app/login` |
| Chưa đăng nhập vào admin thì sang đăng nhập web, xong về dashboard | Có (code) | `live-workspace.tsx`, `login-form.tsx` (web) |
| Chạy được trên máy | Chưa | Chờ chạy thử, bổ sung ảnh |

## Kết quả kiểm tra
`pnpm turbo run lint typecheck test --filter=@tripflix/admin --filter=@tripflix/web --filter=@tripflix/api-client`: 9/9 task xanh. Lint 0 lỗi, không cảnh báo ở file sửa. Test: admin 9 pass, api-client `session-client.test.ts` 19 pass, web `features/auth` 5 pass.

## Cách kiểm lại
1. Chạy core-api từ nhánh BE cùng tên; `AUTH_WEB_ORIGINS` có cả `http://localhost:3100,http://localhost:3200`.
2. `pnpm dev` (web :3100, admin :3200).
3. Đăng nhập web bằng tài khoản moderator/superadmin, bấm "Mở trang quản trị": vào dashboard, không hỏi đăng nhập.
4. Cửa sổ ẩn danh mở `localhost:3200`: chuyển sang `localhost:3100/login?returnTo=admin`; đăng nhập xong về dashboard admin.
5. Tài khoản thành viên làm bước 4: hiện lỗi không có quyền, ở lại web.

## Ảnh / video
- Chưa có, bổ sung trong PR sau khi chạy thử.

## Ảnh hưởng tới phần của người khác
- Có: `apps/web`, `apps/admin` (Thành). Đã nêu trong kế hoạch được duyệt; cần Thành review. `packages/api-client` (Dũng).
- Deploy (Phong): không đổi. Admin dùng `NEXT_PUBLIC_WEB_URL` đã có; server cần `AUTH_WEB_ORIGINS` gồm origin admin (đã có hướng dẫn trong `deploy/SERVER.md`).

## Cập nhật 2026-11-17: mở lại trang đăng nhập admin
- Theo yêu cầu của Dũng: admin có lại trang `/login` riêng (đăng nhập mật khẩu qua BFF như trước TF05I). Chưa đăng nhập vào admin thì về `/login` của admin, không sang web nữa.
- Giữ nút "Mở trang quản trị" bên web: bấm là vào thẳng dashboard admin qua `/auth/handoff`, không phải đăng nhập lại. Mã hỏng hoặc thiếu thì về `/login` của admin.
- Bỏ `/login?returnTo=admin` bên web. BFF admin nhận cả `/api/auth/login` và `/api/auth/admin-handoff/exchange` (dùng chung bước tạo phiên).
- Test analytics và script e2e analytics (Trang) trả về như trước TF05I.
- Kiểm: `pnpm turbo run lint typecheck test --affected` 22/22 task xanh.

## Cập nhật 2026-11-17: thiết kế lại trang đăng nhập admin
- Chỉ đổi giao diện `/login` của admin cho giống trang đăng nhập web: ảnh nền mờ toàn trang, cụm ảnh + mascot + câu chào bên trái, thẻ kính mờ bên phải; ô nhập có icon, nhãn nổi, nút hiện/ẩn mật khẩu. Logic đăng nhập giữ nguyên; không thêm mã xác thực hay quên mật khẩu.
- Đã xem trên preview (desktop 1280 và điện thoại 375x812, không tràn ngang). Ảnh trong PR.
- Kiểm: `pnpm turbo run lint typecheck test --filter=@tripflix/admin` 3/3 task xanh.
