# TF31 — Hiện từng từ trong câu trả lời Tripi trên web

- Nhánh `bao/TF31-tripi-word-reveal`.
- Đồng bộ với `origin/develop` tại `3016a53d`, merge sạch.

## Thay đổi

- Khi nhận câu trả lời, web hiện một từ mỗi 150 ms. Từ mới hiện rõ dần, bong bóng giữ cùng chiều rộng và khung chat cuộn êm nếu người đọc đang theo dõi câu trả lời.
- Trình duyệt bật giảm chuyển động sẽ hiện ngay toàn bộ câu trả lời. Lịch sử chat luôn giữ nội dung đầy đủ, kể cả khi người dùng gửi tiếp trong lúc chữ đang hiện.
- Ẩn thẻ bài viết dạng hàng. Reels, chỗ ở, vé máy bay và các thẻ thông tin xuất hiện khi câu trả lời đã hiện xong.

## Kiểm chứng giao diện

- Edge với dữ liệu chat mẫu đo được khoảng 150 ms giữa hai từ, chiều rộng bong bóng ổn định trong suốt đoạn trả lời và tự cuộn êm khi câu trả lời xuống dòng trong khung chat thấp.
- Kiểm tra phản hồi có thẻ bài viết, Reels và khách sạn, phản hồi chỉ có thẻ bài viết, gửi tiếp trong lúc Tripi đang hiện chữ và chế độ giảm chuyển động.
- Ảnh chụp local có tên `tripi-web-reveal-and-cards.png` và `tripi-web-smooth-reply.png`.

## Kiểm tra tự động

- `corepack pnpm turbo run lint typecheck test build --affected` đạt 4/4 tác vụ. Web có 578 bài kiểm thử đạt.
- `node tools/check-boundaries.mjs` và `git diff --check` đều đạt.
