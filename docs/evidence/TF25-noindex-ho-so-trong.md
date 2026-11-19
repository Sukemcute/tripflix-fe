# TF25 — `noindex` trang cá nhân chưa có bài công khai (Web)

- Nhánh: `thanh/TF25-noindex-ho-so-trong` (từ `origin/develop`) · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-19

## Đã làm
1. **Kiểm tra bài công khai của tác giả bằng endpoint sẵn có (`apps/web/src/features/seo/public-data.ts`):**
   - Dùng `postsControllerListPublicPosts({ author_id: userId, limit: 1 }, { baseUrl: getServerApiUrl(), signal, skipAuthorization: true, skipAuthRefresh: true })` (`GET /api/v1/posts?author_id=...&limit=1`, không truyền `post_type` nên bao gồm mọi loại bài công khai đã đăng).
   - Thêm `hasPublicProfilePosts` bọc bằng React `cache()` và `readOrNull` (timeout `LOOKUP_TIMEOUT_MS = 2_000`ms) để dùng chung cache theo request và fail-safe trả `null` khi lỗi/timeout. Không sửa `packages/api-client`.
2. **Đặt `robots: NOINDEX_ROBOTS` giữ nguyên Open Graph (`apps/web/src/features/seo/page-metadata.ts`, `apps/web/src/app/u/[id]/page.tsx`):**
   - `generateMetadata` ở `app/u/[id]/page.tsx` gọi song song `Promise.all([findPublicProfile(id), hasPublicProfilePosts(id)])`.
   - `buildProfileMetadata(profile, { hasPublicPosts })`: nếu `hasPublicPosts === true` thì giữ nguyên (cho index); nếu `hasPublicPosts === false` (chưa có bài công khai) hoặc `null` (lỗi/timeout kiểm bài) thì gắn `robots: NOINDEX_ROBOTS` (`{ index: false, follow: true }`) và giữ đầy đủ `title`, `description`, `alternates.canonical`, `openGraph`, `twitter`. Hồ sơ không tồn tại / lỗi API profile giữ nguyên fallback `buildProfileFallbackMetadata(id)` (`noindex`).
3. **Unit tests (`apps/web/src/features/seo/page-metadata.test.ts`, `public-data.test.ts`):**
   - Kiểm đủ các nhánh: có bài → không `noindex`; không bài → `NOINDEX_ROBOTS` + vẫn giữ Open Graph; lỗi/timeout kiểm bài → trả `null` và `buildProfileMetadata` đặt `NOINDEX_ROBOTS` + giữ OG; gọi `hasPublicProfilePosts` nhiều lần cùng request chỉ gọi API 1 lần qua `cache()`, gửi ẩn danh không kèm token/refresh.

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/web --filter=@tripflix/api-client`: **6/6 tasks pass**:
  - `@tripflix/web`: `oxlint` **28 warnings, 0 errors** (không tăng so với baseline 28); `next typegen && tsc --noEmit` **0 errors**; `vitest run` **50/50 files (368/368 tests) pass**, gồm `page-metadata.test.ts` (`12/12`) và `public-data.test.ts` (`6/6`).
  - `@tripflix/api-client`: `oxlint` **1 warning cũ, 0 errors**; `tsc --noEmit` **0 errors**; `vitest run` **35/35 files (297/297 tests) pass**.

## Cách kiểm lại
1. `pnpm turbo run lint typecheck test --filter=@tripflix/web --filter=@tripflix/api-client`

## Ảnh hưởng tới phần của người khác
- Chỉ sửa trong code SEO (`apps/web/src/features/seo/public-data.ts`, `page-metadata.ts`, các test SEO, và `apps/web/src/app/u/[id]/page.tsx`) từ PR #293 (TF112, của Trang). Không sửa `packages/api-client`.
