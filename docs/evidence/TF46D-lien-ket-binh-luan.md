# TF46D — Mở đúng bình luận từ thông báo

- Nhánh `dung/TF46D-lien-ket-binh-luan` · Dũng (có dùng AI) · 2026-11-12

## Đã làm

- Web dùng ID bài và ID bình luận để mở bình luận trực tiếp từ inbox, kể cả các thông báo cũ có hai ID này.
- API tải bình luận đích và bình luận cha bằng ID. Web mở nhánh trả lời, cuộn tới và đánh dấu bình luận. Nếu bình luận đã ẩn hoặc xóa, Web hiển thị thông báo.
- Backend cần có tham số `focusCommentId` trước khi phát hành Web. Thông báo mới lấy tên người viết từ trường tên hiển thị trong sự kiện.

## Kết quả kiểm tra

- 9/9 tác vụ lint, typecheck và test cho Web, API client và i18n.
- Test liên kết kiểm cả thông báo bình luận và thông báo trả lời cũ.
- Chưa kiểm bằng trình duyệt và chưa kiểm staging.

## Cách kiểm lại

1. Tạo bình luận bằng tài khoản B trên bài của A, rồi bấm thông báo từ tài khoản A.
2. Lặp lại với lượt trả lời thuộc bình luận ở trang sau. Kiểm tra Web tự mở phần trả lời, cuộn tới đúng lượt và đánh dấu.
3. Ẩn hoặc xóa bình luận rồi mở lại đường dẫn đã lưu. Web báo bình luận không còn hiển thị.

## Ảnh hưởng tới phần của người khác

- Web và API client của Thành nằm trong phạm vi người dùng đã duyệt.
