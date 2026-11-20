# TF31 — Thu gọn thẻ và lời chờ Tripi trên web

- Nhánh `bao/TF31-tripi-chat-web`.
- Đồng bộ với `origin/develop` tại `4cb5701d`.

## Thay đổi

- Tripi hiển thị “Đợi Tripi suy nghĩ xíu nghen…”. Sau 1,8 giây, nếu vẫn đang chờ, lời nhắn chuyển một lần sang “Xíu nữa thôi nha…”.
- Thẻ Nên mang theo, Thời tiết, Chỗ ở và Vé máy bay canh hai mép với bong bóng trả lời. Tiêu đề dùng cỡ 13–14 px, còn chi tiết và giá dùng cỡ 11–12 px.
- Kết quả xử lý xung đột giữ kiểu chữ bong bóng và lưới ba video mỗi hàng từ `develop`. Lưới video nhận chiều rộng trực tiếp từ cột chung với bong bóng.

## Kiểm tra

- Edge trên web local với khung 1.280 px và 320 px. Dữ liệu chat mẫu bao gồm bốn loại thẻ và bốn video. Các thẻ khớp chiều rộng bong bóng ở cả câu trả lời dài và ngắn, thứ tự video xuống hàng sau ba ô và không có cuộn ngang.
- Gửi “hello” với phản hồi mẫu trì hoãn 5 giây để xác nhận hai lời chờ xuất hiện theo thứ tự, chỉ chuyển một lần và biến mất khi có câu trả lời.
- `corepack pnpm turbo run lint typecheck test build --affected` đạt 14/14 tác vụ. Web có 572 bài kiểm thử đạt.
- `node tools/check-boundaries.mjs` và `git diff --check` đều đạt.

## Ảnh kiểm tra

- Ảnh chụp Edge tại máy kiểm tra có tên `tripi-web-merged-1280.png`, `tripi-web-merged-320.png` và `tripi-web-merged-booking.png`.
