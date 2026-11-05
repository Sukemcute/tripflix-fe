# TF06L — Web + admin: đổi màu nhấn từ cam sang teal

- Notion: <dán link task TF06L> · Nhánh: `dung/TF06L-tong-mau-xanh` · Người làm: Hoàng Đức Dũng (dùng AI: có) · Ngày: 2026-11-06
- Chỉ CSS của web và admin. Không đổi `packages/tokens`, `packages/ui-web`, mobile (làm PR riêng với Trang nếu cần).

## Đã làm

- Màu nhấn dùng `--color-teal-ink` (#006C63), cùng màu nút "Tìm phòng trống" ở khung tìm kiếm trang chủ; rê chuột: `color-mix(in srgb, var(--color-teal-ink) 78%, var(--color-ink))` (đậm hơn, không ghi cứng mã màu).
- **Web** (`apps/web/src/app/globals.css`): `.primary-button` (+ hover), `.header-account-avatar`, `.account-avatar`, `.account-tabs` tab đang chọn, `.auth-link`, `.trip-card-bottom strong`, `.hero-caption a`, `.post-cover-badge`, menu header khi rê chuột.
- **Thẻ trải nghiệm trang chủ** (`ota-hero.module.css`): 2 thẻ cam → `--color-teal` (#00B2A3, chữ ink), thẻ giữa vẫn teal-ink: hai tông teal xen kẽ.
- **Admin** (`apps/admin/src/app/globals.css`): `.admin-primary` (+ hover).
- **Giữ đỏ cam** cho báo lỗi / thao tác nguy hiểm: `.auth-error`, `.account-confirm`, `.header-account-logout`, `.comment-link.is-danger`, `.post-draft`, `.admin-error`, `.admin-overview-reports`.

## Kết quả kiểm tra

Chạy ngày 2026-11-06 (đã merge `develop` có TF06K #21), Node 24.22.1, pnpm 10.32.1:

```
pnpm turbo run lint typecheck test --affected → 20/20 task pass; mọi gói "Found 0 warnings and 0 errors"
node tools/check-boundaries.mjs → "Luật FE: không có vi phạm."
pnpm --filter @tripflix/web --filter @tripflix/admin build → cả hai Compiled successfully
```

Kiểm thật bằng Chrome (playwright-core, script để ngoài repo): quét `getComputedStyle` mọi phần tử đang hiện (nền, chữ, viền dưới) tìm màu cam (#BC331E, #FF5A3C, #FF7B60) trên trang chủ, Cảm hứng, đăng nhập, bài viết, tài khoản, menu tài khoản, admin đăng nhập, admin Tổng quan / Nhân sự / Lịch trống: **14/14 PASS**.

```
10 trang/trạng thái: không còn màu cam ở màu nhấn (chỉ còn nút "Đăng xuất" trong menu — thao tác nguy hiểm, được giữ)
nút chính web: rgb(0, 108, 99), chữ trắng 6.3:1; rê chuột đậm hơn, 7.8:1
nút chính admin: rgb(0, 108, 99)
ô báo lỗi đăng nhập vẫn đỏ cam rgb(188, 51, 30)
thẻ trải nghiệm trang chủ: rgb(0, 178, 163) 6.0:1 · rgb(0, 108, 99) 6.3:1 · rgb(0, 178, 163) 6.0:1
```

Kiểm lại TF06K sau khi merge `develop`: 10/10 PASS.

## Chưa đổi (để nhóm quyết)

- Nền ấm `--color-warm-mist` (hồng cam rất nhạt) vẫn dùng ở khung lời chào trang đăng nhập, phần đầu trang tài khoản, nền ô nhập; mobile vẫn tông cam; `packages/ui-web` `Button` (`bg-coral`, chưa app nào dùng).

## Ảnh / video

- Đính kèm trong PR: trước / sau của trang chủ, Cảm hứng, đăng nhập, bài viết, tài khoản, admin đăng nhập, admin Nhân sự. Không commit ảnh vào repo.

## Ảnh hưởng tới phần của người khác

- Có: `apps/web/src/app/globals.css`, `apps/web/src/features/discovery/ota-hero.module.css` (thiết kế Figma của Trang), `apps/admin/src/app/globals.css` (chủ: Thành). Đã báo Thành, Trang trước khi làm.
