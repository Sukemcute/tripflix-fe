# TF25 — SEO hồ sơ: tính cả Reels và gọi qua seoApi

- Nhánh: `trang/TF25-seo-ho-so-reels` · Người làm: Trang (dùng AI: có) · Ngày: 2026-11-20
- Nối tiếp phần noindex hồ sơ của Thành (đã merge vào `develop`). Hai điểm góp ý trong review được sửa ở đây.

## Đã làm

1. **Tính cả Reels khi quyết định index hồ sơ.** `GET /api/v1/posts` không trả Reels, nên trước đây người chỉ đăng Reels bị noindex dù hồ sơ có nội dung công khai. Thêm `seoApi.hasPublicContent`: kiểm tra 1 bài công khai qua danh sách bài; nếu không có thì kiểm tra 1 Reels qua `GET /api/v1/feed?author_id=…&limit=1`. Cả hai đều ẩn danh, không gửi token.
2. **Gọi API qua `seoApi`.** `public-data.ts` không còn gọi hàm sinh tự động trực tiếp. Tên hàm `hasPublicProfilePosts` và cơ chế React `cache` giữ nguyên, nên trang `u/[id]` không đổi.
3. **Test đủ 3 trường hợp** (đã có từ trước, nay cập nhật theo chỗ đọc mới):
   - có bài công khai → true;
   - không có bài nhưng có Reels → true;
   - không có gì → false;
   - lỗi hoặc timeout → null (noindex, Open Graph vẫn giữ).

## Đối chiếu với sitemap

Sitemap chỉ đưa hồ sơ có bài công khai (đọc từ danh sách bài). Hồ sơ chỉ có Reels nay có thể được index nhưng chưa nằm trong sitemap. Việc này không gây hại. Muốn đưa vào sitemap thì cần thêm nguồn Reels, làm trong TF116.

## Kết quả kiểm tra

- `pnpm turbo run lint typecheck test --filter=./apps/web --filter=./packages/api-client --filter=./packages/i18n --force`: 9/9 task thành công.
  - api-client: 37 file, 313 test pass (gồm 6 test mới cho `hasPublicContent`).
  - web: 57 file, 413 test pass (test SEO: 36 pass).
  - Lint: 0 lỗi. Warning có sẵn ở file không thuộc task: web 28, api-client 1. Các file đã sửa: 0 warning.

## Cách kiểm lại

1. `cd packages/api-client && npx vitest run src/seo.test.ts`: mục `hasPublicContent` (6 ca).
2. `cd apps/web && npx vitest run src/features/seo`: mục `hasPublicProfilePosts (bài hoặc Reels)`.

## Ảnh hưởng tới phần của người khác

- `apps/web/src/features/seo/public-data.ts` và test: phần của Thành (TF25). Chỉ đổi nguồn gọi API, không đổi tên hàm hay cách dùng.
- `packages/api-client/src/seo.ts` và test: phần của TF112 (Trang). Chỉ thêm một hàm.
