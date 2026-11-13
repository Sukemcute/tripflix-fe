# TF25 — Mở Reels từ grid kết quả tìm kiếm

- Jira: [SCRUM-29](https://tripflix.atlassian.net/browse/SCRUM-29) · Nhánh: `thanh/TF25-mo-reels-tu-tim-kiem` · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-13

## Bối cảnh
Grid kết quả tìm kiếm (FE #137) chưa mở được Reel: trình xem Reels cần thẻ `/v1/feed` (link HLS, poster), mà BE chưa lấy được thẻ theo id bài, nên bấm Reel chỉ hiện thông báo "chưa mở được". Anh Phong đã thêm `GET /v1/feed?post_ids=` (BE `e8944ea`, 13/11): trả thẻ của đúng các bài truyền vào, giữ thứ tự, tối đa 20 id, bỏ qua bài không xem được.

## Đã làm
- **api-client**: sinh lại client (`pnpm gen:api`) theo hợp đồng core-api mới nhất. Thêm `feedApi.listByIds` và `useReelsByIds`: lướt trong đúng danh sách id, chia mỗi trang 20 id (`sliceReelIdsPage`), cùng dạng infinite query với `useReelsFeed` để trình xem Reels dùng chung.
- **Grid kết quả**: bấm Reel gọi `onOpenReel(postId, reelIds)` với các Reel đang có ở grid theo thứ tự grid. Bỏ thông báo "chưa mở được" (cùng key i18n `searchResultReelUnavailable`) và trạng thái thẻ Reel bị khoá.
- **URL**: thêm `?kind=reel` đi cùng `?open=` để F5 và nút Back mở đúng trình xem Reels; quay lại grid, mở bài viết hay đổi từ khoá thì bỏ `kind`.
- **Trình xem Reels** (`InspirationImmersiveViewer`): nhận `searchReelIds`, `initialPostId`, `onBackToResults`. Có `searchReelIds` thì đọc từ `useReelsByIds` thay vì bảng tin Reels, mở sẵn ở Reel vừa bấm; nút "Quay lại kết quả" luôn hiện ở góc trên trái khung video, nút âm lượng dời xuống dưới.
- Vào thẳng link (F5, chia sẻ link) chưa có danh sách của grid thì chỉ xem đúng Reel trong URL.
- **Sửa Reels đứng hình khi mới vào** (anh Thành báo 13/11: video đầu đứng, lướt sang video sau cũng đứng, quay lại video trước mới chạy). Nguyên nhân: link HLS gắn qua prop `src`, còn effect dọn tài nguyên (thêm 12/11 để giảm lag) xoá `src` rồi `load()`. React dev (Strict Mode) chạy effect → dọn → chạy lại ngay khi thẻ `<video>` mới hiện, và React không gắn lại prop không đổi, nên video đang xem và video kế tiếp (hai thẻ có sẵn lúc vào) mất nguồn. Video quay lại thì được tạo mới khi đang lướt (không qua lần dọn này) nên chạy. Sửa: gắn nguồn trong chính effect (`attachReelVideoSource`), dọn thì nhả (`releaseReelVideoSource`). Lỗi chỉ hiện ở chế độ dev; bản build không chạy effect hai lần nhưng cách mới đúng ở cả hai.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Bấm Reel ở grid thì mở đúng Reel đó trong trình xem Reels | Có | Chạy web local (Edge headless, 1600×900): bấm thẻ "Săn mây Đà Lạt…" ở `?q=đà lạt&type=reels` → URL `&open=<id>&kind=reel`, khung giữa đúng tiêu đề Reel đó |
| Lướt trong đúng các Reel của kết quả | Có | `feed.test.ts` › gọi `post_ids` dạng danh sách cách dấu phẩy; chia trang 20 id giữ thứ tự |
| F5 vẫn mở đúng Reel, có đường quay lại grid | Có | Như trên: sau reload vẫn đúng Reel, có nút "Quay lại kết quả"; bấm nút về grid tab Reels, URL bỏ `open` và `kind` |
| Reels không đứng hình khi mới vào và khi lướt | Có | Đo qua CDP ở `/inspiration?view=reels`: trước khi sửa video 0 và 1 `src` rỗng, `readyState 0`; sau khi sửa đều có nguồn, video đang xem chạy (0 → 4.8s → 7.8s), lướt xuống video 1 chạy, lướt lên video 0 chạy. Test `reel-post.test.ts` › Strict Mode chạy gắn → dọn → gắn lại: video vẫn còn nguồn phát |
| URL `kind=reel` đi đúng với `open` | Có | `search-result-card.test.ts` › mở Reel từ grid ghi kind=reel; quay lại grid, mở bài viết hay đổi từ khoá thì bỏ kind |

## Kết quả kiểm tra
- Sau khi sửa Reels đứng hình: `pnpm turbo run lint typecheck test --filter=@tripflix/web` 3/3 task, 74 test pass, không có warning ở file đã sửa.
- `pnpm turbo run lint typecheck test --affected`: web 72 test, api-client 202 test, app-core 125 test, i18n 2 test đều pass; lint 0 lỗi, không có warning ở file đã sửa.
- `@tripflix/mobile#typecheck` lỗi ở máy local: `.expo/types/router.d.ts` (file sinh tự động, không commit) sinh ngày 12/11 nên chưa có route `/my-trips`, `/(tabs)/book` thêm hôm nay. Không do thay đổi này; chạy `expo start` để sinh lại.
- Kiểm trên trình duyệt với BE local có `e8944ea`: từ khoá "vinpearl" tab Reels có 3 Reel; bấm Reel thứ 2 thì trình xem có đúng 3 Reel, mở ở Reel vừa bấm; F5 còn đúng Reel đó (1 Reel, vì chưa có danh sách của grid); "Quay lại kết quả" về grid.

## Cách kiểm lại
1. Chạy BE từ develop mới nhất (có `e8944ea`), web `pnpm --filter @tripflix/web dev`.
2. Tìm một từ khoá có Reel (vd. "đà lạt"), chọn tab Reels, bấm một Reel: trình xem Reels mở đúng Reel đó, lướt lên/xuống chỉ qua các Reel trong kết quả.
3. F5: vẫn đúng Reel. Bấm "Quay lại kết quả" hoặc Back của trình duyệt: về grid đúng vị trí cuộn.

## Ảnh / video
- Không đính kèm (theo yêu cầu).

## Ảnh hưởng tới phần của người khác
- `packages/api-client/src/generated`: sinh lại theo hợp đồng core-api trên develop, kéo theo thay đổi của người khác đã merge: `post_ids` của feed (Phong), `sharedThreshold`/`sharedPublishedAt` của follows, `checkedAt` và endpoint `ai-summary/checked` (Thành, BE #174). Chỉ thêm, không đổi chữ ký cũ.
- Còn lại đều là code của Thành (`apps/web` social, `packages/api-client/src/feed.ts`).
