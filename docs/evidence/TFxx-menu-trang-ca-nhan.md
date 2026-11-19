# TFxx — Chuyển nội dung cá nhân khỏi trang Tài khoản

- Nhánh: `dung/TFxx-menu-trang-ca-nhan` · Ngày: 2026-11-19
- Phạm vi: yêu cầu trực tiếp của người dùng, Web và nhãn i18n.

## Đã làm

- Bỏ mục Trạng thái kiểm duyệt khỏi menu avatar.
- Thay Bài đăng của tôi bằng Trang cá nhân, mở `/u/<id>` của người đang đăng nhập.
- Bỏ Bài đăng của tôi và Bài đã lưu khỏi điều hướng và nội dung trang Tài khoản.
- Trang cá nhân giữ Video/Bài viết và thêm Bài đã lưu cho chủ tài khoản. Người khác và khách không thấy hoặc render danh sách đã lưu.
- Tái sử dụng danh sách bookmark và API hiện có; không đổi database, quyền API hoặc trang kiểm duyệt.
- Các giá trị `?tab=mine` và `?tab=bookmarks` cũ quay về thông tin tài khoản theo bộ đọc tab.

## Kết quả kiểm tra

- `pnpm turbo run lint typecheck test --filter=@tripflix/web --filter=@tripflix/i18n --output-logs=errors-only`: 6/6 tác vụ thành công.
- Chạy trực tiếp bộ test Web: 38 file, 253 test thành công.
- Sau khi gộp `origin/develop` mới nhất: `TURBO_SCM_BASE=origin/develop pnpm turbo run lint typecheck test build --affected --output-logs=errors-only`: 13/13 tác vụ thành công, 3 tác vụ dùng cache.
- `node tools/check-boundaries.mjs`: không có vi phạm.
- `git diff --check`: thành công.
- Chưa kiểm giao diện trong trình duyệt với phiên đăng nhập, chưa có ảnh evidence.

## Cách kiểm lại

1. Đăng nhập Web, mở menu avatar: có Tài khoản, Chuyến đã đặt, Trang cá nhân; không còn Trạng thái kiểm duyệt hoặc Bài đăng của tôi.
2. Bấm Trang cá nhân: mở đúng người dùng, có Video/Bài viết/Bài đã lưu.
3. Chọn Bài đã lưu: xem danh sách đã lưu hiện có của mình.
4. Mở trang của người khác hoặc đăng xuất: không hiện tab/danh sách Bài đã lưu.
5. Mở Tài khoản: chỉ còn Thông tin cá nhân, Bảo mật, Chuyến đã đặt (cùng các thao tác quản trị/đăng xuất hiện có).

## Ảnh hưởng

- Web thuộc phần Thành, thay đổi theo yêu cầu người dùng. Chỉ sửa menu, các tab và nhãn; không đổi hợp đồng backend/mobile.
