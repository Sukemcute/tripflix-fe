# TF06H — Web: góc tài khoản trên header

- Notion: <dán link task TF06H> · Nhánh: `dung/TF06H-header-tai-khoan` · Người làm: Hoàng Đức Dũng (dùng AI: có) · Ngày: 2026-11-06
- Không đổi API BE.

## Vấn đề

- Góc phải header là nút "Tìm nơi ở" màu cam, trùng đích (`/#content`) với link "Khách sạn" trên menu.
- Không biết mình đang đăng nhập bằng tài khoản nào; muốn đăng xuất phải vào `/account`.
- Lỗi do TF06D (#10): nhãn vai trò nằm chung thẻ `<p>` với email trên `/account`, nên `getByText(email, { exact: true })` trong `tests/pages/commerce-page.cjs` (bước kiểm đăng nhập xong) không còn tìm thấy email.

## Đã làm

- **Header** (`app/layout.tsx`): bỏ nút "Tìm nơi ở" và link "Tài khoản" trên menu; góc phải là `HeaderAccount` (client component mới `features/auth/header-account.tsx`):
  - Chưa đăng nhập: link "Đăng nhập" (là link, không phải button, để không trùng với nút "Đăng nhập" mà test e2e tìm trên `/login`).
  - Đã đăng nhập: nút avatar chữ cái + tên + mũi tên; bấm mở menu (disclosure, `aria-expanded`, `aria-controls`, chỉ render khi mở): tên, email, Tài khoản, Bài đăng của tôi, Mở trang quản trị (chỉ moderator, superadmin; `NEXT_PUBLIC_ADMIN_URL`), Đăng xuất.
  - Đóng menu: bấm một mục, bấm ra ngoài, Esc (trả focus về nút), sang trang khác (lưu trang lúc mở menu, không dùng effect).
  - Đăng xuất → về trang chủ. Đang tải phiên: giữ chỗ cùng kích thước để header không giật.
  - Màn ≤ 640px: chỉ hiện avatar.
- **`/account?tab=`**: `app/account/page.tsx` đọc `?tab=` (`readAccountTab` trong file thường `account-tabs.ts`), `LiveAccount` nhận `initialTab`; `key` theo tab nên đang ở `/account` bấm "Bài đăng của tôi" vẫn mở đúng tab.
- **Sửa lỗi TF06D**: email trên `/account` nằm trong `<span>` riêng.
- Dùng chung `ADMIN_URL`, `isStaffRole`, `getInitial` trong `features/auth/account-helpers.ts` (trước đây nằm trong `live-account.tsx`).
- CSS: bỏ `.ota-header-cta`, thêm `.header-account*`, `.header-login`, chỉ dùng biến trong `packages/tokens`. Khoá chữ mới `accountMenu`.

## Đối chiếu "Xong khi"

| Tiêu chí                                        | Đạt | Bằng chứng             |
| ----------------------------------------------- | --- | ---------------------- |
| Bỏ nút "Tìm nơi ở", góc phải là tài khoản       | Có  | Kiểm thật (1), (2)     |
| Menu theo vai trò (nhân viên có Trang quản trị) | Có  | Kiểm thật (4), (9)     |
| Menu đóng đúng lúc, dùng được bằng bàn phím     | Có  | Kiểm thật (5)–(7)      |
| Đăng xuất từ header                             | Có  | Kiểm thật (8)          |
| Test e2e commerce tìm thấy email sau đăng nhập  | Có  | Kiểm thật (3)          |
| Màn hẹp không tràn                              | Có  | Kiểm thật (10) ở 390px |

## Kết quả kiểm tra

Chạy ngày 2026-11-06, Node 24.22.1, pnpm 10.32.1:

```
pnpm turbo run lint typecheck test --affected → 20/20 task pass; mọi gói "Found 0 warnings and 0 errors"
node tools/check-boundaries.mjs → "Luật FE: không có vi phạm."
pnpm --filter @tripflix/web build → Compiled successfully (/account thành trang động vì đọc ?tab=)
```

Kiểm thật bằng Chrome (playwright-core, script để ngoài repo) trên web `:3100` → gateway `:8080` → core-api thật, tài khoản seed `member@`, `moderator@tripflix.local`: **10/10 PASS**.

```
(1)  chưa đăng nhập: góc phải là link "Đăng nhập", không còn "Tìm nơi ở" và link "Tài khoản"
(2)  member: nút avatar + tên, menu đang đóng
(3)  getByText(email, exact) tìm thấy đúng 1 chỗ (như tests/pages/commerce-page.cjs)
(4)  member mở menu: Tài khoản, Bài đăng của tôi (không có Trang quản trị), Đăng xuất
(5)  Esc đóng menu, focus về nút
(6)  bấm ra ngoài đóng menu
(7)  "Bài đăng của tôi" mở đúng tab, menu đóng; "Tài khoản" về lại tab Tài khoản
(8)  Đăng xuất → về trang chủ, góc phải là "Đăng nhập"
(9)  moderator: menu có "Mở trang quản trị" trỏ sang admin
(10) màn 390px: chỉ hiện avatar, menu nằm trong màn hình, không tràn ngang
```

Lỗi tìm ra khi kiểm thật và đã sửa: từ `/account` bấm "Bài đăng của tôi" (`/account?tab=mine`, cùng pathname) thì menu không đóng; nay bấm mục nào trong menu cũng đóng.

## Cách kiểm lại

1. BE, FE chạy như README.
2. Mở `http://localhost:3100` khi chưa đăng nhập, rồi đăng nhập `member@` và `moderator@tripflix.local`, bấm vào tên ở góc phải.

## Ảnh / video

- Đính kèm trong PR: header trước / sau, menu member, menu moderator, màn hẹp 390px. Không commit ảnh vào repo.

## Ảnh hưởng tới phần của người khác

- Có: `apps/web/src/app/layout.tsx` (header do Trang làm), `apps/web/src/app/globals.css`, `apps/web/src/app/account/page.tsx`, `apps/web/src/features/auth/live-account.tsx`, `packages/i18n` (chủ: Thành). Đã báo Thành, Trang trước khi làm. Không đổi tên export; khoá chữ `otaFindStay` để nguyên.
