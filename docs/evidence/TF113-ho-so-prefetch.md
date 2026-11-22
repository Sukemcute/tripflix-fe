# TF113 — Hồ sơ: hiển thị nội dung từ server (PR 1/3: hồ sơ)

- Jira: [SCRUM-183](https://tripflix.atlassian.net/browse/SCRUM-183) · Nhánh: `trang/TF113-prefetch-ho-so` · Người làm: Trang (dùng AI: có) · Ngày: 2026-11-20
- Kế hoạch đã Thành duyệt. PR này chỉ làm trang hồ sơ `/u/[id]`. Lộ trình và khách sạn làm ở PR sau.

## Đã làm

- `packages/api-client`:
  - `profile-query-keys.ts` (mới): khoá cache hồ sơ và vlog, không kéo React vào. `public-profile.ts` dùng lại, giá trị khoá không đổi.
  - `seo.ts`: `listAuthorVlogs(authorId)` đúng tham số `useAuthorVlogs` gọi ở client (`author_id`, `post_type=vlog`, ẩn danh).
- `apps/web`:
  - `features/seo/public-data.ts`: `findPublicAuthorVlogs` (có `cache()`, timeout 2 giây, lỗi trả null). Hàm metadata giữ nguyên.
  - `features/seo/profile-hydration.ts` (mới): dựng trạng thái dehydrate từ hồ sơ và trang 1 vlog. Dữ liệu null thì bỏ qua.
  - `app/u/[id]/page.tsx`: đọc hồ sơ và vlog song song, bọc `PublicProfile` trong `HydrationBoundary`. Không đổi giao diện.
- Không đổi `session.ts` và không đổi cách clear cache khi đăng nhập (theo góp ý của Thành, sẽ bàn sau khi có video).

## Đối chiếu "Xong khi"

| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| HTML ẩn danh có tên hồ sơ, tiêu đề, nội dung vlog | Đạt | `curl -A Googlebot` trên `next start` với API production, tác giả `797b7c90-…`: có "Quang cảnh sống động" và "đẹp quá đi thôi" trong HTML; có trạng thái dehydrate |
| Khoá client khớp khoá server | Đạt | `profile-hydration.test.ts`: đọc lại sau hydrate bằng đúng khoá; test khoá giá trị |
| Dữ liệu lỗi không hydrate, trang vẫn chạy | Đạt | Test "bỏ qua phần nào null"; `readOrNull` trả null khi lỗi/timeout |
| Không đổi giao diện | Đạt | Chỉ đổi nguồn dữ liệu ban đầu, không đổi component |
| Người đã đăng nhập không bị nháy skeleton | **Chưa đo** | Cần quay video, xem phần "Việc còn lại" |
| Hydration mismatch trong console | **Chưa đo** | Cần mở trình duyệt thật, xem console |

## Kết quả kiểm tra

- `pnpm turbo run lint typecheck test --filter=./apps/web --filter=./packages/api-client --filter=./packages/i18n --force`: 9/9 task thành công.
  - api-client: 37 file, 315 test pass (gồm 1 test mới cho `listAuthorVlogs`).
  - web: 59 file, 417 test pass (gồm 3 test mới cho `profile-hydration`).
  - Lint: không có warning mới ở file đã sửa. Warning có sẵn: web 28, api-client 1.
- `next build`: thành công, `/u/[id]` là route dynamic.
- Đo TTFB (`curl`, UA Googlebot, `next start`, API production):
  - Lần đầu: 0,217 giây.
  - Lần sau (cache): 0,015 giây.
  - Chưa đo bản trước PR để so sánh. Cần chạy lại trên `develop` nếu Thành muốn số liệu trước/sau.

## Việc còn lại

1. **Quay video người đã đăng nhập** mở `/u/<id>` có vlog, xem có nháy nội dung → loading → nội dung không (theo góp ý của Thành). Cách làm: quay màn hình từ lúc vào trang đến khi đăng nhập xong. Đính kèm vào PR.
2. Kiểm tra console trình duyệt khi tải trang ẩn danh và khi đã đăng nhập, xem có hydration mismatch không.
3. Quyết định về `session.ts` sau khi có video (Thành đề xuất, không làm trong PR này).

## Ảnh hưởng tới phần của người khác

- `apps/web/src/app/u/[id]/page.tsx`: trang hồ sơ, chủ code là Thành. Thành đã duyệt kế hoạch.
- `packages/api-client/src/public-profile.ts`: đổi nguồn khoá sang `profile-query-keys.ts`, giá trị không đổi. Cần Thành xem.
