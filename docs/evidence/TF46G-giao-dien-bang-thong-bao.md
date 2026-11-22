# TF46G — Giao diện bảng thông báo web kiểu avatar

- Notion: — · Nhánh: `dung/TF46G-giao-dien-bang-thong-bao` · Người làm: Dũng (dùng AI: có) · Ngày: 2026-11-17

## Đã làm
- Bảng thả xuống ở chuông trên header web, mỗi dòng có avatar giống Facebook:
  - Thông báo của Tripflix (kiểm duyệt, đơn, video): logo `tripflix-gmail-avatar-icon.svg`.
  - Thông báo từ người khác (`comment.*`, `reaction.*`, `follow.*`): chữ cái đầu tên, màu theo `getAvatarTone`, góc có huy hiệu loại (bình luận / thích / theo dõi).
- Thời gian tương đối ("5 phút trước", "Hôm qua") dùng `getNotificationAge` của `app-core`. Chia nhóm Hôm nay / Trước đó.
- Bỏ nút "Đánh dấu đã đọc hết": mở chuông là gọi `markAllRead` có sẵn, nên số trên chuông về 0. Các dòng chưa đọc lúc mở vẫn được nhấn (nền teal nhạt, chấm teal) tới lần mở sau.
- Bỏ nền hồng cho dòng chưa đọc, đổi sang thanh cuộn mỏng. Màu lấy từ biến token có sẵn, chữ để trong `packages/i18n` (`api.notifications*`).
- Không đổi API, dữ liệu thông báo hay thư viện.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Bảng thông báo đồng bộ phong cách web, có avatar/icon mỗi dòng | Có | Ảnh trong PR |
| Mở chuông là số chưa đọc về 0, dòng chưa đọc vẫn nổi bật | Có | `header-notifications.tsx` (`openPanel`), ảnh trong PR |
| Thông báo Tripflix dùng logo Tripflix | Có | `notification-look.test.ts` (nhóm `tripflix`) |

## Kết quả kiểm tra
`pnpm turbo run lint typecheck test --affected`:
- web: lint 0 lỗi, typecheck pass, 123/123 test pass (có 2 test mới ở `notification-look.test.ts`).
- admin 18/18, api-client 233/233, app-core 187/187, i18n 2/2, tokens 1/1.
- `@tripflix/mobile#typecheck` fail ở `public-profile-screen.tsx` (route `/user-reels`). Lỗi này có sẵn trên develop, không do nhánh này gây ra.

## Cách kiểm lại
1. `pnpm --filter @tripflix/web dev`, đăng nhập, cần có vài thông báo chưa đọc.
2. Bấm chuông: số về 0, các dòng chưa đọc có nền teal nhạt và chấm teal.
3. Đóng rồi mở lại: các dòng đó trở về bình thường.

## Ảnh / video
- Trước: ảnh trong PR. Sau: bổ sung vào PR.

## Ảnh hưởng tới phần của người khác
- Có: `apps/web` (Thành). Đã báo trong PR, cần Thành duyệt. Từ giờ mở chuông trên web là server đánh dấu đã đọc, nên trang thông báo mobile (Trang) cũng thấy các thông báo đó là đã đọc.
