# TF25 — Sửa bug spam react làm Reels web đứng (PR 1)

- Phạm vi: brief `fix-react-spam.md` (mục 5a, 5b, 5c) · Nhánh: `thanh/TF25-reels-chong-spam-react` · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-19

## Đã làm
- **5a — Thu hẹp invalidate sau react (`apps/web/src/features/social/reel-reaction-batch.ts`, `live-posts.tsx`):**
  - Tách `invalidateAfterReelEngagement(client, postId)`: sau react chỉ invalidate đúng `['social', 'post', postId]` và đánh dấu stale `['feed']` với `refetchType: 'none'`.
  - Bỏ invalidate rộng `['social']` để không tải lại toàn bộ bình luận, reply, tóm tắt AI hay quyền bình luận khi thả tim / lưu / chia sẻ.
- **5b — Gộp lần bấm + chạy tuần tự + giữ optimistic an toàn (`reel-reaction-batch.ts`, `live-posts.tsx`):**
  - Tách logic gộp thuần `createReactionBatcher`: tim/lưu đổi optimistic ngay lập tức (kèm `updateReelSocialCache`), nhưng gộp các lần bấm liên tiếp trong cửa sổ `400 ms` theo `(type, postId)` và chỉ gửi 1 request `PUT` với trạng thái cuối; nếu trạng thái cuối trùng trạng thái server thì bỏ qua (0 request).
  - Áp dụng `mutationKey: ['reel-engagement']` và `scope: { id: 'reel-engagement' }` của TanStack Query v5 để các request chạy tuần tự.
  - Chỉ xoá state optimistic và invalidate bài viết khi không còn timer hoặc request nào của bài đó đang chờ (`markSettled`).
  - Khi lỗi, `shouldRollbackOnError` kiểm tra không có lần bấm hoặc request nào xếp sau rồi mới rollback, tránh ghi đè thao tác sau; nếu request trước lỗi trong khi request sau đang chờ debounce thì tự đặt lại baseline về trạng thái server thật cuối cùng.
  - Áp dụng thống nhất qua `triggerToggleReaction` cho cả nút Thích, nút Lưu ở thanh action và nút Lưu trong `PostOptionsMenu`.
  - Khi unmount / rời trang: gọi `batcher.flushAll()` trong cleanup của `useEffect` để gửi nốt thao tác người dùng đã thấy trên UI (không gọi `setState` sau unmount nhờ `isMountedRef`).
- **5c — Không khoá video vĩnh viễn khi gặp lỗi media (`live-posts.tsx`, `live-posts.module.css`):**
  - Tự động xoá `mediaErrorPostId` khi chuyển sang Reel khác (`resolveMediaErrorOnPostChange`).
  - Màn lỗi video `reelPendingStage` thêm nút **Thử lại** (`vi.api.retry`) theo đúng style sạch sẽ dùng tokens (không neon/glow/blur/gradient): xoá lỗi, reset `firstFrameUrl` và `authRetryCount`, tăng `retryNonce` (thêm `isMediaError` và `retryNonce` vào deps của effect gắn nguồn), không sửa `reel-hls.ts`.
- **Unit tests (`apps/web/src/features/social/reel-reaction-batch.test.ts`, 7 tests):**
  - Kiểm gộp 5 lần bấm trong 400 ms → 1 request trạng thái cuối; bấm chẵn lần → 0 request + dọn optimistic; chỉ xoá optimistic & invalidate khi hết mutation chờ; rollback khi lỗi không đè lần bấm sau; `flushAll()` khi unmount; `QueryClient` thật + spy `invalidateQueries` chứng minh không invalidate `['social', 'comments', ...]` / `['social', 'summary', ...]`; `resolveMediaErrorOnPostChange` và nút Thử lại / `retryNonce`.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| 5a: Chỉ invalidate `['social','post',postId]` và `['feed']` (`refetchType: 'none'`) | Đạt | `reel-reaction-batch.ts`, `reel-reaction-batch.test.ts` (QueryClient thật + spy) |
| 5b: Optimistic ngay, debounce 400ms theo bài, tuần tự `mutationKey` + `scope`, rollback an toàn, gửi nốt khi unmount | Đạt | `reel-reaction-batch.ts`, `live-posts.tsx`, `reel-reaction-batch.test.ts` |
| 5c: Reset `mediaErrorPostId` khi đổi bài + nút "Thử lại" (`vi.api.retry`) + `retryNonce`, không sửa `reel-hls.ts` | Đạt | `live-posts.tsx`, `live-posts.module.css`, `reel-reaction-batch.test.ts` |
| Lint, typecheck, test `@tripflix/web` pass, không tăng cảnh báo lint | Đạt | Xem mục Kết quả kiểm tra |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/web`: **3/3 tasks pass**
  - `lint`: **0 errors, 28 warnings** (bằng đúng baseline `origin/develop` @ `38cfb41`; **0 cảnh báo mới**).
  - `typecheck`: **0 errors** (`next typegen && tsc --noEmit`).
  - `test`: **41/41 test files pass (301 tests pass)** (trong đó `reel-reaction-batch.test.ts`: 7/7 pass).
- Đã kiểm tra server dev `http://localhost:3100/inspiration` trả HTTP `200`, nhưng chưa đo trực tiếp trong DevTools trình duyệt / đăng nhập phiên để đếm request khi bấm tim 10 lần trên UI (cần người dùng hoặc kiểm thử E2E trình duyệt có phiên đăng nhập thực hiện theo mục Cách kiểm lại).

## Cách kiểm lại
1. Chạy unit test, lint, typecheck:
   `pnpm turbo run lint typecheck test --filter=@tripflix/web`
2. Mở `/inspiration` (Reels) trên trình duyệt đã đăng nhập, mở DevTools → Network (lọc `api`), bấm nút tim 10 lần liên tiếp trong ~1–2 giây:
   - Trước sửa: phát sinh hàng chục request `reaction`, `posts/:id`, `comments`, `summary` (kèm các request bị huỷ).
   - Sau sửa: chỉ phát sinh tối đa 1 request `PUT /reaction` (hoặc 0 nếu số lần bấm chẵn), 1 request `GET /posts/:id` sau khi hoàn tất, không tải lại `/comments` hay `/summary`.
3. Kiểm màn lỗi media: chuyển qua bài khác thấy lỗi tự xoá; bấm nút **Thử lại** thấy video gắn lại nguồn phát.

## Ảnh / video
- Không đính kèm theo yêu cầu (không chụp ảnh vào evidence).

## Ảnh hưởng tới phần của người khác
- Chỉ sửa `apps/web/src/features/social/*` (`live-posts.tsx`, `live-posts.module.css`, `reel-reaction-batch.ts`, `reel-reaction-batch.test.ts`).
- Không sửa `reel-hls.ts` (luồng `onAuthError`/cookie của Phong) và không sửa `packages/api-client` (`reel-social-cache.ts`).
