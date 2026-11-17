# TF47B — Tab "Tôi" là trang cá nhân

- Notion: (chưa có) · Nhánh: `dung/TF47B-tab-toi-la-trang-ca-nhan` · Người làm: Dũng (dùng AI: có) · Ngày: 2026-11-17

## Đã làm
- Bấm tab "Tôi" trên mobile mở trang cá nhân của chính mình kiểu TikTok (giống trang cá nhân công khai TF47:
  avatar, tên, đang theo dõi, người theo dõi, lượt thích, lưới video/bài viết; không có nút Theo dõi).
- Góc phải trang có nút bánh răng mở trang "Cài đặt" (route mới `/settings`), chứa các mục cũ của tab Tôi:
  chuyến đi của tôi, đã lưu, trạng thái kiểm duyệt, chia sẻ chuyến đi, thông báo, trợ giúp, cài đặt tài khoản.
- Chưa đăng nhập thì tab Tôi hiện thông báo cần đăng nhập và nút Đăng nhập; đăng nhập xong quay về tab Tôi.
- Dùng lại `PublicProfileScreen` (tách phần thân thành `ProfileView`), `RequireAccount`, `LiveProfileScreen`;
  thêm 1 chuỗi `vi.mobile.profile.menu`. Không thêm thư viện.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Tab Tôi hiện trang cá nhân của người dùng | Có | Cùng màn với `/user/[id]` (TF47, đã chạy trên API thật); ảnh Android bổ sung trong PR |
| Bánh răng mở các mục còn lại | Có | `/settings` trên Expo web: tiêu đề "Cài đặt", nút quay lại, đủ các mục cũ |
| Chưa đăng nhập thì bắt đăng nhập | Có | Expo web chưa đăng nhập: tab Tôi hiện "Đăng nhập để tiếp tục" + nút Đăng nhập |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`: 22/22 task pass; không có cảnh báo lint ở file của TF47B.

## Cách kiểm lại
1. `pnpm --filter @tripflix/mobile start -c`, mở tab Tôi khi chưa đăng nhập rồi khi đã đăng nhập, bấm bánh răng.

## Ảnh / video
- Ảnh Android: bổ sung trong PR.

## Ảnh hưởng tới phần của người khác
- Có: `apps/mobile/src/features/account/*`, `app/(tabs)/me.tsx` (mobile, chủ Trang). Cần báo Trang.
