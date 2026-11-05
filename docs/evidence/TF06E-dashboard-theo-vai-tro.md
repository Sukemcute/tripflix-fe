# TF06E — Dashboard theo vai trò (admin + web)

- Notion: <dán link task TF06E> · Nhánh: `dung/TF06E-dashboard-theo-vai-tro` · Người làm: Hoàng Đức Dũng (dùng AI: có) · Ngày: 2026-11-05
- Làm tiếp sau TF06D (#10). Không đổi API BE.

## Vấn đề

- App admin: moderator và superadmin đều vào thẳng `/moderation`, không có trang tổng quan; chỉ khác nhau ở số mục menu.
- Web `/account`: member, moderator, superadmin thấy y hệt nhau, nhân viên không có lối sang trang quản trị.

## Đã làm

- **Admin, trang Tổng quan ở `/`** (trước đây `/` chuyển sang `/moderation`), mục đầu tiên của menu:
  - **Moderator**: lời chào và quyền ("kiểm duyệt bài đăng"), 3 số liệu bài đang hiện / đã ẩn / đã gỡ (`GET /v1/admin/posts?status=…&limit=1`, đọc `total`), 5 bài mới đăng kèm số báo cáo, nút sang màn Kiểm duyệt. Menu chỉ có Tổng quan và Kiểm duyệt.
  - **Superadmin**: như trên, thêm số tài khoản (`GET /admin/users`, `total`) và nhân sự (`GET /admin/staff`), khung Lối tắt sang mọi màn quản trị, nền thẻ đầu trang màu khác để phân biệt.
  - **Member**: vẫn bị chặn ("Trang này dành cho quản trị viên và kiểm duyệt viên.").
  - Thanh trên cùng có nhãn vai trò cạnh email.
  - Đăng nhập admin xong vào thẳng Tổng quan (`getDemoAdminReturnPath` nhận thêm `/`, mặc định `/`); có `returnTo` hợp lệ thì vẫn theo `returnTo`.
  - Số liệu dùng khoá query `['admin-posts', …]`, nên xử lý bài ở màn Kiểm duyệt xong thì số ở Tổng quan tải lại; số tài khoản, nhân sự dùng chung khoá với màn Nhân sự.
- **Web `/account`**: moderator và superadmin có thẻ "Khu vực quản trị" (chữ theo vai trò, nút "Mở trang quản trị"). Member không đổi. Địa chỉ lấy từ biến mới `NEXT_PUBLIC_ADMIN_URL` (mặc định `http://localhost:3200`, để trống thì ẩn thẻ).
- Khoá chữ mới trong `packages/i18n` (`admin.overview`, `api.overview*`, `api.metric*`, `api.recentPosts`, `api.adminArea*`…). CSS chỉ dùng biến trong `packages/tokens`.

## Đối chiếu "Xong khi"

| Tiêu chí                                               | Đạt | Bằng chứng                                |
| ------------------------------------------------------ | --- | ----------------------------------------- |
| Moderator và superadmin thấy trang tổng quan khác nhau | Có  | Kiểm thật (1)–(8)                         |
| Số liệu đúng với dữ liệu thật                          | Có  | Kiểm thật (2): số trên giao diện khớp API |
| Moderator không vào được màn chỉ dành cho superadmin   | Có  | Kiểm thật (8), (9)                        |
| Member không vào được admin                            | Có  | Kiểm thật (10)                            |
| Web: nhân viên có lối sang admin, member không đổi     | Có  | Kiểm thật (12)–(15)                       |
| Màn hẹp không tràn                                     | Có  | Kiểm thật (11) ở 390px                    |

## Kết quả kiểm tra

Chạy ngày 2026-11-05, Node 24.22.1, pnpm 10.32.1:

```
pnpm turbo run lint typecheck test --affected → 20/20 task pass, 0 cảnh báo lint
node tools/check-boundaries.mjs → "Luật FE: không có vi phạm."
pnpm --filter @tripflix/web --filter @tripflix/admin build → cả hai Compiled successfully
```

Kiểm thật bằng Chrome (playwright-core, script để ngoài repo) trên admin `:3200`, web `:3100` → gateway `:8080` → core-api, Postgres, Redis thật, dùng tài khoản seed `superadmin@` / `moderator@tripflix.local` và một member mới đăng ký: **15/15 PASS**, chạy 3 lần liên tiếp.

```
(1)  superadmin đăng nhập admin → vào thẳng Tổng quan ở "/"
(2)  superadmin: 5 số liệu khớp API (đang hiện, ẩn, gỡ, tài khoản, nhân sự)
(3)  superadmin: có lối tắt và nhãn "Quản trị viên"
(4)  superadmin: menu có 6 mục
(5)  bài mới đăng: tối đa 5 bài
(6)  moderator: Tổng quan có 3 số liệu bài đăng, không có lối tắt
(7)  moderator: nhãn "Kiểm duyệt viên", lời chào đúng quyền
(8)  moderator: menu chỉ có Tổng quan và Kiểm duyệt
(9)  moderator mở /staff bằng link: bị chặn
(10) member vào admin: bị chặn, không thấy Tổng quan
(11) admin 390px: không tràn ngang
(12) web member: không có thẻ Khu vực quản trị
(13) web moderator: thẻ Khu vực quản trị, chữ kiểm duyệt viên, link sang :3200
(14) web superadmin: thẻ ghi quyền quản trị viên
(15) bấm "Mở trang quản trị" → sang app admin
```

Ghi chú: bấm Enter ở form đăng nhập (web, admin) trước khi trang chạy xong JavaScript thì trình duyệt gửi form kiểu HTML và tải lại `/login` (ô nhập trống, không lộ mật khẩu vì input không có `name`). Hành vi có từ trước, không do PR này; script kiểm thật chờ trang tải xong rồi mới điền.

## Cách kiểm lại

1. BE: `pnpm stack:infra`, `pnpm db:migrate`, `pnpm db:seed` (tạo `superadmin@`, `moderator@`, `member@tripflix.local`, mật khẩu `SEED_PASSWORD`), chạy core-api và gateway.
2. FE: `pnpm install`, `pnpm dev` (web `:3100`, admin `:3200`).
3. Đăng nhập admin bằng từng tài khoản seed, so sánh trang Tổng quan và menu; đăng nhập web, mở `/account`.

## Ảnh / video

- Đính kèm trong PR: Tổng quan superadmin, Tổng quan moderator, member bị chặn, superadmin màn hẹp 390px, web `/account` của member / moderator / superadmin. Không commit ảnh vào repo.

## Ảnh hưởng tới phần của người khác

- Có: `apps/admin` (`app/page.tsx`, `features/shell/nav.ts`, `features/shell/live-workspace.tsx`, `app/globals.css`; khung admin của Trang), `apps/web` (`live-account.tsx`, `globals.css`, `.env.example`), `packages/i18n`, `packages/app-core` (`getDemoAdminReturnPath`) — chủ: Thành. Đã báo Thành, Trang trước khi làm. Không đổi màn Kiểm duyệt, Nhân sự, Lịch trống; không đổi tên export.
