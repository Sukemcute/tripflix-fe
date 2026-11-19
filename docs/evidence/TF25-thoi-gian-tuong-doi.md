# TF25 — Hiển thị thời gian tương đối kiểu Facebook (web, việc A)

- Phạm vi: việc A trong `time-and-replies.md` · Nhánh: `thanh/TF25-thoi-gian-tuong-doi` (tạo từ `origin/develop`) · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-19

## Đã làm
- **Chuỗi hiển thị (`packages/i18n/src/api.ts`):**
  - Thêm các khoá `relativeTimeJustNow` (`'Vừa xong'`), `relativeTimeMinutes` (`'{count} phút'`), `relativeTimeHours` (`'{count} giờ'`), `relativeTimeDays` (`'{count} ngày'`), `relativeTimeSameYear` (`'{day} thg {month}'`); giữ nguyên các khoá `timeMinutesAgo`… đang dùng ở thẻ tìm kiếm (`search-result-card.ts`).
- **Hàm thuần & đồng hồ dùng chung (`apps/web/src/features/social/relative-time.ts`):**
  - `formatRelativeTime(value, now)` theo giờ máy người xem: tương lai hoặc `< 60 giây` → `"Vừa xong"`; `< 60 phút` → `"N phút"`; `< 24 giờ` → `"N giờ"`; `< 7 ngày` → `"N ngày"`; cùng năm → `"19 thg 11"`; khác năm → `"19/11/2025"` (dùng `Intl.DateTimeFormat('vi-VN', ...)`).
  - `formatFullDateTime(value)` cho tooltip đầy đủ ngày giờ khi rê chuột (`weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'`).
  - `subscribeRelativeClock` + `getRelativeClockSnapshot` + `getServerRelativeClockSnapshot`: dùng **một `setInterval` duy nhất (`30_000 ms`)** chia sẻ cho toàn bộ `<RelativeTime>` đang mount, tự dừng khi tab ẩn (`visibilitychange` / `document.visibilityState === 'hidden'`), cập nhật ngay khi tab mở lại và dọn sạch listener/timer khi không còn subscriber.
- **Component `<RelativeTime>` (`apps/web/src/features/social/relative-time-label.tsx`):**
  - Dùng `useSyncExternalStore` với `getServerRelativeClockSnapshot` trả `null`: SSR và lượt hydrate đầu tiên render `<time dateTime={value}>` với ngày UTC cố định (`formatAbsoluteUtcDate`), tránh lệch múi giờ/đồng hồ giữa server và client; sau mount tự chuyển sang `formatRelativeTime` kèm `title={formatFullDateTime(value)}`.
- **Điểm áp dụng:**
  - Bình luận & reply (`CommentNode` trong `apps/web/src/features/social/live-posts.tsx`, dùng chung cho Reels, tab Bài viết và tường trang cá nhân): thay `<span>{formatDateVi(comment.createdAt)}</span>` bằng `<RelativeTime value={comment.createdAt} />`, vẫn giữ nguyên nhãn `({vi.api.commentEdited})` bên cạnh khi `comment.isEdited` là `true`.
  - Thẻ bài viết (`PostCard` trong `apps/web/src/features/social/feed/post-card.tsx`, dùng ở tab Bài viết và trang cá nhân): thay `<time dateTime={post.createdAt}>{formatDateVi(post.createdAt)}</time>` bằng `<RelativeTime value={post.createdAt} />`.
  - Overlay Reels (`MediaTrackItem`) và `TripPlanView` hiện không hiển thị ngày đăng (`FeedCardDto` không có `createdAt`) nên không tự thêm UI ngoài phạm vi.
- **Unit tests (`apps/web/src/features/social/relative-time.test.tsx`, 10 tests):**
  - Kiểm đủ mốc biên: tương lai, `0s`, `59s`, `59.999s`, `60s`, `59 phút`, `59p59s`, `60 phút`, `23 giờ 59 phút`, `24 giờ`, `6 ngày`, `< 7 ngày` qua đầu năm, `>= 7 ngày` đầu năm/cuối năm cùng năm, khác năm, chuỗi lỗi.
  - Kiểm đồng hồ chung dùng Vitest fake timers + mock `document.visibilityState`: 5 subscriber chỉ tạo đúng 1 `setInterval`, dừng khi tab ẩn, bật lại khi tab hiện, dọn sạch về 0 khi huỷ hết.
  - Kiểm `renderToStaticMarkup(<RelativeTime />)`: SSR render `<time dateTime>` tuyệt đối UTC không có `title`, có `now` render tương đối + `title` đầy đủ.

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/web --filter=@tripflix/i18n`: **6/6 tasks pass**
  - `@tripflix/i18n`: `lint` `0 errors, 0 warnings`; `typecheck` `0 errors`; `test` `1/1 file (2 tests) pass`.
  - `@tripflix/web`:
    - `lint` (`oxlint -c ../../.oxlintrc.json src`): **0 errors, 28 warnings** (255 files, 158 rules — bằng đúng baseline `28`, không tăng cảnh báo).
    - `typecheck` (`next typegen && tsc --noEmit`): **0 errors**.
    - `test` (`vitest run`): **43/43 test files pass (316 tests pass)**, trong đó `src/features/social/relative-time.test.tsx`: `10/10 pass`.

## Cách kiểm lại
1. Chạy `pnpm turbo run lint typecheck test --filter=@tripflix/web --filter=@tripflix/i18n` tại `tripflix-fe`: xác nhận `0 errors`, lint `@tripflix/web` tối đa `28 warnings`, `43/43` test file web pass.
2. Mở tab Bài viết hoặc khung bình luận Reels trên web khi có dữ liệu bài/bình luận: kiểm tra mốc thời gian hiển thị dạng `"Vừa xong"`, `"N phút"`, `"N giờ"`, `"N ngày"`, `"19 thg 11"`, `"19/11/2025"`; rê chuột vào thấy tooltip ngày giờ đầy đủ; bình luận đã sửa vẫn hiện `(đã sửa)`.

## Ảnh / video
- Không đính kèm trong repo theo yêu cầu (môi trường kiểm tra không chạy BE ở cổng 3000 nên không có dữ liệu bài/bình luận live để chụp).

## Ảnh hưởng tới phần của người khác
- Thêm khoá mới trong `packages/i18n/src/api.ts` (không đổi/xoá khoá cũ).
- Không sửa `packages/app-core`, không sửa `search-result-card.ts` (vốn có bộ test riêng với định dạng `"N phút trước"` / `"12/7"`).
