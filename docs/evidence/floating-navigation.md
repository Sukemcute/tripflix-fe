# Thanh điều hướng nổi — mobile

- Ngày: 2026-11-06 (Asia/Bangkok).
- Phạm vi: chỉnh giao diện theo ảnh người dùng cung cấp, thực hiện tại workspace; chưa commit hoặc push.

## Đã làm

- Mobile: thay tab bar mặc định bằng thanh bo góc màu `coralTint`, nút đang chọn nổi màu `coral` trong vòng trắng, icon trắng và icon chưa chọn màu `textMuted`. Dùng tokens màu chủ đạo của Tripflix. Giữ 5 mục và luồng Chia sẻ → đăng nhập / tạo bài; ẩn Inbox như cũ.
- Vòng tròn trượt theo mục chọn bằng Reanimated spring trên mobile. Có phản hồi nhấn, trạng thái chọn cho trình đọc màn hình và hỗ trợ reduced motion.
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

## Cách kiểm lại

1. Chạy `pnpm --filter @tripflix/web dev`, mở `http://localhost:3100`: web chỉ dùng điều hướng header, không còn thanh nổi cuối màn hình.
2. Chạy `pnpm --filter @tripflix/mobile exec expo start --web --port 8082`, mở `http://localhost:8082/explore`.
3. Trên mobile, chọn các mục liên tục, đổi hướng khi vòng tròn đang di chuyển, thu nhỏ màn hình và bật Reduce Motion để kiểm tra.
4. Chạy app trên Android để xác nhận safe area, bàn phím và cảm giác chuyển động trên thiết bị thật.

## Giới hạn kiểm tra

- Mobile được kiểm tra bằng Expo Web. Máy hiện không có Android SDK/thiết bị Android để chụp ảnh hoặc đo hiệu năng bản native/release.
- Các file tóm tắt AI đã thay đổi trước task được giữ nguyên. Phần mobile thuộc Trang, web thuộc Thành theo `RULES.md`.
