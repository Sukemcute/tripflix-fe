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
