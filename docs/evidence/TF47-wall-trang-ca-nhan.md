# TF47 — Wall trang cá nhân và nội dung đã lưu

- Ngày: 2026-11-19 · Nhánh: `dung/TF47-wall-trang-ca-nhan`.
- Phạm vi: yêu cầu trực tiếp của người dùng, không có link task.

## Đã làm

- Header nền trắng, avatar, tên, thống kê và nút Chỉnh sửa/Theo dõi. Không có ảnh nền hoặc ô giới thiệu.
- Bài viết là tab mặc định, wall dọc căn giữa rộng tối đa 820px. Hiện tên, ngày, toàn bộ nội dung, hashtag, ảnh tác giả đính kèm, lịch trình và tương tác. Bài chỉ chữ không tự gán ảnh minh họa.
- Tái sử dụng PostCard, ShareMenu và component bình luận hiện có. Hai prop mới của PostCard giữ nguyên hành vi mặc định ở Cảm hứng.
- Thích/lưu gọi API hiện có, chặn request lặp trong khi mutation chưa hoàn tất. Bình luận mở dưới bài. Ảnh, lịch trình và link chi tiết mở đúng bài trên Cảm hứng.
- Video của tác giả giữ dạng lưới poster, có tiêu đề và lượt thích.
- Bài đã lưu chỉ xuất hiện khi xem hồ sơ của mình, có bộ chọn Bài viết / Video. Không hiện dòng chú thích quyền riêng tư.
- Bài viết đã lưu dùng wall và API bookmark lọc `post_type=vlog`; Video dùng feed `saved=true` kèm poster thật, link có `kind=reel`. Mỗi loại có query và cursor riêng, chỉ mount loại đang chọn.
- Giữ phân trang theo nút Xem thêm, không tải toàn bộ hoặc gọi API chi tiết cho từng bài lúc tải danh sách.
- Trong Cài đặt: nút Chỉnh sửa thông tin cá nhân nền trắng; bỏ ghi chú email và mô tả sở thích du lịch.
- Không đổi database hoặc hợp đồng API.

## Kiểm tra

- Sau khi gộp develop mới nhất: `TURBO_SCM_BASE=origin/develop pnpm turbo run lint typecheck test build --affected --output-logs=errors-only`: 13/13 tác vụ thành công, 2 dùng cache.
- `git diff --check`: thành công.
- `node tools/check-boundaries.mjs`: không vi phạm.
- Đã kiểm giao diện thực bằng Next dev và API fixture riêng trên localhost, không dùng database thật.
- Desktop 1440px và mobile 390px: không tràn ngang.
- Fixture kiểm bài có ảnh/bài chỉ chữ, nội dung đầy đủ, thích tăng 24 → 25, lưu đổi thành Bỏ lưu, mở bình luận có ô nhập và mở menu chia sẻ.
- Kiểm Bài đã lưu: Bài viết hiện wall, Video hiện ba poster; link video đúng ID và `kind=reel`. Trang người khác không có tab Bài đã lưu.
- Chưa kiểm gửi bình luận thật, chia sẻ ra dịch vụ ngoài, pagination nhiều trang hoặc tích hợp backend production. Fixture không thay thế kiểm thử tích hợp.

## Ảnh kiểm tra

Ảnh đã gửi trong chat, nằm ngoài repo tại:
`C:/Users/ASUS/.codex/visualizations/2026/11/09/01a1be85-2ecb-7092-b037-9b08c5273acb/`

- `profile-wall-no-cover.jpg`: header không có ảnh nền và wall.
- `saved-posts-wall.jpg`: bài viết đã lưu dạng wall.
- `saved-videos-grid.jpg`, `saved-videos-mobile.jpg`: video đã lưu desktop/mobile.
- Ảnh dùng dữ liệu mẫu local. Hai ảnh saved được chụp trước khi bỏ dòng chú thích quyền riêng tư.

## Ảnh hưởng

- Web thuộc Thành. Thực hiện theo yêu cầu người dùng; bổ sung prop tùy chọn cho PostCard dùng chung, không đổi mặc định của feed cũ.
