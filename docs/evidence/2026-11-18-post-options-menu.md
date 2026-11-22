# Menu tùy chọn bài viết

Triển khai ngày 18/11/2026 trên nhánh `feature/creator-comment-controls`.

## Mục được giữ

| Bài của người khác | Bài của mình |
|---|---|
| Lưu / bỏ lưu bài viết | Lưu / bỏ lưu bài viết |
| Báo cáo bài viết, chọn lý do có sẵn | Chỉnh sửa bài viết |
| | Chỉnh sửa quyền xem: công khai / chỉ mình tôi |
| | Xóa bài viết, có xác nhận và hủy |

Không thêm những chức năng hệ thống chưa hỗ trợ: quan tâm/không quan tâm, ghim, báo cáo quản trị viên nhóm, tắt thông báo theo bài, quảng cáo, dịch, sửa ngày, kho lưu trữ hay thùng rác có lịch khôi phục.

## Chỗ hiển thị

- Web: thẻ bài ở Cảm hứng, trình xem Reels và bài của tôi / đã lưu trong tài khoản.
- Mobile: thẻ bài, chi tiết bài và cột thao tác của Reels có dữ liệu thật. Không đặt menu lên video mẫu không có bài ở server.
- Quyền tác giả theo user ID, không theo vai trò staff. Người khác không nhìn thấy sửa/xóa/quyền xem. Các API vẫn kiểm quyền ở server.
- Web dùng popover ở top layer, không bị cắt bởi thẻ/cuộn. Hỗ trợ đóng khi bấm ngoài, Escape, cuộn/resize, điều hướng mũi tên/Home/End và trả focus về nút mở.
- Chỉnh sửa và quyền xem có hộp thoại riêng. Đổi sang riêng tư/xóa sẽ dọn cache feed; bài riêng tư của tác giả vẫn quản lý được từ tài khoản.
- Mobile dùng BottomSheet và bộ icon/token hiện có. Không thêm thư viện, không dùng skill Expo.

## Kiểm tra

- `tools/verify-post-options-live.cjs`: đạt với API thật và hai tài khoản local. Kiểm menu theo quyền, bàn phím, lưu/trạng thái đã lưu, sửa tiêu đề/nội dung, gửi báo cáo, giao diện 390px, đổi public/private, mở lại menu trên bài riêng tư, hủy và xác nhận xóa.
- Web: 170 test đạt; typecheck đạt.
- Mobile: 2 test render menu xác nhận quyền tác giả/người khác/khách và trạng thái đã lưu; typecheck đạt. Các test dùng native presentation stub.
- Lint các component menu mới và kiểm tra diff whitespace đạt.
- Ảnh và kết quả live: thư mục workspace `outputs/post-options-20261118` (`owner-desktop.png`, `reader-desktop.png`, `reader-mobile.png`, `result.json`).

Chưa kiểm tương tác trên thiết bị Android/iOS thật trong phiên này. Các thay đổi dùng API hiện có, không đổi BE hay migration.
