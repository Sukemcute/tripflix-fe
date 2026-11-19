# TFxx — Nền mặt nước tĩnh cho trang Cảm hứng

- Notion: (chưa có) · Nhánh: `dung/TFxx-nen-trang-cam-hung` · Người làm: Dũng (dùng AI: có) · Ngày: 2026-11-19

## Đã làm
- Trang Cảm hứng (`/inspiration`) dùng lại nền mặt nước của trang chủ (`LivingBackground`) nhưng đứng yên: không chạy animation, không theo chuột, không đổi cảnh khi cuộn.
- `LivingBackground` thêm prop `isStatic`: đi theo nhánh reduced-motion sẵn có, khoá ở cảnh đầu (Vịnh Hạ Long), bỏ mọi listener cuộn/chuột/bàn phím và nút "chạm vào nước". Chỉ vẽ lại khi đổi kích thước cửa sổ. Trang chủ không đổi.
- `feedPageWrapper` bỏ nền xám `#F8FAFC` để lộ mặt nước; hàng tab "Dành cho bạn / Thịnh hành…" có lớp kính mờ (`--water-glass`) để chữ vẫn dễ đọc.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Nền Cảm hứng giống trang chủ | Có | Ảnh sau (desktop + mobile) |
| Nền cố định, không chuyển động | Có | So hash canvas trước/sau khi rê chuột 20 lần + chờ 2,5s + cuộn: không đổi |
| Trang chủ vẫn động như cũ | Có | Hash canvas trang chủ thay đổi sau 0,8s; nút tương tác mặt nước vẫn còn |
| Chữ, thẻ dễ đọc, mobile | Có | Ảnh mobile 375px |
| Lint/typecheck/test web | Có | Xem bên dưới |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/web...`: lint 0 lỗi (27 cảnh báo có sẵn), typecheck pass, test web 38 file / 253 test pass.

## Cách kiểm lại
1. `pnpm --dir apps/web dev`, mở `/inspiration`: nền mặt nước, rê chuột/cuộn không thay đổi.
2. Mở `/`, cuộn xuống dưới ô tìm kiếm: mặt nước vẫn động, vẫn chạm/thả mồi được.

## Ảnh / video
- Ảnh trước/sau desktop 1366px và mobile 375px đính kèm trong PR.

## Ảnh hưởng tới phần của người khác
- Có: `apps/web` (chủ: Thành) — `features/discovery/LivingBackground.tsx`, `home-screen.tsx`, `features/social/feed/social-feed.module.css`, `social-feed-view.tsx`. Chỉ thêm prop tuỳ chọn và đổi nền wrapper trang Cảm hứng; cần Thành duyệt.
