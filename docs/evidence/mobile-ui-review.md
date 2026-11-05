# Mobile UI V1: bản frontend để review

- Ngày: 2026-11-04.
- Nhánh: `trang/mobile-ui`, tạo từ `origin/develop` tại `83647ee` trước khi sửa code.
- `dev` local còn ở commit khởi tạo `8b25bff`; remote không có `dev`. Nhánh tích hợp của repo là `develop`.
- Chưa có mã task được cung cấp. Không tự tạo mã TF.
- Người dùng đã review và đồng ý commit, push nhánh `trang/mobile-ui` ngày 2026-11-05.
- Kiểm tra lại trước commit/push: `pnpm check` (lint, typecheck và unit tests).

## Đã triển khai

| Phạm vi | Nội dung |
| --- | --- |
| Điều hướng | 5 mục Reels / Khám phá / Chia sẻ / Chuyến đi / Tôi theo thiết kế; Chia sẻ là hành động. Thông báo mở từ chuông, route inbox cũ là alias ẩn. |
| Bộ màn hình | Onboarding, đăng nhập/đăng ký mẫu, Reels, Khám phá, tìm kiếm, lộ trình, lưu trú, chỉnh chuyến, giỏ, thanh toán, thành công, chuyến đi, chia sẻ, Tripi, đã lưu, hồ sơ, thông báo. |
| Đặt chuyến | Ngày hợp lệ từ ngày mai; 1–8 khách; mỗi phòng 2 khách; tính 2 đêm; thêm/bỏ vé khứ hồi cập nhật tổng; validate liên hệ/đồng ý điều kiện; chặn xác nhận trùng trong phiên checkout. |
| Giữ ngữ cảnh | Đăng nhập giữa luồng rồi quay lại hành động lưu/thích/đăng bài/thanh toán; giỏ và thông tin liên hệ được giữ. Đơn đã xác nhận là snapshot của lựa chọn và giá lúc đặt. |
| Khám phá | Truy vấn mẫu bằng tiếng Việt, ngân sách theo người, lựa chọn chỉ lưu trú, không có kết quả khi giá vượt ngân sách hoặc điểm đến ngoài danh mục mẫu. |
| Tương tác | Thích/lưu, bài chia sẻ mẫu có kiểm tra nội dung, trạng thái chờ duyệt và thông báo tương ứng. Draft giữ khi chuyển màn trong phiên. |
| Hình thức | Bảng màu Original Explorer, font Be Vietnam Pro, logo mới và bốn pose Tripi cục bộ. Dùng Ionicons đã có trong repo. Chữ tập trung tại i18n, màu/font/layout tại tokens. |

Nguồn đối chiếu: `tripflix-ui-design/UX-SPEC.md`, `app.js`, `styles.css`, ảnh evidence và assets trong workspace.
Riêng CTA đặt chuyến đối chiếu AC của F5 trong [PRD Tripflix v3](https://app.notion.com/p/40dcb9b9e5c281388e2ff36dc60b9918)
và bản local `D:/Sukem/VinUni/VSF/docs/05-prd-tripflix-v3.md`: thống nhất **Đặt theo lộ trình** ở Reels và chi tiết lộ trình,
thay cho nhãn cũ lấy từ prototype.
Không thay API contract, không sửa web/admin hay cấu hình CI. Đã bổ sung `expo-image-picker ~58.0.10`
theo phản hồi chấp thuận của người dùng để mở bộ chọn ảnh/video hệ thống; lockfile cập nhật cùng dependency.

## Kết quả kiểm tra

- `pnpm check`: lint và typecheck qua trên toàn repo; **32/32 unit tests qua** trong 7 file test.
  `app-core`: 22 (19 test mới), `api-client`: 3, `i18n`: 2, `tokens`: 1, `utils`: 4.
- `TURBO_SCM_BASE=origin/develop pnpm turbo run lint typecheck test build --affected`: **19/19 tasks qua**,
  gồm production build của web và admin sau khi bổ sung package dùng chung.
- `node tools/verify-mobile-review.cjs`: **10 nhóm kiểm tra qua**, **42 lượt route/viewport** ở 320/390/430px,
  không có horizontal document overflow, **0 browser runtime errors**, **22 ảnh**.
- Luồng browser bao gồm: đặt chuyến 3 khách; ngày sai; thêm/bỏ vé; đăng nhập tiếp tục;
  lỗi nhập liệu checkout; snapshot đơn; lưu bài; gửi bài mẫu; thông báo; tìm chỉ lưu trú dưới 2 triệu/người;
  không có kết quả; thử lại thanh toán lỗi; quay lại giỏ khi hết phiên.
- Bộ chọn tệp thật trên web: chọn hai ảnh, từ chối 11 ảnh, hủy chọn giữ draft, chọn video 2 giây,
  từ chối video 302 giây, giữ video cũ khi lựa chọn mới bị từ chối và xóa video. Thời lượng web được chuẩn hóa
  từ giây sang mili giây theo implementation của `expo-image-picker 58.0.10`; native đã trả mili giây.
- `pnpm --filter @tripflix/mobile exec expo export --platform android --output-dir dist/android-review`:
  **qua**, Hermes bundle và 41 assets được xuất. Đây không phải APK hay kiểm tra trên thiết bị.
- Máy chưa có Android SDK/emulator/thiết bị kết nối. **Chưa có evidence Android native**; cần kiểm tra font,
  safe area, keyboard, hardware back và ảnh SVG trên Android trước khi nghiệm thu mobile.

## Cách review

Server Expo web đang phục vụ tại [localhost:8081](http://localhost:8081).
Nếu server đã dừng, từ repo root chạy `pnpm --filter @tripflix/mobile web` rồi mở địa chỉ Expo in ra.

1. Bắt đầu khám phá → xem lộ trình → đặt theo lộ trình → đổi ngày/khách → giỏ.
2. Bỏ rồi thêm lại vé bay, kiểm tra tổng tiền. 2 khách: 6.780.000đ; 3 khách: 11.660.000đ;
   3 khách chỉ lưu trú: 5.960.000đ.
3. Đăng nhập bằng email giả hợp lệ và mật khẩu mẫu từ 6 ký tự. Hoàn tất thông tin giả, tick điều kiện và thanh toán mẫu.
4. Xem chuyến và chi tiết đơn. Vào Tôi để lưu/chia sẻ, chọn ảnh/video từ thư viện hoặc dùng ảnh mẫu.
5. Khám phá → Tripi → “Chỉ đặt khách sạn, dưới 2 triệu/người” → kết quả 1.490.000đ/người.
6. Mở `/checkout?scenario=failed` hoặc `/checkout?scenario=expired` để review lỗi sau đăng nhập mẫu.

Xem thêm `apps/mobile/README.md` để chạy app/kiểm thử và dùng các URL trạng thái khác.

## Ảnh và báo cáo browser

Lưu ngoài repo theo quy tắc evidence, ở thư mục local:

`C:/Users/ADMIN/.codex/visualizations/2026/11/04/01a1a6b2-bc84-7e00-b05d-e282325e65d6/mobile-review/`

Trong đó có `01-onboarding.png` đến `22-video-too-long.png` và `verification.json`.
Ảnh này được chụp trên Expo web / Chromium, không gắn nhãn là ảnh Android.

## Giới hạn của bản review

- Chưa nối backend: auth/đăng ký, AI, xác thực, tồn kho, giao dịch, kiểm duyệt và thông báo đều là mô phỏng cục bộ.
- Reels dùng ảnh bìa, chưa phát video thật. Danh mục đặt hoàn chỉnh chỉ có lộ trình Nha Trang; hai tab Reels dùng cùng fixture.
- Ngày nhập theo ISO `YYYY-MM-DD`, chưa thêm thư viện date picker native.
- Chọn media đã nối `expo-image-picker`: tối đa 10 ảnh hoặc 1 video dài tối đa 5 phút, kiểm tra lại kết quả
  trước khi thay thế draft. App dùng bộ chọn hệ thống, không xin quyền đọc toàn thư viện; config plugin tắt
  camera và microphone. Nhánh lỗi quyền có hướng mở cài đặt. Bản native cài riêng cần rebuild để chứa module mới.
- Chưa upload media lên backend hoặc phát preview video; video hiện có tên tệp và thời lượng.
- Dữ liệu phiên không được ghi ra storage. Tải lại trang/khởi động lại app sẽ reset; giá và ảnh là minh họa.
- Giữ nguyên app icon/splash mặc định trong scaffold; logo trong các màn dùng asset đã duyệt.

## Ảnh hưởng và quyền sở hữu

`apps/mobile` thuộc Trang. Các package chung chỉ được bổ sung export/token/copy/helper mới; giữ nguyên API/token/copy cũ
để các app web và admin đang dùng tiếp tục hoạt động. Không sửa code backend hay ghi dữ liệu lên hệ thống bên ngoài.
