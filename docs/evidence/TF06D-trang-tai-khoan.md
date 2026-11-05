# TF06D — Web: làm lại giao diện trang tài khoản

- Notion: <dán link task TF06D> · Nhánh: `dung/TF06D-trang-tai-khoan` · Người làm: Hoàng Đức Dũng (dùng AI: có) · Ngày: 2026-11-05
- Sửa thêm sau TF06A (#9), trước TF06B admin. Chỉ đổi giao diện trang `/account`, không đổi API hay luồng.

## Đã làm

- **Thẻ đầu trang**: avatar chữ cái đầu của tên, tên hiển thị, email, nhãn vai trò (Thành viên / Kiểm duyệt viên / Quản trị viên, dùng lại khoá chữ có sẵn), mascot bên phải trên màn rộng. Trước đây chỉ có `h1` và một dòng email.
- **Hàng tab gạch chân** (`.account-tabs`) thay cho nút lọc `filter-bar` + `secondary-button`; vẫn là `button` có `aria-pressed`, cuộn ngang trên màn hẹp.
- **Bố cục hai cột**: trái Hồ sơ + Thiết bị đang đăng nhập, phải Đổi mật khẩu, nên hai cột cao gần bằng nhau (trước đây Hồ sơ ngắn để lại khoảng trống lớn). Màn ≤ 900px: một cột theo thứ tự Hồ sơ → Đổi mật khẩu → Thiết bị.
- Câu "Chưa có thiết bị nào khác đang đăng nhập." khi danh sách thiết bị trống.
- Khoá chữ mới trong `packages/i18n`: `noDevices`, `accountSections` (nhãn cho hàng tab).
- CSS mới chỉ dùng biến trong `packages/tokens`; không đổi `.primary-button`, `.secondary-button`, `.filter-bar` (các trang khác đang dùng). Export `LiveAccount`, `AccountSecurity` giữ nguyên.

## Đối chiếu "Xong khi"

| Tiêu chí                                                     | Đạt | Bằng chứng                       |
| ------------------------------------------------------------ | --- | -------------------------------- |
| Phần đầu trang có danh tính rõ (avatar, tên, email, vai trò) | Có  | Kiểm thật (1), (2)               |
| Hàng tab dễ nhận ra mục đang chọn                            | Có  | Kiểm thật (3), (4), (9)          |
| Hai cột cân, không hở khoảng trống                           | Có  | Kiểm thật (5), ảnh desktop       |
| Chức năng cũ vẫn chạy: đổi tên, đổi mật khẩu, thiết bị       | Có  | Kiểm thật (6)–(8)                |
| Màn hẹp 390px: một cột, đúng thứ tự, không tràn              | Có  | Kiểm thật (10), (11), ảnh mobile |

## Kết quả kiểm tra

Chạy ngày 2026-11-05, Node 24.22.1, pnpm 10.32.1:

```
pnpm turbo run lint typecheck test --affected → 20/20 task pass, 0 cảnh báo lint
  api-client 25 test · app-core 34 · i18n 2 · tokens 1
```

Kiểm thật bằng Chrome (playwright-core, script để ngoài repo) trên web `:3100` → gateway `:8080` → core-api, Postgres, Redis thật: **11/11 PASS**.

```
(1)  thẻ đầu trang: avatar "K", tên, email, vai trò "Thành viên"
(2)  có mascot ở thẻ đầu trang (màn rộng)
(3)  hàng tab có 4 mục, "Tài khoản" đang chọn
(4)  tab đang chọn có gạch chân 2px
(5)  2 cột: Hồ sơ + Thiết bị bên trái, Đổi mật khẩu bên phải
(6)  đổi tên → tiêu đề và avatar đổi theo ("M")
(7)  đổi mật khẩu thành công
(8)  thiết bị hiện tại có nhãn "Thiết bị hiện tại"
(9)  bấm "Bài đăng của tôi" → tab đổi, thẻ tài khoản ẩn
(10) màn 390px: một cột theo thứ tự Hồ sơ → Đổi mật khẩu → Thiết bị
(11) màn 390px: không tràn ngang, mascot ẩn
```

## Cách kiểm lại

1. BE: `pnpm stack:infra`, `pnpm db:migrate`, chạy core-api và gateway (xem README `tripflix-be`).
2. FE: `pnpm install`, `pnpm dev`, đăng nhập ở `http://localhost:3100/login` rồi mở `/account`.
3. Thu nhỏ cửa sổ dưới 900px để xem bố cục một cột.

## Ảnh / video

- Đính kèm trong PR: trang tài khoản desktop (trước / sau), sau khi đổi tên + mật khẩu, tab "Bài đăng của tôi", màn hẹp 390px. Không commit ảnh vào repo.

## Ảnh hưởng tới phần của người khác

- Có: `apps/web/src/features/auth/live-account.tsx` (phần đầu trang và hàng tab, code ban đầu của Trang), `apps/web/src/app/globals.css`, `packages/i18n` (chủ: Thành). Đã báo Thành, Trang trước khi làm. Nội dung các tab Bài đăng / Bài đã lưu / Chia sẻ trải nghiệm không đổi.
