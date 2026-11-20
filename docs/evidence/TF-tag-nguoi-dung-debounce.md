# TF-tag-nguoi-dung-debounce — Debounce tìm `@mention`, giữ kết quả cũ & báo lỗi đúng

- Worktree: `wt-fe-mention` · Nhánh: `thanh/TF-tag-nguoi-dung-debounce` (từ `origin/develop`) · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-20

## Đã làm
1. **Tách hook `useDebouncedValue` dùng chung (`apps/web/src/features/shared/use-debounced-value.ts`):**
   - Nhận `(value, delayMs)` và dùng helper thuần `scheduleDebouncedCommit` để huỷ bộ đếm cũ khi giá trị đổi liên tiếp.
   - `apps/web/src/features/social/composer/trip-plan-editor.tsx` bỏ hàm `useDebounced` cục bộ và dùng lại `useDebouncedValue(..., SEARCH_DEBOUNCE_MS)` (giữ nguyên `300ms`).
2. **Debounce 250ms & trạng thái hiển thị ở `MentionPicker` (`apps/web/src/features/social/mention-picker.tsx`, `mention-picker.module.css`):**
   - Từ khoá hiển thị/kiểm tra `isSearchable` chạy ngay theo phím gõ (`resolveMentionSearchInput`), nhưng từ khoá gửi qua `useUserSearch` được debounce `MENTION_SEARCH_DEBOUNCE_MS = 250`ms. Nếu gõ chưa đủ 2 ký tự thì hiện lời nhắc `mentionSearchPrompt` ngay, không chờ debounce và không gọi API.
   - Khi đang tìm từ khoá mới có dữ liệu cũ (`isPlaceholderData || isFetching || isDebouncing`), danh sách người dùng cũ vẫn giữ nguyên trong DOM và làm mờ nhẹ qua `.userListRefreshing` (`opacity: 0.65`, tắt transition khi `prefers-reduced-motion: reduce`), không gỡ avatar `<img src=getAvatarUrl(id)>`.
   - Phân biệt lỗi qua `HttpError`: lỗi `429` hiện `vi.api.mentionRateLimited` (`"Bạn tìm hơi nhanh, thử lại sau ít giây"`), lỗi khác hiện `vi.api.mentionSearchFailed` (`"Không tìm được, thử lại"`) kèm nút `vi.api.retry` (`onMouseDown={keepInputFocus}` giữ focus ở ô nhập); chỉ hiện `vi.api.mentionNoResults` khi danh sách thực sự rỗng.
3. **Key cache không phân biệt hoa thường, `keepPreviousData`, `staleTime: 60s` (`packages/api-client/src/explore-search.ts`, `index.ts`):**
   - `normalizeUserSearchQuery`: thêm `.toLocaleLowerCase('vi')` trên `query` (backend tìm không phân biệt hoa thường/dấu) nên cả `useUserSearch` và `useInfiniteUserSearch` dùng chung key cache chữ thường (ví dụ `"Nguyen"` và `"nguyen"` cùng key `['discovery', 'users', 'nguyen']`) và gửi `q` đã hạ thường.
   - `useUserSearch`: thêm `staleTime: 60_000` (`USER_SEARCH_STALE_TIME_MS`) và `placeholderData: keepPreviousData`.
4. **Chuỗi i18n (`packages/i18n/src/api.ts`):**
   - Thêm `mentionRateLimited` và `mentionSearchFailed` ngay sau `mentionNoResults`.
5. **Unit tests:**
   - `apps/web/src/features/shared/use-debounced-value.test.ts`: gõ nhanh 5 phím trong `< 250ms` chỉ chốt 1 giá trị cuối sau `250ms`.
   - `apps/web/src/features/social/mention-picker-debounce.test.ts`: gõ 5 phím nhanh & gõ nhanh `"@nguyen van a"` chỉ gọi `searchUsers` đúng **1 lần**; xoá dưới 2 ký tự dừng tìm ngay.
   - `apps/web/src/features/social/mention-picker.test.tsx`: giữ đủ 7 test cũ, bổ sung test giữ + làm mờ danh sách cũ khi `isPlaceholderData`, test lỗi `429`, test lỗi khác + nút thử lại.
   - `packages/api-client/src/explore-search.test.ts`: test hạ thường `'vi'`, key cache chung cho `"Nguyen"`/`"nguyen"`, `staleTime: 60_000`, `keepPreviousData`.

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=./apps/web --filter=./packages/api-client --filter=./packages/i18n`: **9/9 tasks pass**:
  - `@tripflix/web`: `oxlint` **28 warnings, 0 errors**; `typecheck` **0 errors**; `vitest run` **77/77 files (521/521 tests) pass**.
  - `@tripflix/api-client`: `oxlint` **1 warning cũ, 0 errors**; `typecheck` **0 errors**; `vitest run` **38/38 files (327/327 tests) pass**.
  - `@tripflix/i18n`: `oxlint` **0 warnings, 0 errors**; `typecheck` **0 errors**; `vitest run` **1/1 file (2/2 tests) pass**.

## Cách kiểm lại
1. `pnpm turbo run lint typecheck test --filter=./apps/web --filter=./packages/api-client --filter=./packages/i18n`

## Ảnh hưởng tới phần của người khác
- `useUserSearch` cũng được gọi ở `apps/mobile/src/features/discovery/search-drop-panel.tsx:256` (của Trang — giữ nguyên chữ ký và tên trường trả về, thêm `staleTime: 60_000`, `keepPreviousData`, và `queryKey` hạ thường) và ở `apps/web/src/features/social/search-explore-results.tsx`, `search-results-grid.tsx`.

## Bổ sung: Gắn listener `document` của `MentionPicker` đúng 1 lần khi mount
- `apps/web/src/features/social/mention-picker.tsx:156–224`: giữ `{ users, activeIndex, onSelect, onClose, updateActiveIndex, keepOpenRef }` mới nhất trong `latestRef` (cập nhật qua `useEffect` không dependency để tránh warning SSR/React Compiler), đổi cả hai effect `mousedown` và `keydown` (capture) về `[]` deps để không gỡ/gắn lại mỗi phím hay khi props callback inline đổi. Không sửa `live-posts.tsx`.
- `apps/web/src/features/social/mention-picker-listeners.test.ts`: kiểm render 3 lần đổi `onClose`/`onSelect`/`users` mới hoàn toàn nhưng `document.addEventListener` chỉ gọi đúng 1 lần cho `mousedown` và 1 lần cho `keydown` (capture `true`); bấm `Enter` gọi `onSelect3` mới nhất; bấm ra ngoài gọi `onClose3` mới nhất; unmount gọi `removeEventListener` đầy đủ.
- Kiểm lại `@tripflix/web`: `lint` **28 warnings, 0 errors**; `typecheck` **0 errors**; `vitest run` **78/78 files (522/522 tests) pass**.
