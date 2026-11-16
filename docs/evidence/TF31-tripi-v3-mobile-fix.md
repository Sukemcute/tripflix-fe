# TF31 — Sửa đăng nhập và lịch sử chat Tripi trên Mobile

- Task TF31 · Nhánh `bao/TF31-tripi-v3-mobile-fix` · Người làm Bảo (dùng AI) · 2026-11-16

## Phản hồi từ PR #164

| Yêu cầu | Kết quả | Bằng chứng |
|---|---|---|
| Đăng nhập xong quay lại Tripi | Thêm `/assistant` vào tập đích hợp lệ. Giữ các đích quay lại hiện có | `mobile-login-return.test.ts` và đăng nhập thành công bằng tài khoản seed trên Expo Web |
| Bớt dữ liệu lưu trong SecureStore | Giữ text, kind, trip và trường tối thiểu để dựng tin. Trên native, bỏ lượt cũ khi JSON vượt 2.048 byte UTF-8. Hiện thông báo nếu lưu hoặc đọc gặp lỗi | `assistant-chat.test.ts` kiểm tra cả phiên cũ có thẻ, phiên dài chứa tiếng Việt và emoji, và trip vượt dung lượng |
| Chip cao tối thiểu 44 | Chip gợi ý và nút đăng nhập của Tripi dùng `mobileLayout.touchTarget` | Đo trên Expo Web, `height = 44` và `min-height = 44px` |
| Câu hỏi bị từ chối không vào lịch sử | Vẫn hiển thị trên màn hình. Bỏ cả câu hỏi bị từ chối và thông báo khỏi history gửi về AI và phiên lưu | `assistant-chat.test.ts` kiểm tra lượt tiếp theo và nội dung lưu |

## Kết quả kiểm tra

- `pnpm turbo run lint typecheck test build --affected` pass **15/15** tác vụ.
- `pnpm --filter @tripflix/app-core test` pass **159** test.
- `pnpm --filter @tripflix/mobile exec expo export --platform android` xuất thành công bundle Hermes.
- Expo Web local với seed Đà Lạt đã thấy Reel, chip gợi ý và trạng thái hết lượt khách. Bấm «Đăng nhập» mở `/login?returnTo=%2Fassistant`. Đăng nhập thành công quay lại `/assistant`, giữ cuộc chat đang mở và gửi tiếp được `Hii`.
- Tải lại `/assistant` sau đó vẫn thấy câu chào. Câu hỏi bị từ chối vì hết lượt và thông báo hết lượt đã được loại khỏi phiên khôi phục. Test tự động kiểm cả payload history gửi cho AI.

## Cách kiểm lại

1. Mở Tripi khi chưa đăng nhập, dùng hết lượt thử, bấm «Đăng nhập». Khi đăng nhập thành công, kiểm tra app quay về `/assistant` và phiên chat vẫn hiển thị.
2. Gửi một câu mới sau đăng nhập. So sánh payload `history` với màn hình, câu hỏi bị từ chối và thông báo hết lượt chỉ còn trên màn hình.
3. Với tài khoản đã đăng nhập, chat đủ dài, đóng và mở lại ứng dụng. Kiểm tra tin gần nhất và ngữ cảnh chuyến đi còn, thẻ và chip cũ không hiện sau khi mở lại phiên.

## Ảnh / video

Ảnh chụp Expo Web trong phiên kiểm thử gồm `tf31-expo-web-chip.jpg`, `tf31-expo-web-het-luot.jpg` và `tf31-expo-web-quay-lai-tripi.jpg`. Còn thiếu ảnh chạy trên thiết bị hoặc emulator Android.

## Ảnh hưởng

Follow-up theo phản hồi của chị Trang trên PR #164. Đổi `apps/mobile` và các hàm hỗ trợ không có giao diện trong `app-core`, thêm một câu thông báo trong `i18n`. Cần chị Trang review trước khi merge.
