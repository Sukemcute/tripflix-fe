# @tripflix/mobile

App Tripflix trên điện thoại: Expo SDK 58 (React Native 0.88, React 19.3), Expo Router, làm Android trước.

## Chạy

Expo chạy trên máy, không chạy trong Docker (docs/11 §7.5). Backend chạy bằng `pnpm stack:be` trong repo `tripflix-be`.

1. Chép `.env.example` thành `.env`, chọn `EXPO_PUBLIC_API_URL`:
   - Android emulator: `http://10.0.2.2:8080`
   - Điện thoại thật cùng wifi: `http://<IP LAN của máy>:8080`, và mở cổng 8080 trong Windows Firewall (mạng Private).
2. `pnpm --filter @tripflix/mobile start`, rồi quét mã QR bằng app **Expo Go** (bản mới nhất trên Play Store hỗ trợ SDK 58), hoặc bấm `a` để mở emulator.

Bản APK demo: `pnpm --filter @tripflix/mobile build:apk` (EAS, cần tài khoản Expo của nhóm).

## Cấu trúc

```
src/
  app/            # route theo file (Expo Router)
    (tabs)/       # 5 tab: index (Reels), explore, compose (hành động), trips, me
  features/       # code theo tính năng: feed, post, search, booking, assistant, inbox, auth
  components/     # component dùng chung trong app
  lib/            # gắn token (expo-secure-store), hàng đợi thao tác khi mất mạng, gửi sự kiện hành vi
assets/images/    # icon, splash: đang là ảnh mặc định của Expo, cần thay bằng logo Tripflix
```

- Màu, khoảng cách: `@tripflix/tokens`. Chữ: `@tripflix/i18n`. Gọi API: `@tripflix/api-client`.
- Cách viết style (StyleSheet hay NativeWind) do chủ app chọn. Khung hiện dùng StyleSheet.
- Đổi giao diện phải có ảnh chụp trên Android trong evidence.

Chủ: Trang.

## Review giao diện Mobile V1

Bản triển khai native theo `tripflix-ui-design/UX-SPEC.md` ngày 04/11/2026: 17 màn, font Be Vietnam Pro,
logo và bốn pose Tripi được đóng gói cục bộ. `inbox` được giữ làm alias ẩn cho Thông báo; không có nhắn tin riêng.

```sh
pnpm --filter @tripflix/mobile web
```

Mở địa chỉ Expo in ra. Bản preview giới hạn bề rộng 430px trên desktop; Android sử dụng toàn bộ màn hình.
Chọn **Bắt đầu khám phá**, rồi thử **Đặt theo lộ trình**. Khi được hỏi đăng nhập,
dùng email giả hợp lệ và mật khẩu mẫu dài ít nhất 6 ký tự. Checkout nhận số điện thoại giả hợp lệ;
không nhập thông tin thật. Ngày khởi hành mặc định là 16 ngày sau ngày hiện tại.

- Auth, tìm kiếm, Tripi, xác thực, giao dịch và kiểm duyệt đều dùng dữ liệu mẫu. Reels hiển thị ảnh bìa;
  hai tab dùng cùng lộ trình Nha Trang trong danh mục mẫu, chưa có playback hay xếp hạng thật.
- Trạng thái giữ trong React context của phiên hiện tại, được giữ khi chuyển màn và qua bước đăng nhập;
  khởi động lại app hoặc tải lại trang sẽ đặt lại phiên. Đơn đã xác nhận giữ snapshot giá/ngày/khách.
- Màn chia sẻ dùng `expo-image-picker ~58.0.10`: chọn tối đa 10 ảnh hoặc 1 video dài tối đa 5 phút.
  Lựa chọn hợp lệ thay thế tệp trong draft; hủy chọn/tệp lỗi giữ nguyên draft. Ảnh có preview, video hiển thị tên và thời lượng.
  **Dùng ảnh mẫu để review** vẫn có sẵn. Chưa upload tệp lên backend.
  App dùng bộ chọn tệp hệ thống, không xin quyền đọc toàn bộ thư viện; config plugin tắt camera/microphone
  vì chức năng này chỉ chọn tệp đã có. Bản native cài riêng phải rebuild sau khi thêm module/plugin.
- Các trạng thái review có thể mở bằng `/search?scenario=empty`, `/cart?scenario=unavailable`,
  `/checkout?scenario=failed`, `/checkout?scenario=expired`, `/saved?scenario=empty`, `/trips?scenario=empty`.
  Hai URL checkout sẽ yêu cầu đăng nhập mẫu trước và giữ lại trạng thái cần review.
- Component chung: `src/components/mobile-ui.tsx`. Màn theo tính năng trong `src/features/`;
  route chỉ re-export. Copy ở `@tripflix/i18n`, token ở `@tripflix/tokens`, tính giá/validation ở `@tripflix/app-core`.

Kiểm tra giao diện web bằng Playwright đã được cài **ngoài repo** (không phải dependency của app):

```powershell
$env:PLAYWRIGHT_PACKAGE = '<duong-dan-package-playwright-da-cai>'
$env:PLAYWRIGHT_CHROMIUM_PATH = '<duong-dan-chromium.exe>' # bỏ qua nếu dùng browser mặc định của Playwright
$env:MOBILE_PREVIEW_URL = 'http://localhost:8081'
$env:MOBILE_EVIDENCE_DIR = '<thu-muc-anh-ngoai-repo>'
$env:MOBILE_TEST_VIDEO = '<video-ngan.webm>' # thêm cả hai fixture để chạy kiểm tra chọn video
$env:MOBILE_TEST_LONG_VIDEO = '<video-hon-5-phut.webm>'
node tools/verify-mobile-review.cjs
```

Từ repo root: `pnpm check`. Bundle Android: `pnpm --filter @tripflix/mobile exec expo export --platform android`.
Bundle thành công và ảnh Expo web chưa thay thế kiểm tra trên thiết bị Android.
