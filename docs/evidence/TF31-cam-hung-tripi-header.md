# TF31 — Căn trang Cảm hứng và đưa Tripi lên top navigation

- Task: TF31 (không có URL Notion được cung cấp trong phiên).
- Nhánh: `bao/TF31-cam-hung-tripi-header`.
- Người làm: Bảo, có dùng AI. Ngày: 2026-11-18.
- Gốc đồng bộ: `origin/develop` tại `9538828`.
- Đồng bộ lần cuối trước push: `origin/develop` tại `42bf6b9`, merge commit `202ed1a`; không có conflict.

## Đã làm

- Dùng chung chiều rộng responsive cho header và toàn bộ trang Cảm hứng, gồm dock, lịch trình, bài đăng, bình luận và Reels.
- Giữ khoảng trống scrollbar ở thẻ `html`, tránh nhích ngang khi chuyển giữa các trang.
- Giữ bo góc vùng cuộn; vẽ viền cam theo phần thẻ highlight đang nhìn thấy, kể cả khi thẻ bị cắt ở mép trên/dưới.
- Bóng hover bám từng thẻ, không đổ bóng cả cột; bóng nhẹ và tản quanh góc bo.
- Đưa Tripi cạnh giỏ hàng; căn giữa và chia đều các tab. Tripi không có nền trắng khi hover và dùng mascot 44px trên desktop.
- Animation mở/thu biến dạng cả nội dung bằng lưới WebGL, hội tụ về nút Tripi; trả về DOM tương tác sau khi mở. Có chế độ giảm chuyển động và phương án mở/đóng đơn giản nếu WebGL không khả dụng.
- Đồng bộ tọa độ canvas với kích thước CSS thật, tránh nhích sang phải khi chuyển từ animation về khung chat có scrollbar-gutter.
- Đọc asset công khai qua `api-client`, không gửi token/cookie API và không sửa hợp đồng backend.

## Đồng bộ code của team

- Nhánh cũ `bao/TF31-giu-the-khi-mo-lai` đã merge qua PR #244, không tái sử dụng PR đó.
- Tạo nhánh mới từ develop mới nhất rồi áp dụng thay đổi local bằng merge ba chiều; không có conflict văn bản.
- Giữ phần avatar/khung avatar, ảnh đại diện ô đăng bài và các thay đổi duyệt bình luận, tìm kiếm, footer mới từ develop.

## Kết quả kiểm tra

- `corepack pnpm turbo run lint typecheck test --affected`: **17/17 tác vụ đạt**, gồm các tác vụ lấy từ cache hợp lệ; lint còn cảnh báo sẵn có trong repo.
- Sau khi chuyển đọc asset về api-client: `corepack pnpm turbo run lint typecheck test --filter=@tripflix/api-client --filter=@tripflix/web --output-logs=errors-only`: **6/6 tác vụ đạt**.
- Sau merge develop lần cuối: `corepack pnpm turbo run lint typecheck test --affected --output-logs=errors-only`: **17/17 tác vụ đạt**, 12 lấy từ cache hợp lệ.
- Web: **38 file test, 249 tests đạt**.
- API client: **33 file test, 290 tests đạt**.
- `node tools/check-boundaries.mjs`: đạt, không có vi phạm.
- `corepack pnpm --filter @tripflix/web build`: đạt, biên dịch TypeScript và tạo đủ **24 trang tĩnh**.
- HTTP kiểm tra local `/`, `/search`, `/flights`, `/inspiration`: 200; nút Tripi nằm trong header.
- `git diff --check`: đạt.

## Cách kiểm lại

1. Chạy web ở `http://localhost:3100`; chuyển qua lại Trang chủ, Khách sạn, Vé máy bay, Cảm hứng và kiểm tra header không nhích ngang.
2. Mở lịch trình/bình luận, cuộn bài highlight qua hai mép khung; góc vẫn bo và viền cam vẫn hiện.
3. Hover từng bài; bóng không nối hai thẻ thành khung chung.
4. Bấm Tripi để mở, bấm lại hoặc thu nhỏ để đóng; thử đổi chiều giữa chừng, nhấn Escape và chuyển kích thước cửa sổ.
5. Kiểm tra sau khi mở hết khung không nhích ngang, có thể gõ và cuộn hội thoại bình thường.
6. Bật reduced motion và thử ở màn hình hẹp.

## Ảnh / video

- Người dùng đã kiểm tra web local và cung cấp ảnh phản hồi trong phiên làm việc để chỉnh bố cục, viền, hover và chuyển động.
- Chưa tải ảnh/video cuối lên GitHub; không commit ảnh vào repo. Công cụ browser host không khả dụng để tự chụp lại sau đồng bộ develop.
- Các test hình học kiểm tra quỹ đạo và tọa độ, không thay thế đánh giá trực quan animation trên thiết bị thật.

## Ảnh hưởng tới phần của người khác

- `apps/web` (Thành): header, widget Tripi và bố cục feed; đã được người dùng yêu cầu sửa và yêu cầu đồng bộ, commit, push, mở PR trong phiên.
- `packages/api-client`: thêm `readPublicAsset` để tuân thủ ranh giới HTTP; không thay chữ ký API cũ, không thêm thư viện hay sửa cấu hình chung.
- Không tự merge PR, deploy hoặc cập nhật Notion.
