# TF112 — Web: SEO cơ bản (metadata, Open Graph, sitemap, noindex, JSON-LD khách sạn)

- Jira: [SCRUM-182](https://tripflix.atlassian.net/browse/SCRUM-182) · Nhánh: `trang/TF112-seo-web` · Người làm: Trang (dùng AI: có) · Ngày: 2026-11-19

## Đã làm

- `packages/api-client`: thêm `seoApi` (export riêng `@tripflix/api-client/seo`) đọc khách sạn, bài, hồ sơ, danh sách bài công khai phía server. Mỗi request có `baseUrl` riêng, không gắn token, không refresh phiên. `HttpRequestOptions` thêm field tuỳ chọn `baseUrl` (trước đây chỉ `httpRaw` nhận), không đổi hành vi cũ.
- `packages/i18n`: nhóm chuỗi `seo` (tiêu đề, mô tả mặc định, mẫu tiêu đề khách sạn/lộ trình/hồ sơ).
- `apps/web`:
  - `src/lib/site.ts`: `NEXT_PUBLIC_SITE_URL` (mặc định `https://tripflix.io.vn`), `API_INTERNAL_URL` cho server gọi API; cập nhật `.env.example`.
  - Layout gốc: `metadataBase`, tiêu đề và mô tả mặc định, Open Graph, Twitter card, ảnh chia sẻ `public/brand/og-default.jpg` (1200×630, cắt từ ảnh hero có sẵn). Không đặt canonical/og:url ở layout vì trang con sẽ kế thừa; trang chủ tự khai canonical `/`.
  - `generateMetadata` cho `/hotels/[id]`, `/trip-plans/[postId]`, `/u/[id]`: tiêu đề, mô tả (cắt ≤160 ký tự ở ranh giới từ), ảnh, canonical theo dữ liệu thật; API lỗi thì dùng metadata dự phòng. React `cache` gộp lần gọi của metadata và JSON-LD trong một request, timeout 4 giây.
  - Canonical khách sạn theo **id** (`/hotels/P-h-nt-01`), không theo slug: link nội bộ (tìm kiếm, lộ trình) và sitemap đều dùng id.
  - `sitemap.ts` (dynamic, vì lúc build Docker chưa có API): trang cố định, khách sạn trong chuyến đi, lộ trình, hồ sơ tác giả. Đọc tối đa 20 trang × 50 bài; hồ sơ được kiểm tra mở được (tác giả dữ liệu mẫu không có tài khoản trả 404) rồi mới đưa vào.
  - `robots.txt` thêm dòng `Sitemap`, giữ nguyên danh sách chặn của TF64.
  - `noindex, follow` cho `/search`, nhóm `(auth)` (đăng nhập, đăng ký, quên/đặt lại mật khẩu, xác thực email), `/onboarding`, `/coming-soon`.
  - JSON-LD `Hotel` (địa chỉ, toạ độ, hạng sao, `AggregateRating`, `priceRange`, giờ nhận/trả phòng, tiện nghi) và `BreadcrumbList` trên trang khách sạn; chuỗi JSON được escape `<`, U+2028, U+2029.

## Đối chiếu "Xong khi"

| Tiêu chí (Jira) | Đạt | Bằng chứng |
|---|---|---|
| HTML trang khách sạn, lộ trình, hồ sơ có title/description/og:image/canonical riêng | Đạt | `curl -A Googlebot` trên dev server (mục Kết quả kiểm tra); `page-metadata.test.ts` |
| `/sitemap.xml` trả URL tuyệt đối trên tripflix.io.vn; `/robots.txt` có dòng Sitemap | Đạt | `curl /sitemap.xml` (25 URL), `curl /robots.txt`; `sitemap-entries.test.ts`, `robots.test.ts` |
| Trang tìm kiếm, đăng nhập, onboarding có `noindex` | Đạt | `<meta name="robots" content="noindex, follow"/>` trên `/search`, `/login` |
| JSON-LD Hotel hợp lệ | Đạt (cấu trúc) | `hotel-json-ld.test.ts`; kiểm bằng Rich Results Test sau khi deploy staging/production |
| Lint, typecheck, test pass; có file evidence | Đạt | Mục Kết quả kiểm tra |

## Kết quả kiểm tra

- `pnpm turbo run lint typecheck test --filter=./apps/web --filter=./packages/api-client --filter=./packages/i18n --force`: 9/9 task thành công.
  - web: 45 file test, 324 test pass. api-client: 35 file, 297 test pass. i18n: 2 test pass.
  - Lint: 0 lỗi. 28 warning của web và 1 warning của api-client nằm ở file có sẵn, không thuộc task; oxlint trên các file của task: 0 warning.
- `npx next build` (apps/web): build thành công, `/sitemap.xml` và `/hotels/[id]` là route dynamic, `/robots.txt` static.
- Dev server + core-api local, `curl -A "Googlebot/2.1"`:
  - `/hotels/P-h-nt-01`: `<title>Vinpearl Beach Nha Trang, Nha Trang · Giá tốt, đặt phòng nhanh | Tripflix</title>`, canonical `https://tripflix.io.vn/hotels/P-h-nt-01`, 4 `og:image`, JSON-LD Hotel + BreadcrumbList.
  - `/trip-plans/018d9f20-…-005`: tiêu đề bài, mô tả từ nội dung, `og:type=article`, canonical đúng.
  - `/u/34c57183-…`: `Thành viên mẫu trên Tripflix | Tripflix`, ảnh OG mặc định, `og:type=profile`.
  - `/`: tiêu đề mặc định, canonical `https://tripflix.io.vn`.
  - `/search?q=nha`, `/login`: `noindex, follow`.
  - `/hotels/khong-ton-tai`: metadata dự phòng, trang vẫn render.
  - `/sitemap.xml`: 25 URL (5 cố định, 8 khách sạn, 10 lộ trình, 2 hồ sơ); hồ sơ tác giả seed trả 404 đã bị loại.

## Cách kiểm lại

1. Chạy core-api local (gateway `http://localhost:8080`), rồi `cd apps/web && npx next dev -p 3111`.
2. `curl -s http://localhost:3111/robots.txt` và `curl -s http://localhost:3111/sitemap.xml`.
3. `curl -s -A "Googlebot/2.1" http://localhost:3111/hotels/<hotelId>` rồi tìm `<title>`, `rel="canonical"`, `og:image`, `application/ld+json`.
4. Sau khi deploy: dán URL khách sạn vào https://search.google.com/test/rich-results và https://developers.facebook.com/tools/debug/; khai báo `https://tripflix.io.vn/sitemap.xml` trong Google Search Console.

## Ảnh / video

- Không đổi giao diện hiển thị (chỉ thêm thẻ trong `<head>` và script JSON-LD). Ảnh chia sẻ mặc định: `apps/web/public/brand/og-default.jpg`.

## Ảnh hưởng tới phần của người khác

- Có: `apps/web` (chủ code: Thành). Sửa `app/layout.tsx`, `robots.ts` + `robots.test.ts` (TF64, chỉ thêm dòng `sitemap`), `page.tsx` của trang chủ, `hotels/[id]`, `trip-plans/[postId]`, `u/[id]`, `search`, `onboarding`, `coming-soon`, `(auth)/layout.tsx`. Chỉ thêm/đổi export metadata; `hotels/[id]` bọc thêm thẻ JSON-LD cạnh `HotelScreen`, không đổi component hiển thị. Cần Thành duyệt PR.
- `packages/api-client/src/http.ts`: thêm field tuỳ chọn `baseUrl` vào `HttpRequestOptions`, tương thích ngược.

## Còn lại / đề xuất task sau

- Nội dung chính của trang khách sạn, lộ trình, hồ sơ vẫn render phía client (React Query); nên prefetch phía server + hydrate để HTML ban đầu có nội dung.
- Staging dùng cùng `NEXT_PUBLIC_SITE_URL` mặc định nên canonical trỏ về production; nên chặn index staging (robots/`X-Robots-Tag`) và truyền `NEXT_PUBLIC_SITE_URL` qua build arg của Dockerfile.
- Khách sạn không tồn tại vẫn trả HTTP 200; nên trả 404 (`notFound()`) khi API báo không có.
- Chưa có endpoint liệt kê toàn bộ khách sạn, nên sitemap chỉ có khách sạn xuất hiện trong bài viết.
