# lib/

Hạ tầng riêng của app mobile, chưa làm:

- `auth-store.ts`: lưu access/refresh token bằng `expo-secure-store`, nối vào `configureHttp` của `@tripflix/api-client`.
- `offline-queue.ts`: hàng đợi thao tác (thích, lưu) khi mất mạng, gửi lại khi có mạng.
- `tracking.ts`: gửi sự kiện hành vi (xem video, bấm vào sản phẩm) cho module analytics.
