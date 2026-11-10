# TF059 — Trang chính sách bảo mật

- Notion: <dán link task TF059> · Nhánh: `dung/TF059-chinh-sach-bao-mat` · Người làm: Hoàng Đức Dũng (dùng AI: có) · Ngày: 2026-11-06

## Đã làm

- Thêm trang `/chinh-sach-bao-mat`. Google bắt buộc có link chính sách bảo mật trên tên miền đã khai báo (`tripflix.io.vn`) thì mới chuyển OAuth consent screen sang *In production*, nghĩa là mọi tài khoản Google đều đăng nhập được, không chỉ Test users.
- Nội dung viết theo dữ liệu hệ thống đang lưu, đã đối chiếu với schema `access`, `commerce`:
  - mật khẩu băm argon2id;
  - từ Google chỉ nhận mã định danh, email, tên;
  - thông tin cá nhân là tuỳ chọn;
  - với thẻ chỉ lưu 4 số cuối;
  - IP và thiết bị của từng phiên đăng nhập, nhật ký thao tác;
  - dịch vụ bên ngoài: Google (đăng nhập, Gmail, Google Cloud), AWS (ảnh, video), cổng thanh toán.
- Chữ trang để trong `packages/i18n/src/privacy.ts`. Footer mọi trang có link "Chính sách bảo mật".

## Đối chiếu "Xong khi"

| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Có trang chính sách bảo mật trên tên miền web | Có | `/chinh-sach-bao-mat` trả 200 trên dev server, đủ 6 mục |
| Dẫn tới được từ mọi trang | Có | Link trong footer (`app/layout.tsx`) |
| Dùng được làm "Application privacy policy link" trên Google Cloud | Sau khi deploy | `https://tripflix.io.vn/chinh-sach-bao-mat` |

## Kết quả kiểm tra

`pnpm turbo run lint typecheck test --filter=@tripflix/web --filter=@tripflix/i18n`: 5/5 task pass, i18n 2/2 test. Prettier sạch cho các file mới.

## Cách kiểm lại

1. `pnpm dev` rồi mở `http://localhost:3100/chinh-sach-bao-mat`.
2. Kéo xuống footer trang chủ, bấm "Chính sách bảo mật".

## Ảnh / video

- Chưa có, sẽ đính kèm trong PR.

## Ảnh hưởng tới phần của người khác

- Có: `apps/web/src/app/layout.tsx` (thêm một link trong footer) và `apps/web/src/features/discovery/ota-shell.module.css` (thêm `.footerLegal`). Chủ `apps/web` là Thành, footer do Bảo sửa gần nhất. Cần báo Thành và Bảo.
- Hai cam kết trong trang team phải làm được: xoá tài khoản khi nhận yêu cầu qua `tripflixandgo@gmail.com` (hiện xoá thủ công), và trả lời trong 7 ngày làm việc.
