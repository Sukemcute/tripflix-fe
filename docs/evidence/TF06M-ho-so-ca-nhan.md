# TF06M — Web: trang tài khoản dạng hồ sơ

- Notion: <dán link task TF06M> · Nhánh: `dung/TF06M-ho-so-ca-nhan` · Người làm: Hoàng Đức Dũng (dùng AI: có) · Ngày: 2026-11-06
- Cần PR BE `tripflix-be` `dung/TF06M-ho-so-ca-nhan` (thêm thông tin cá nhân vào `GET/PATCH /auth/me`) merge trước; api-client trong PR này đã sinh lại từ hợp đồng đó.

## Đã làm

- **Bố cục mới `/account`**: cột trái (dính khi cuộn) có avatar chữ cái, tên (heading), nhãn vai trò, menu có biểu tượng: Thông tin cá nhân · Bảo mật & thiết bị · Bài đăng của tôi · Bài đã lưu · Chia sẻ trải nghiệm · Mở trang quản trị (chỉ nhân viên) · Đăng xuất. Bên phải là nội dung mục đang chọn. `?tab=` mở sẵn mục (`profile`, `security`, `mine`, `bookmarks`, `create`).
- **Thông tin cá nhân** (`features/auth/account-profile.tsx`): mặc định chỉ xem, 6 ô dạng thẻ (Tên hiển thị, Số điện thoại, Ngày sinh, Giới tính, Quốc tịch, Email có khoá), trống thì "—". Bấm **Chỉnh sửa** (nút cam `.primary-button` theo thống nhất của nhóm) → ô nhập: điện thoại `tel`, ngày sinh `date` (không chọn ngày tương lai), giới tính và quốc tịch dạng chọn (tên nước lấy từ `Intl.DisplayNames` tiếng Việt). **Lưu thay đổi** chỉ gửi trường đã đổi (để trống là xoá), **Hủy** bỏ thay đổi. Lỗi 400 của BE hiện dưới đúng ô. Đổi tên thì header cập nhật theo (`session.reloadUser()`).
- **Bảo mật & thiết bị**: thẻ Đổi mật khẩu và Thiết bị đang đăng nhập cũ (`AccountSecurity`) chuyển vào mục này, chức năng giữ nguyên. Bỏ `ProfilePanel` cũ (sửa tên nay ở Thông tin cá nhân).
- **Chia sẻ trải nghiệm** (`features/social/post-composer.tsx`, thay `CreateDraft` cũ): câu dẫn, hộp thông báo ảnh/video, tiêu đề có đếm ký tự, nội dung có gợi ý, **hashtag** mới (tách theo dấu phẩy / khoảng trắng, bỏ `#`, chữ thường, không trùng, tối đa 10, xem trước dạng thẻ; gửi `hashtags` khi tạo và khi sửa bản nháp), dòng giải thích bản nháp. Nhãn "Tiêu đề", "Nội dung", nút "Lưu bản nháp", câu "Bản nháp đã được lưu…", link "Xem chi tiết" giữ nguyên.
- **Ô nhập trong trang tài khoản nền trắng** (đổi mật khẩu, chia sẻ trải nghiệm), viền, focus viền cam; nút vẫn cam. Trang đăng nhập chưa đổi.
- Bỏ phần đầu trang, hàng tab và thẻ "Khu vực quản trị" cũ (thành mục menu); dọn 30 rule CSS không còn dùng (`.account-hero`, `.account-tabs`, `.account-admin`, `.account-grid`…). CSS mới `.profile-*` chỉ dùng biến trong `packages/tokens`.
- Email chỉ xuất hiện một lần trên trang (ô Email), để `tests/pages/commerce-page.cjs` (`getByText(email, { exact: true })`) vẫn tìm được.
- **Cập nhật `tests/e2e/api-integration.cjs`** bước "Đổi hồ sơ, mật khẩu và thu hồi phiên": bấm "Chỉnh sửa", sửa tên + số điện thoại, sang "Bảo mật & thiết bị", nhập lại mật khẩu, chờ đúng câu "Đã đổi mật khẩu…", tìm thiết bị theo `listitem`, xác nhận "Đăng xuất tất cả". Đoạn cũ đã lệch giao diện từ TF06A (chờ "Đã lưu thay đổi." sau khi đổi mật khẩu, tìm tên thiết bị dạng heading).
- api-client sinh lại (`pnpm --filter @tripflix/api-client gen`): chỉ đổi `auth/auth.ts`, `MyProfileDto`, `UpdateProfileDto`. Khoá chữ mới `profile*`, `phone`, `dateOfBirth`, `gender*`, `nationality*`, `emailLocked`, `accountNav*`.

## Kết quả kiểm tra

Chạy ngày 2026-11-06, Node 24.22.1, pnpm 10.32.1, BE chạy nhánh TF06M:

```
pnpm turbo run lint typecheck test --affected → 20/20 task pass; mọi gói "Found 0 warnings and 0 errors"
node tools/check-boundaries.mjs → "Luật FE: không có vi phạm."
pnpm --filter @tripflix/web build → Compiled successfully
node --check tests/e2e/api-integration.cjs → OK
```

Kiểm thật bằng Chrome (playwright-core, script để ngoài repo), tài khoản test mới: **11/11 PASS**.

```
(1)  xem: 6 ô, trường trống hiện "—", chưa có ô nhập
(2)  cột trái: avatar, tên (heading), vai trò, menu 6 mục; email chỉ xuất hiện 1 lần
(3)  nhập sai số điện thoại và ngày sinh (5 tuổi): lỗi hiện dưới đúng 2 ô, vẫn ở chế độ sửa
(4)  Hủy: về chế độ xem, không lưu
(5)  lưu tên, điện thoại (0912 345 678 → 0912345678), ngày sinh, giới tính, quốc tịch; tải lại vẫn còn; header đổi tên
(6)  để trống giới tính rồi lưu: về "—"
(7)  mục "Bảo mật & thiết bị": đổi mật khẩu được
(8)  ?tab=security; đăng xuất thiết bị khác → token đó nhận 401
(9)  menu header "Bài đăng của tôi" → mục đó đang chọn
(10) Đăng xuất mọi thiết bị → trang tài khoản khi chưa đăng nhập
(11) 390px: cột trái lên trên, ô xếp 1 cột, không tràn ngang
```

(5)–(10) đi đúng các bước đã cập nhật trong `tests/e2e/api-integration.cjs`.

Phần 2 (ô nền trắng, Chia sẻ trải nghiệm): **5/5 PASS** — ô đổi mật khẩu nền rgb(255, 255, 255), focus viền cam, nút cam; đếm ký tự, hashtag xem trước; đúng các bước "Lưu bản nháp" của test e2e; mở bài thấy nhãn Bản nháp và đúng hashtag đã lưu (bài thử đã xoá); 390px không tràn.

Kiểm lại các phần cũ trên trang mới: TF06F (chưa đăng nhập) 8/8, TF06G (thu gọn thiết bị) 8/8, TF06H (menu tài khoản header) 10/10.

Lỗi tìm ra khi kiểm và đã sửa: ở 390px hàng menu cuộn ngang kéo rộng cột lưới (thêm `minmax(0, 1fr)`, `min-width: 0`); ô xem không hiện giá trị khi `children` là `false`; 2 cảnh báo lint (`new Date()` trong render, `role="img"` trên svg).

## Ảnh / video

- Đính kèm trong PR: trước (trang tài khoản cũ), sau: xem, sửa, lỗi từng ô, đã lưu, Bảo mật & thiết bị (ô nền trắng), Chia sẻ trải nghiệm (trước / sau lưu), 390px. Không commit ảnh vào repo.

## Ảnh hưởng tới phần của người khác

- Có: `apps/web/src/features/auth/live-account.tsx`, `account-security.tsx`, `account-tabs.ts`, `apps/web/src/app/globals.css`, `packages/i18n`, `packages/api-client/src/generated` (sinh tự động), `tests/e2e/api-integration.cjs` (chủ: Thành). Đã báo Thành trước khi làm.

## Cập nhật: Chuyến đã đặt trong trang tài khoản, khung chung cho các mục

- Nhánh `dung/TF06M-chuyen-da-dat-trong-tai-khoan` · 2026-11-06
- Thêm mục "Chuyến đã đặt" ở cột trái `/account`, ngay dưới "Bảo mật & thiết bị", mở bằng `?tab=bookings`. Trong menu tài khoản trên header, mục "Chuyến đã đặt" trỏ về `/account?tab=bookings`. Trang `/bookings` vẫn giữ nguyên.
- Tách `BookingsList` khỏi `BookingsScreen` để dùng ở cả `/bookings` và trang tài khoản. Cách tải đơn, phân trang và hiển thị không đổi.
- Thay khung báo "Bạn chưa có chuyến đi nào." bằng khối trạng thái trống có icon, dòng mô tả và nút "Tìm khách sạn" vừa với nội dung.
- Các mục Bảo mật & thiết bị, Chuyến đã đặt, Bài đăng của tôi và Bài đã lưu dùng chung khung với "Thông tin cá nhân": thẻ `profile-card` và phần đầu `profile-card-header` có tiêu đề cùng dòng mô tả. Thêm `AccountSection` trong `live-account.tsx`.
- Kiểm tra: `pnpm turbo run lint typecheck test --filter=@tripflix/web --filter=@tripflix/i18n`, 5/5 task pass, i18n 2/2 test. Web dev server trả 200 cho `/account?tab=bookings|security|mine` và `/bookings`. Chưa chụp ảnh giao diện, chưa có test giao diện vì web chưa có test runner.
- Ảnh hưởng: `apps/web/src/features/checkout/bookings-screen.tsx` và link trong `header-account.tsx` (Thắng). Các file `apps/web` khác thuộc phần của Thành. Cần báo Thắng và Thành trước khi mở PR.
