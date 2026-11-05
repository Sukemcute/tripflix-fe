# TF06F — Web: trang tài khoản khi chưa đăng nhập

- Notion: <dán link task TF06F> · Nhánh: `dung/TF06F-tai-khoan-chua-dang-nhap` · Người làm: Hoàng Đức Dũng (dùng AI: có) · Ngày: 2026-11-06
- Làm tiếp sau TF06D (#10), TF06E (#11). Không đổi API BE.

## Vấn đề

Mở `/account` khi chưa đăng nhập chỉ thấy một nút "Đăng nhập để tiếp tục" nằm trơ trọi, không giải thích trang này để làm gì, không có lối tạo tài khoản; lúc đang tải chỉ có một dòng chữ.

## Đã làm

- **Thẻ "chưa đăng nhập"** (`AccountGuest` trong `live-account.tsx`): nền warm-mist như phần đầu trang tài khoản, tiêu đề "Đăng nhập để xem tài khoản của bạn", câu giải thích, các lợi ích (dùng lại `vi.api.authBenefits` của trang đăng nhập), mascot, hai nút:
  - "Đăng nhập" → `/login?returnTo=/account`
  - "Tạo tài khoản" → `/login?mode=register&returnTo=/account`
  - Xong cả hai đều quay về `/account`.
- **`/login?mode=register`** mở sẵn tab Tạo tài khoản: `LiveLogin` nhận thêm prop `initialMode` (mặc định `login`), `app/login/page.tsx` đọc `?mode=`. Giá trị khác `register` thì vẫn là tab Đăng nhập.
- **Lúc đang tải**: thẻ "Đang tải…" cùng khung (cao 320px, `aria-busy`), trang không bị giật khi nội dung hiện ra.
- **Màn hẹp** (≤ 640px): một cột, ẩn mascot, hai nút đủ chiều ngang; lợi ích ẩn từ ≤ 900px như trang đăng nhập.
- Khoá chữ mới: `accountGuestTitle`, `accountGuestBody`. CSS `.account-guest*` chỉ dùng biến trong `packages/tokens`.
- Không đổi các nút "Đăng nhập để tiếp tục" ở trang bài đăng; không đổi tên export.

## Đối chiếu "Xong khi"

| Tiêu chí                                                                | Đạt | Bằng chứng            |
| ----------------------------------------------------------------------- | --- | --------------------- |
| Chưa đăng nhập: hiểu trang để làm gì, có lối đăng nhập và tạo tài khoản | Có  | Kiểm thật (1)–(3)     |
| "Tạo tài khoản" mở đúng tab, xong quay về `/account`                    | Có  | Kiểm thật (4), (5)    |
| "Đăng nhập" xong quay về `/account`                                     | Có  | Kiểm thật (6)         |
| Lúc đang tải không trống trơn                                           | Có  | Kiểm thật (7)         |
| Màn hẹp không tràn                                                      | Có  | Kiểm thật (8) ở 390px |

## Kết quả kiểm tra

Chạy ngày 2026-11-06, Node 24.22.1, pnpm 10.32.1:

```
pnpm turbo run lint typecheck test --affected → 20/20 task pass, 0 cảnh báo lint
node tools/check-boundaries.mjs → "Luật FE: không có vi phạm."
pnpm --filter @tripflix/web build → Compiled successfully
```

Kiểm thật bằng Chrome (playwright-core, script để ngoài repo) trên web `:3100` → gateway `:8080` → core-api, Postgres, Redis thật: **8/8 PASS**.

```
(1) /account chưa đăng nhập: thẻ có tiêu đề, câu giải thích, lợi ích
(2) hai nút Đăng nhập / Tạo tài khoản, link quay về /account
(3) có mascot trên màn rộng
(4) bấm "Tạo tài khoản" → /login, tab Tạo tài khoản đang chọn
(5) đăng ký xong quay về /account, thấy tài khoản mới
(6) bấm "Đăng nhập" → tab Đăng nhập, xong quay về /account
(7) lúc đang tải: thẻ "Đang tải…" cùng khung (cao 320px)
(8) màn 390px: không tràn ngang, mascot ẩn, 2 nút đủ chiều ngang
```

## Cách kiểm lại

1. BE: `pnpm stack:infra`, `pnpm db:migrate`, chạy core-api và gateway (xem README `tripflix-be`).
2. FE: `pnpm install`, `pnpm dev`, mở `http://localhost:3100/account` trong cửa sổ ẩn danh (chưa đăng nhập).
3. Bấm "Tạo tài khoản" / "Đăng nhập", làm xong phải quay về `/account`.

## Ảnh / video

- Đính kèm trong PR: trước (desktop, mobile), sau (desktop, mobile), `/login?mode=register`, lúc đang tải. Không commit ảnh vào repo.

## Ảnh hưởng tới phần của người khác

- Có: `apps/web/src/features/auth/live-account.tsx`, `apps/web/src/app/login/page.tsx`, `apps/web/src/app/globals.css`, `packages/i18n` (chủ: Thành). Đã báo Thành trước khi làm. `login-form.tsx` (TF06A, của Dũng) chỉ thêm prop có giá trị mặc định.
