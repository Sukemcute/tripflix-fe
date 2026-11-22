# TF108 — Reels bỏ bài lặp giữa các trang, quay lại Reels / Bài viết thì gọi lại gợi ý

- Jira: TF108 · Nhánh: `duy/TF108-reels-bo-trung-bai` · Người làm: Lê Anh Duy (dùng AI: có) · Ngày: 2026-11-19

## Đã làm
- **Bỏ bài lặp giữa các trang Reels** (`apps/web/src/features/social/reel-post.ts`, `prependPinnedReelCards`): mỗi Reel chỉ giữ lần xuất hiện đầu. Gợi ý phân trang bằng offset; job gợi ý (10 phút) chạy giữa hai trang làm thứ hạng đổi nên trang sau có thể lặp bài trang trước → React báo "Encountered two children with the same key", lướt nhảy về bài cũ.
- **Quay lại thì gọi lại gợi ý** (`packages/api-client/src/reset-on-return.ts`): Reels gợi ý giữ cache vô hạn, Bài viết cố ý giữ các trang đã tải, nên tìm Hội An xong quay lại vẫn thấy danh sách cũ. Khi trang chuyển từ ẩn sang hiện (Reels mount lại, tab Bài viết được giữ mount nay hiện lại) mà đã có cache thì bỏ cache, tải lại từ trang 1. Đổi chip trong trang vẫn dùng cache. Bật qua tuỳ chọn `refreshOnReturn` của `useRecommendedReelsFeed` / `useSocialPosts`, chỉ web dùng; mobile không đổi.

## Đối chiếu "Xong khi"
| Tiêu chí (yêu cầu của Duy 19/11) | Đạt | Bằng chứng |
|---|---|---|
| Không còn lỗi trùng key ở Reels web | Có | Test `reel-post.test.ts` (bài lặp giữa các trang); local lướt 29 Reel qua 4 trang, console không còn "same key" |
| Từ trang khác quay lại Reels / Bài viết thì gọi lại gợi ý | Có | Test `reset-on-return.test.ts`; local: Reels → Bài viết → Reels → Bài viết, mỗi lần quay lại có request `recommendations/reels` / `recommendations/posts` mới |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected` (sau khi merge `origin/develop`): xem PR.
- Mobile typecheck trên máy cần sinh lại kiểu route Expo (`.expo/types/router.d.ts` cũ báo route mới thiếu); bỏ file cũ thì pass, CI không có file này.

## Cách kiểm lại
1. Web local, mở Reels, chip "Dành cho bạn", lướt nhiều trang: console không có lỗi trùng key.
2. Tìm "hội an" ở ô tìm Cảm hứng, thả tim vài bài, bấm sang Bài viết rồi về Reels: Network có request gợi ý mới, danh sách theo tín hiệu mới.

## Ảnh / video
- Không đổi giao diện.

## Ảnh hưởng tới phần của người khác
- `apps/web` (Thành): `reel-post.ts`, `live-posts.tsx` (một tuỳ chọn), `feed/social-feed-view.tsx` (một tuỳ chọn). Nhờ Thành duyệt.
- `packages/api-client`: thêm `reset-on-return.ts`, tuỳ chọn mới mặc định tắt nên mobile không đổi.
