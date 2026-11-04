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
    (tabs)/       # 5 tab: index (Lướt), explore, trips, inbox, me
  features/       # code theo tính năng: feed, post, search, booking, assistant, inbox, auth
  components/     # component dùng chung trong app
  lib/            # gắn token (expo-secure-store), hàng đợi thao tác khi mất mạng, gửi sự kiện hành vi
assets/images/    # icon, splash: đang là ảnh mặc định của Expo, cần thay bằng logo Tripflix
```

- Màu, khoảng cách: `@tripflix/tokens`. Chữ: `@tripflix/i18n`. Gọi API: `@tripflix/api-client`.
- Cách viết style (StyleSheet hay NativeWind) do chủ app chọn. Khung hiện dùng StyleSheet.
- Đổi giao diện phải có ảnh chụp trên Android trong evidence.

Chủ: Trang.
