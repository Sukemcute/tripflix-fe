# @tripflix/api-client

Client gọi backend cho mobile, web, admin. Code trong `src/generated/` do [Orval](https://orval.dev) sinh từ hợp đồng OpenAPI: hook TanStack Query + type cho từng API. **Không sửa tay** `src/generated/`, không tự viết `fetch` gọi backend.

## Sinh lại client

Cần 3 repo đặt cạnh nhau (`tripflix/tripflix-be`, `tripflix/tripflix-ai`):

```
pnpm gen:api
```

Lệnh đọc `../tripflix-be/contracts/openapi/core-api.json` và `../tripflix-ai/contracts/openapi/ai-service.json`, rồi ghi vào `src/generated/`. Commit kết quả cùng PR dùng API mới.

## Dùng trong app

Cấu hình một lần lúc khởi động:

```ts
import { configureHttp } from '@tripflix/api-client';

configureHttp({
  baseUrl: process.env.NEXT_PUBLIC_API_URL!, // mobile: EXPO_PUBLIC_API_URL
  getAccessToken: () => tokenStore.access,
  refreshAccessToken: () => auth.refresh(),
});
```

`src/http.ts` tự gắn `Authorization: Bearer`, `x-request-id`, `Idempotency-Key` cho lệnh ghi (giữ nguyên key khi gửi lại sau refresh), và ném `HttpError` khi lỗi.

Chủ: Dũng (http.ts, cấu hình Orval), mỗi chủ module duyệt phần API của mình.

## Phiên đăng nhập và API nghiệp vụ

Các app hiện dùng `ApiSessionProvider` bên trong `QueryClientProvider`, rồi đọc `useApiSession()`.
`client="web"` dùng cookie refresh HttpOnly của BE; access token chỉ nằm trong bộ nhớ. Native truyền
`client="native"` và adapter `TokenStorage` dùng `expo-secure-store` trong `apps/mobile/src/app/_layout.tsx`.
Refresh được gộp khi nhiều request cùng nhận 401; endpoint đăng nhập/refresh không tự gọi refresh đệ quy.
Token gần hết hạn được refresh trước khi gửi, kể cả endpoint dùng optional authentication.
Đổi tài khoản hoặc đăng xuất sẽ xóa cache QueryClient để dữ liệu tài khoản cũ không còn hiển thị.

`socialApi`, `useSocialPosts` và `useStaySearch` gọi các hàm Orval đã sinh; app không tự `fetch` backend.
Import model theo đường dẫn `@tripflix/api-client/core-api/model/index` (đúng package export hiện có).
BE giữ một số field social dạng snake_case; adapter gửi đúng hợp đồng đó, không đổi tên field trên dây.

Quy trình sinh client: chạy `pnpm contracts:build` ở BE trước, sau đó `pnpm gen:api` ở FE.
Xem [evidence tích hợp](../../docs/evidence/api-integration.md) để chạy hệ thống và kiểm tra lại.
