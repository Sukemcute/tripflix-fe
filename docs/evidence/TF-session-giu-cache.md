# TF-session-giu-cache — Giữ cache React Query khi khôi phục phiên lúc mở app

- Notion: (chưa có mã task số) · Nhánh: `thanh/TF-session-giu-cache` (từ `origin/develop` @ c11638a) · Người làm: Thành (dùng AI: có) · Ngày: 2026-11-21

## Đã làm
- `packages/api-client/src/session-cache.ts` (mới): hàm thuần `decideCacheAction(previous, next) → 'none' | 'invalidate' | 'clear'` với `previous/next = { userId, isReady }`, và `readSessionCacheState(state)`.
- `packages/api-client/src/session.ts`: effect của `ApiSessionProvider` dùng hàm trên thay cho `if (previousUserId !== userId) queryClient.clear()`. API công khai (`ApiSessionProvider`, `useApiSession`) không đổi.
- Vì sao: trạng thái đầu là `{ user: null, isReady: false }`; khi khôi phục phiên, `SessionClient.restore()` publish người dùng (lúc `isReady` còn `false`) rồi mới publish `isReady: true`. Logic cũ thấy id đổi (chưa có → A) nên `clear()` → mọi query đã chạy trong lúc chờ (không chờ `isReady`) bị gọi lại lần hai, màn hình chớp trắng.

## Bảng 4 trường hợp (trước → sau)
| Trường hợp | userId | Trước | Sau |
|---|---|---|---|
| Khôi phục phiên lúc mở app (lần publish đầu, `isReady` false) | chưa có → A | `clear()` (gọi đúp, chớp trắng) | **không làm gì** |
| Khách đăng nhập (đã `isReady`) | chưa có → A | `clear()` | **`invalidateQueries()`**: giữ dữ liệu đang hiện, tải lại ngầm |
| Đăng xuất (`logout`, `logoutAll`) hoặc mất phiên (refresh 401 → `SessionClient.clear()`) | A → chưa có | `clear()` | `clear()` (giữ nguyên) |
| Đổi tài khoản | A → B | `clear()` | `clear()` (giữ nguyên) |
| Publish lại mà id không đổi (đổi `error`, `isReady`…) | A → A | không làm gì | không làm gì |

## Kiểm tra các nơi dùng
- `ApiSessionProvider` dùng ở `apps/web/src/app/providers.tsx`, `apps/mobile/src/app/_layout.tsx`, `apps/admin/src/app/providers.tsx` (admin: `baseUrl="/bff"`, `serverSession`). Cả ba đều nhận hành vi mới.
- Gọi đăng xuất: web `features/auth/header-account.tsx:61`, `live-account.tsx:30`, `account-security.tsx:122-123`; mobile `features/account/live-account-screens.tsx:122-123`; admin `features/shell/live-workspace.tsx:103`. **Không nơi nào tự `queryClient.clear()`/`removeQueries` toàn cục** — đều dựa vào provider, nên không trùng, không thiếu. Mất phiên do refresh 401 đi qua `SessionClient.clear()` → publish `user: null` → provider `clear()`.
- Dọn riêng không đụng cache React Query: web `onboarding/survey-logout-cleanup.tsx` (localStorage khảo sát), `checkout/cart-link.tsx` (giỏ hàng localStorage) — độc lập, không trùng.
- Không app nào tự `invalidateQueries()` sau khi đăng nhập — provider giờ làm việc này.
- Query phụ thuộc người dùng: phần lớn có `user?.id` trong key (`['notifications', user?.id]`, `['feed', tab, user?.id]`, `['feed', 'saved', user?.id]`, `['social', 'post', id, user?.id]`…) nên đổi người là đổi key, tải mới. `invalidateQueries()` lo các query còn lại (đã thích/đã lưu, quyền bình luận, viewerContext…).
- `staleTime: Infinity`: chỉ `useReelsFeed` và Reels gợi ý (`packages/api-client/src/feed.ts:62`, `:132`), đều có `user?.id` trong key → khách đăng nhập là key mới, tải lại; không bị kẹt dữ liệu khách. Ghi nhận: lúc invalidate, query Reels key khách đang active có thể tải lại ngầm một lần trước khi component chuyển sang key mới (thừa 1 request, không ảnh hưởng hiển thị).

## Đối chiếu yêu cầu
| Yêu cầu | Đạt | Bằng chứng |
|---|---|---|
| Hàm thuần + test 4 trường hợp | Có | `session-cache.test.ts` |
| StrictMode chạy effect 2 lần không clear thừa | Có | test "StrictMode chạy effect hai lần…" |
| Publish nhiều lần, id không đổi → none | Có | test "publish nhiều lần…" |
| Tái hiện lỗi với `SessionClient` thật | Có | test tích hợp: khôi phục phiên làm id đổi 1 lần (logic cũ sẽ clear), logic mới không làm gì; đăng xuất → clear; đăng nhập lại → invalidate; mở app không phiên (401) → không làm gì |
| Không đổi API công khai | Có | chỉ đổi thân effect |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=./packages/api-client --filter=./apps/web`: 6/6 task pass. api-client: lint 0 lỗi / 1 cảnh báo có sẵn (`notifications-realtime.ts:121`, không do việc này), typecheck pass, **38 file / 327 test pass**. web: lint 0 lỗi / 28 cảnh báo (mốc), typecheck pass, **72 file / 508 test pass**.
- `--filter=./apps/admin`: lint 0 lỗi / 2 cảnh báo, typecheck pass, 20 file / 67 test pass.
- `--filter=./apps/mobile`: lint 0 lỗi / 19 cảnh báo, typecheck pass; **test fail** `ERR_UNKNOWN_FILE_EXTENSION ".ts"` vì Node máy v22.17.1 (repo cần ≥ 22.22) — đã biết, không liên quan.
- Đo trên dev server (đếm request khi mở `/inspiration` lúc đã có phiên): **không làm được** — API công khai chỉ cho CORS từ `https://tripflix.io.vn` và không có tài khoản thử; không vượt chặn quyền. Thay bằng test tích hợp với `SessionClient` thật ở trên.

## Cách kiểm lại
1. Đăng nhập web, mở DevTools → Network, tải lại `/inspiration`: mỗi request bảng tin/Reels chỉ một lần sau khi khôi phục phiên, không chớp trắng.
2. Đăng xuất: dữ liệu riêng (thông báo, giỏ, đã lưu) biến mất ngay.
3. Khách mở `/inspiration` rồi đăng nhập: danh sách đang hiện giữ nguyên, trạng thái đã thích/đã lưu cập nhật ngầm.
4. Mobile: mở lại app khi đã đăng nhập, bảng tin không tải hai lần.

## Ảnh hưởng tới phần của người khác
- ⚠️ `packages/api-client/src/session.ts` do **Dũng (Binbonk5)** viết; việc sửa do anh Thành giao. Chỉ đổi thân effect, không đổi hợp đồng. Cần báo Dũng.
- Hành vi mới áp dụng cho mobile (Trang) và admin (Thành): khách đăng nhập không còn xoá cache mà tải lại ngầm.
