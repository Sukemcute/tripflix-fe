# TF99 — Web chèn bình luận vào cache thay vì tải lại

- Jira: TF99 · Nhánh: `thanh/TF99-web-cache-binh-luan` · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-17

## Đã làm
- Thêm `apps/web/src/features/social/comment-cache.ts`: sau khi server xác nhận, sửa thẳng cache React Query thay vì `invalidateQueries(['social'])` (làm mới mọi query social đang mở, kể cả mọi trang bình luận đã cuộn và mọi trang feed).
  - Gửi: chèn lên đầu trang 1 của đúng danh sách (gốc hoặc trả lời), cộng `total`, cộng `replyCount` của bình luận gốc, cộng `commentCount` của bài ở chi tiết bài, danh sách bài (`['social', …]`) và thẻ Reels (`['feed', …]`).
  - Sửa: thay đúng dòng, giữ `replyCount` (BE không trả khi sửa), sửa cả chuỗi đang xem (`comment-thread`).
  - Xoá: bỏ khỏi mọi danh sách, bớt `total`; xoá bình luận gốc thì trừ thêm số trả lời đang hiện (BE xoá luôn trả lời) và bỏ cache trả lời của nó.
  - Giữ đúng quy tắc đếm của BE: bình luận bị giữ chờ duyệt (`held`) vẫn hiện cho người gửi nhưng không cộng `commentCount`. Trường hợp không biết chắc (sửa xong bị giữ, xoá bình luận không có trong cache) thì tải lại bài đó thay vì đoán số.
  - Tóm tắt AI chỉ đánh dấu cũ (`refetchType: 'none'`): AI tạo lại sau, không đổi ngay khi vừa gửi.
- Mở panel bình luận ở feed: `refreshCommentsIfStale` thay cho làm mới mọi trang. Dữ liệu còn mới (< `staleTime` 30 s) thì dùng luôn; đã cũ thì chỉ giữ trang đầu rồi tải lại.
- Nối vào `live-posts.tsx` (panel bình luận, `CommentNode`), `live-comments.tsx` (trang chi tiết bài, chỉ đổi `onSuccess`), `feed/social-feed-view.tsx` (lúc mở panel).

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Gửi, sửa, xoá bình luận không tải lại mọi trang | Đạt | `comment-cache.test.ts` (10 test); đo F1 bên dưới: sau khi gửi 0 request |
| Số bình luận, số trả lời đúng như BE | Đạt | test "bình luận bị giữ…", "xoá bình luận gốc…", "xoá trả lời…" |
| Mở panel không tải lại mọi trang | Đạt | test "mở lại panel khi dữ liệu đã cũ…"; đo F1 |

## Đo F1 (request web phát sinh sau khi server trả về, không tính chính lệnh gửi)
Dựng đúng các query đang mở trên trang feed cộng đồng khi panel bình luận mở (feed, bình luận, 1 luồng trả lời, chi tiết bài, tóm tắt) bằng `QueryClient` thật, gọi core-api local thật, bài có 10.000 bình luận; trung vị 5 lần.

| Thao tác | Đã cuộn | Cũ | Mới |
|---|---|---|---|
| Gửi 1 bình luận | 3 trang | 7 request · 40 KB · 149 ms | 0 |
| Gửi 1 bình luận | 10 trang | 14 request · 112 KB · 161 ms | 0 |
| Mở lại panel (dữ liệu < 30 s) | 10 trang | 11 request · 104 KB | 0 |
| Mở lại panel (dữ liệu đã cũ) | 10 trang | 11 request · 104 KB | 2 request · 11 KB (trang đầu bình luận + trả lời) |

Feed local chỉ có 1 trang; trên server feed nhiều trang hơn (và feed gợi ý đi qua discovery) thì cách cũ còn tốn thêm mỗi trang một request.

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`: lint 0 lỗi; test web 17 file pass (gồm `comment-cache.test.ts` 10/10), api-client 29, app-core 18, admin 1, i18n 1 file pass; typecheck web pass.
- `@tripflix/mobile#typecheck` fail ở máy local vì file sinh `.expo/types/router.d.ts` (gitignore) cũ hơn route `/my-trips`; không liên quan thay đổi này, không sửa.

## Cách kiểm lại
1. `pnpm --filter @tripflix/web exec vitest run src/features/social/comment-cache.test.ts`.
2. Chạy web với core-api, mở DevTools › Network, mở panel bình luận một bài, cuộn vài trang, gửi một bình luận: chỉ có lệnh `POST …/comments`, bình luận hiện ngay đầu danh sách, số bình luận trên thẻ bài tăng 1.

## Ảnh / video
- Không đính kèm (không đổi giao diện).

## Ảnh hưởng tới phần của người khác
- `live-comments.tsx`: người sửa gần nhất là Trang, Thắng; chỉ đổi `onSuccess` của mutation bình luận, không đổi phần của họ.
- Không đổi API, không thêm thư viện.
