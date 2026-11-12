# Thanh điều hướng nổi — mobile

- Ngày: 2026-11-06 (Asia/Bangkok).
- Phạm vi: thanh điều hướng mobile theo lựa chọn của người dùng; web dùng điều hướng header.

## Đã làm

- Mobile: thanh bo góc màu `coralTint`, nút **+ Chia sẻ** luôn nổi bật ở giữa bằng đĩa `coral` 54px, dấu cộng trắng 30px và vòng trắng 66px. Giữ 5 mục và luồng Chia sẻ → đăng nhập / tạo bài; ẩn Inbox như cũ.
- Theo phản hồi mentor và lựa chọn người dùng, bỏ vòng tròn chạy/phóng to theo tab đang chọn. Bốn tab điều hướng giữ icon 24px và cùng vị trí/kích thước; chỉ đổi từ `textMuted` sang `coralInk` khi chọn.
- Chia sẻ được đọc như nút hành động; bốn mục còn lại được đọc như tab với trạng thái chọn. Phản hồi nhấn chỉ giảm opacity, không có chuyển động cần xử lý reduced motion.
- Mobile dành chỗ riêng cho thanh điều hướng.
- Theo yêu cầu tiếp theo của người dùng, đã gỡ thanh nổi khỏi web: xóa `FloatingNav`, CSS module, import và vị trí render trong layout. Khoảng trống dành cho thanh nổi cũng được gỡ cùng component. Web tiếp tục dùng thanh điều hướng trong header.
- Không thêm dependency hoặc thay đổi API.

## Kiểm tra

- `pnpm turbo run lint typecheck test --affected`: 20/20 tác vụ thành công, 16 dùng cache; các bộ test hiện có báo 95 test đạt.
- `git diff --check`: đạt.
- Kiểm tra trước khi gỡ bản web: Playwright với Chrome kiểm tra các liên kết web và 4 tab mobile, trạng thái chọn, vòng tròn web thẳng tâm mục chọn, màn hình rộng 320/390/1440 px, reduced motion trên web và không có lỗi JavaScript runtime. Những kiểm tra này ghi nhận phiên bản trước khi người dùng yêu cầu bỏ thanh nổi web.
- Kiểm tra Chia sẻ khi chưa đăng nhập: mock `/auth/refresh` trả 401; chuyển tới `/login` với `returnTo=/create` đúng. Các test điều hướng còn lại chạy giao diện thật, không phụ thuộc dữ liệu backend.
- Ảnh giao diện: `C:/Users/ADMIN/.codex/tmp/tripflix-floating-nav/` (không đưa ảnh vào Git).
- Script QA cục bộ: `C:/Users/ADMIN/.codex/tmp/tripflix-reels-qa/verify-floating-nav.cjs`.

### Kiểm tra sau khi gỡ thanh nổi web

- `pnpm --filter @tripflix/web lint` và `pnpm --filter @tripflix/web typecheck`: đạt.
- Không còn import, component hoặc CSS `FloatingNav` / `floating-nav` trong mã nguồn web.
- Playwright kiểm tra trang chủ, Cảm hứng và Tài khoản ở 1440px và 390px: 6/6 trường hợp đạt. Không còn nav cố định; ba liên kết header vẫn hoạt động, không có lỗi JavaScript runtime.
- Ảnh và kết quả: `C:/Users/ADMIN/.codex/tmp/tripflix-web-without-floating-nav/` (`web-1440.png`, `web-390.png`, `verification.json`).
- Không sửa thanh điều hướng mobile trong lượt gỡ web.

### Kiểm tra phiên bản nút + cố định (2026-11-06)

- `pnpm turbo run lint typecheck test --affected`: 20/20 tác vụ thành công, 18 dùng cache; 98 test đạt. Mobile lint/typecheck, kiểm tra boundaries và `git diff --check` đạt.
- Expo Web + Playwright: 6/6 nhóm kịch bản đạt, không có lỗi JavaScript runtime. Chọn cả bốn tab ở 320/390/430px; nút + giữ nguyên tâm/vị trí/kích thước, icon tab giữ nguyên hình/kích thước và chỉ đổi màu. Không tràn ngang.
- Bấm + khi chưa đăng nhập đến `/login?returnTo=%2Fcreate`; khi đã đăng nhập đến `/create`. Kiểm tra thêm reduced motion và semantics nút/tab.
- API/session được mô phỏng. Ảnh `nav-320-guest.png`, `nav-390-guest.png`, `nav-430-guest.png`, `nav-390-member.png` và `verification.json` ở `C:/Users/ADMIN/.codex/tmp/tripflix-fixed-compose-nav/`.
- Script QA cục bộ: `C:/Users/ADMIN/.codex/tmp/tripflix-reels-qa/verify-fixed-compose-nav.cjs`. Chưa xác minh Android native.

## Cách kiểm lại

1. Chạy `pnpm --filter @tripflix/web dev`, mở `http://localhost:3100`: web chỉ dùng điều hướng header, không còn thanh nổi cuối màn hình.
2. Chạy `pnpm --filter @tripflix/mobile exec expo start --web --port 8082`, mở `http://localhost:8082/explore`.
3. Trên mobile, chọn lần lượt Reels, Khám phá, Chuyến đi và Tôi: dấu + luôn nổi ở giữa, icon đang chọn chỉ đổi màu. Kiểm tra lại ở 320px và bật Reduce Motion.
4. Bấm Chia sẻ khi chưa đăng nhập (đến login với `returnTo=/create`) và sau đăng nhập (đến tạo bài).
5. Chạy app trên Android để xác nhận safe area và bàn phím trên thiết bị thật.

## Giới hạn kiểm tra

- Mobile được kiểm tra bằng Expo Web. Máy hiện không có Android SDK/thiết bị Android để chụp ảnh hoặc đo hiệu năng bản native/release.
- Các file tóm tắt AI đã thay đổi trước task được giữ nguyên. Phần mobile thuộc Trang, web thuộc Thành theo `RULES.md`.
