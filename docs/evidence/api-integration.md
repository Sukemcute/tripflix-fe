# Tích hợp API FE – BE

- Ngày: 2026-11-05 · Nhánh hai repo: `trang/noi-api-fe-be`.
- Phạm vi: nối các API nghiệp vụ đã merge vào BE `develop` (`f0bce3b`), trên web, admin và mobile. Người dùng đã duyệt thay logic demo và thêm `expo-secure-store` trong chat.
- Task/Notion: người dùng chưa cung cấp mã task. Kết quả hiện nằm ở workspace local.

## Đã nối

| Luồng                                                          | API                                                                          | Giao diện                                                              |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Đăng ký, đăng nhập, refresh, đăng xuất                         | `/api/auth/*`                                                                | Web, mobile; admin đăng nhập/đăng xuất bằng tài khoản thật             |
| Hồ sơ, mật khẩu, thiết bị, thu hồi mọi phiên                   | `/api/auth/me`, `/password/change`, `/sessions`, `/logout-all`               | Web `/account`, mobile tab Tôi                                         |
| Bảng tin, chi tiết, bản nháp, sửa/xóa/đăng bài chữ             | `/api/v1/posts*`, `/api/v1/me/posts`                                         | Web, mobile                                                            |
| Bình luận, phản hồi một cấp, sửa/xóa                           | `/api/v1/posts/:id/comments`, `/api/v1/comments/:id`                         | Web, mobile                                                            |
| Cảm xúc, lưu/bỏ lưu, bài đã lưu, chia sẻ                       | `/api/v1/posts/:id/reaction`, `/bookmark`, `/shares`, `/api/v1/me/bookmarks` | Web, mobile                                                            |
| Gợi ý tên địa điểm/khách sạn                                   | `/api/suggest`                                                               | Web, mobile; chọn khách sạn thông báo trang chi tiết chưa hỗ trợ       |
| Phòng trống, giá thật, ngày/số khách/bộ lọc/sắp xếp/phân trang | `/api/stays`                                                                 | Web, mobile; chọn địa điểm dùng `refId` thật                           |
| Nhân sự, cấp/gỡ moderator, khóa/mở khóa                        | `/api/admin/me`, `/staff`, `/users`                                          | Admin, kiểm tra vai trò thật                                           |
| Kiểm duyệt và lịch sử                                          | `/api/v1/admin/posts*`                                                       | Admin, moderator và superadmin                                         |
| Lịch giá/tồn kho phòng và chuyến bay                           | `/api/admin/commerce/*/calendar`                                             | Admin superadmin; nhập mã loại phòng/chuyến bay đang có trong commerce |

Các route đang hoạt động chuyển sang component `live-*`; component demo cũ giữ lại để tránh ghi đè các thiết kế và công việc trước. Chúng không còn là route nghiệp vụ đang sử dụng.

Provider dùng API client chung; browser giữ refresh token trong cookie HttpOnly, native dùng SecureStore. Có gộp refresh đồng thời, giữ Idempotency-Key khi gửi lại sau 401, bảo vệ kết quả tải tài khoản cũ sau logout, và xóa cache khi đổi người dùng. Form chỉ báo thành công sau phản hồi BE; lỗi gửi giữ nội dung để sửa/thử lại.

BE bổ sung DTO phản hồi social để Orval sinh type thay vì `void`; không đổi tên JSON, schema DB hay chữ ký endpoint. Thêm filter chuyển lỗi domain social sang 404/403/409/422, sửa tình trạng bài bị ẩn/không tồn tại trả 500. Giữ nguyên HTTP 201 thực tế của thao tác publish và bổ sung mô tả tương ứng trong OpenAPI.

## Phần chưa có BE hoàn chỉnh

- Booking, giữ chỗ, thanh toán, đơn hàng, analytics, thông báo nghiệp vụ và trợ lý AI: chưa có API trong phiên bản này. Các route liên quan hiển thị trạng thái chưa hỗ trợ, không tạo đơn/thanh toán/thông báo giả.
- Media mới có tạo upload và ký lại part. Chưa có HTTP hoàn tất upload hoặc pipeline video hoàn chỉnh, nên chưa bật upload ảnh/video hoặc phát video. Đăng bài chữ đã hoạt động.
- API chi tiết khách sạn mới nằm ở nhánh `origin/thang/TF10-trang-chi-tiet-khach-san`; không tự merge nhánh chưa tích hợp vào `develop`.
- Chỉ seed danh mục phòng/vé giả lập local do BE đã cung cấp; các mức giá là dữ liệu thực của database local, không phải giá bán của nhà cung cấp ngoài.

## Kết quả kiểm tra

- FE: `pnpm lint`, `pnpm typecheck`, `pnpm test` — pass, 50 test.
- Web/admin: `pnpm build` — pass.
- Mobile: Expo export web và Android; Android export chỉ kiểm tra bundle JavaScript, không phải APK hay kiểm thử thiết bị.
- BE: lint/typecheck/test pass; 268 test. Lint còn 42 warning có sẵn ở test social, không có error hoặc vi phạm ranh giới module.
- Database: `pnpm --filter @tripflix/core-api test:int` — 17 test pass với Docker.
- Browser: 14 luồng trong `tests/e2e/api-integration.cjs` pass, dùng Playwright ngoài repo và API/DB thật. Một ca chủ động chặn POST bình luận bằng 503 để kiểm tra giữ draft và retry; các ca thành công đều đi tới BE thật.
- Chưa có Android SDK/thiết bị trong môi trường này để chụp evidence Android hoặc kiểm tra SecureStore trên thiết bị. Evidence mobile hiện là Expo web ở kích thước 412×915.

## Chạy local

Ở `tripflix-be`, cài dependency, chép `.env.example` thành `.env` cho core-api nếu chưa có và chạy:

```powershell
pnpm install --frozen-lockfile
pnpm stack:infra
pnpm contracts:build
pnpm db:migrate
pnpm --filter @tripflix/core-api db:seed
$env:PORT='8080'
$env:AUTH_WEB_ORIGINS='http://localhost:3100,http://localhost:3200,http://localhost:8084'
pnpm --filter @tripflix/core-api start
```

API chạy trực tiếp ở 8080 trong cách chạy này, không cần Traefik. Docker chỉ cung cấp Postgres, Redis, Mailpit. Với volume Postgres cũ chưa có quyền CREATE, áp dụng các lệnh GRANT tương ứng đã có trong `deploy/postgres/init/02-roles-schemas.sql`; không xóa volume để sửa lỗi này. Phiên kiểm thử đã áp dụng các GRANT đó và migrate/seed thành công.

Ở `tripflix-fe`:

```powershell
pnpm install --frozen-lockfile
pnpm gen:api
pnpm dev
```

Web: http://localhost:3100 · Admin: http://localhost:3200 · API health: http://localhost:8080/health · Swagger: http://localhost:8080/docs.

Seed có `member@tripflix.local`, `moderator@tripflix.local`, `superadmin@tripflix.local`; mật khẩu là `SEED_PASSWORD` đã dùng khi seed. Seed giữ nguyên tài khoản đã tồn tại.

Mobile native dùng `EXPO_PUBLIC_API_URL=http://10.0.2.2:8080` trên Android emulator, hoặc IP LAN của máy trên điện thoại thật. Expo web trên máy tính dùng `http://localhost:8080`; thêm origin của trang web mobile vào `AUTH_WEB_ORIGINS` rồi khởi động lại BE/Expo.

Bản xem trước mobile web đã export được phục vụ tại http://localhost:8084:

```powershell
pnpm --filter @tripflix/mobile exec expo export --platform web --output-dir web-build
node tests/fixtures/serve-mobile.cjs
```

Để chạy kiểm thử trình duyệt, đặt `PLAYWRIGHT_PACKAGE` trỏ tới bản Playwright/Playwright Core đã cài ngoài repo, rồi chạy `node tests/e2e/api-integration.cjs`. Có thể đổi các URL bằng `WEB_PREVIEW_URL`, `ADMIN_PREVIEW_URL`, `MOBILE_PREVIEW_URL`, `API_PREVIEW_URL`; script chỉ chấp nhận localhost. Dùng `TRIPFLIX_TEST_PASSWORD` nếu seed password đã thay đổi. Script tạo tài khoản `integration-*@example.test`, xóa mềm bài kiểm thử và khôi phục giá phòng trong finally; tài khoản kiểm thử được giữ vì BE chưa có API xóa tài khoản.

## Evidence giao diện

Ảnh và kết quả JSON nằm ngoài Git tại `C:/Users/ADMIN/.codex/visualizations/2026/11/05/01a1a9aa-8b59-7d62-b98e-78403bb40fde/api-integration/`:

- `web-post.png`, `web-search.png`.
- `admin-staff.png`, `admin-calendar.png`, `admin-moderation.png`.
- `mobile-post.png`, `mobile-search.png`.
- `results.json` ghi những luồng thực tế đã pass; các file `*-failure.png`/`failure.json` nếu còn là lịch sử những lần chạy trước, không phải kết quả cuối.

## Ảnh hưởng tới phần của người khác

- Trang: các route/provider mobile, adapter SecureStore và các màn hình live.
- Thành: route/provider web/admin, màn hình live, style cho form và component; social controller/DTO/filter BE.
- Dũng: HTTP client dùng chung và cấu hình ví dụ origin, không sửa kiến trúc xác thực BE.
- Duy/Thắng: dùng discovery/commerce qua API hiện có, không sửa nghiệp vụ/schema của hai module.
- Đã duyệt trong chat trước khi sửa. Không tự sửa `RULES.md`, CI, compose hoặc migration cũ.
