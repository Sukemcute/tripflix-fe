# TF25 — Giảm vẽ lại khung Reels (PR 2a / mục 5d)

- Phạm vi: mục 3 và mục 6 (commit 1–2) trong `plan-player-pool.md` · Nhánh: `thanh/TF25-reels-giam-ve-lai` (tạo từ `thanh/TF25-reels-chong-spam-react` / PR 1) · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-19

## Đã làm
1. **Commit 1 (`1721dff`) — `perf(web): giữ nguyên ReelPost khi thẻ Reels không đổi`:**
   - Cập nhật `toReelPost(card, cache?)` trong `apps/web/src/features/social/reel-post.ts` dùng `WeakMap<FeedCardDto, ReelPost>` (`defaultReelPostCache` hoặc cache truyền vào).
   - Trong `InspirationImmersiveViewer` (`apps/web/src/features/social/live-posts.tsx`), giữ `reelPostCache` ổn định theo component (`useState(() => new WeakMap<FeedCardDto, ReelPost>())`) và truyền vào `toReelPost(card, reelPostCache)` trong `useMemo` tạo `rawPosts`. Khi `updateReelSocialCache` chỉ thay tham chiếu thẻ `FeedCardDto` của bài vừa bấm tim/lưu, các Reel khác giữ nguyên hoàn toàn tham chiếu `ReelPost`.
   - Thêm unit test trong `apps/web/src/features/social/reel-post.test.ts` kiểm tra cùng tham chiếu `FeedCardDto` trả cùng object `ReelPost` (`toBe`), còn thẻ mới (ví dụ sau khi đổi `counts.likes`) trả object mới (`not.toBe`), thẻ khác giữ nguyên tham chiếu.

2. **Commit 2 (`a0778e2`) — `perf(web): memo MediaTrackItem và cột tương tác của từng Reel`:**
   - Tách hàm thuần `ReelEngagement`, `computeReelEngagement` và `reuseReelEngagement` sang `apps/web/src/features/social/reel-post.ts`: chỉ tạo object `ReelEngagement` mới khi 1 trong 6 trường (`isLiked`, `isSaved`, `likes`, `saves`, `comments`, `shares`) thay đổi; giữ nguyên tham chiếu cũ cho các Reel còn lại.
   - Bọc `React.memo` cho cả `ReelActionRail` và `MediaTrackItem` trong `apps/web/src/features/social/live-posts.tsx`.
   - Đổi prop của `MediaTrackItem` sang giá trị nguyên thuỷ / tham chiếu ổn định:
     - `mediaErrorPostId`, `captionExpandedPostId` → `isMediaError: boolean`, `isCaptionExpanded: boolean`.
     - `isPlaying`, `showPlayFlash`, `isMuted`, `isCommentOpen`: chỉ truyền giá trị thật cho bài đang xem (`idx === activeIndex`), các bài khác nhận hằng cố định (`false`, `false`, `true`, `false`).
     - Bỏ `actions={renderReelActions(...)}` tạo `ReactNode` mới mỗi lần render; `MediaTrackItem` tự render `<ReelActionRail>` từ `engagement` (qua `engagementByPostId` dùng `reuseReelEngagement`), `isSignedIn`, `loginHref`, `isCommentOpen` và các handler `useCallback` theo `post.id`.
     - Đổi `user` object thành `viewerUserId` / `viewerDisplayName` (nguyên thuỷ).
     - Bỏ `itemRef` inline, thay bằng `registerItemRef` (`useCallback(..., [])`) gắn qua `attachItemRef` theo `index`.
     - Bọc `useCallback` cho `handleMediaError`, `handleToggleCaption`, `handleOpenTag`, `handleOpenItinerary` (đọc `activePostIdRef.current`), `handleToggleLike`, `handleToggleSave`, `handleShareReel` (đọc `postMapRef.current`), `handleToggleReelComments` (đọc `activePostRef.current` và `setRightOpen` hàm cập nhật).
   - Giữ nguyên hành vi gộp lần bấm PR 1 (`triggerToggleReaction`, debounce `400 ms`, `scope` tuần tự, `retryNonce`), không đụng `reel-hls.ts`, `packages/api-client`, không làm player pool (PR 2b), không thêm thư viện.
   - Thêm unit test trong `reel-post.test.ts` (`computeReelEngagement & reuseReelEngagement`) và `apps/web/src/features/social/reel-memo.test.ts` (giả lập cửa sổ 7 Reel bằng `Object.is` và kiểm tra cấu trúc memo trong `live-posts.tsx`).

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/web`: **3/3 tasks pass**
  - `lint` (`oxlint -c ../../.oxlintrc.json src`): **0 errors, 28 warnings** (252 files, 158 rules — giữ đúng baseline `28`, không tăng cảnh báo).
  - `typecheck` (`next typegen && tsc --noEmit`): **0 errors**.
  - `test` (`vitest run`): **42/42 test files pass (306 tests pass)**, gồm:
    - `src/features/social/reel-post.test.ts`: 28 tests pass
    - `src/features/social/reel-memo.test.ts`: 2 tests pass
    - `src/features/social/reel-reaction-batch.test.ts`: 7 tests pass
- **Đo render khi bấm tim / nháy play:**
  - Repo chưa cài `jsdom`/`@testing-library/react` và môi trường máy hiện không bật `core-api` ở cổng `3000` (kiểm tra `http://localhost:3000/v1/health` timeout, mở `http://localhost:3100/inspiration` thấy `domItems: 0`, phiên chưa đăng nhập nên chưa bấm nút tim thật trên trình duyệt được).
  - Kiểm chứng qua unit test so sánh nông `Object.is` toàn bộ prop của 7 `MediaTrackItem` trong cửa sổ Reels (`reel-memo.test.ts`): trước PR 2a, toàn bộ 7/7 `MediaTrackItem` nhận `actions`/`itemRef`/callback mới mỗi lần render; sau PR 2a, khi bấm tim 1 Reel hoặc bật/tắt `showPlayFlash`/`isRightOpen`, **chỉ 1/7 `MediaTrackItem`** đổi prop (6/7 giữ nguyên toàn bộ tham chiếu prop và được `React.memo` bỏ qua).

## Cách kiểm lại
1. Chạy `pnpm turbo run lint typecheck test --filter=@tripflix/web` tại gốc `tripflix-fe`: phải pass với `0 errors`, tối đa `28 warnings` lint.
2. Đo React Profiler thực tế trên bản production/profiling có BE chạy + đã đăng nhập: mở `/inspiration`, bật Profiler → Record, bấm tim 1 lần và bấm tạm dừng/phát 1 lần: số `MediaTrackItem` render lại giảm từ toàn bộ cửa sổ (~7) xuống `1` (chỉ bài bị tác động).

## Ảnh hưởng tới phần của người khác
- Không sửa `apps/web/src/features/social/reel-hls.ts` (luồng `onAuthError`/cookie của Phong) và không sửa `packages/api-client`.
- Chỉ sửa trong `apps/web/src/features/social/`: `reel-post.ts`, `reel-post.test.ts`, `reel-memo.test.ts`, `live-posts.tsx`.
