# TF23 — Reels web không ra lại danh sách vừa xem

- Notion: SCRUM-27 (TF23) · Nhánh: `phong/TF23-web-fresh` · Người làm: Phong (dùng AI: có) · Ngày: 2026-11-25

## Đã làm
- Trước đây discovery chỉ đẩy xuống những bài đã gợi ý **hơn 30 phút** trước. Vì vậy trên web, người đã đăng nhập mà F5, quay lại trang Reels, hoặc mở lại trong vòng 30 phút thì vẫn ra đúng danh sách cũ. Web chưa từng gửi `fresh`, chỉ app có (PR #319, TF23).
- `packages/api-client`: thêm tuỳ chọn `freshOnNewList` cho `useRecommendedReelsFeed`, mặc định tắt. Khi bật, mọi lần gọi trang đầu đều gửi `fresh=true`, còn trang sau vẫn chỉ gửi `cursor`. Phần chọn tham số tách thành hàm thuần `recommendedReelsParams` để test được. App (`mixed`) không đổi.
- `apps/web` (màn Reels trong `live-posts.tsx`):
  - Bật `freshOnNewList`. Trên web, trang đầu chỉ được gọi khi mở một danh sách mới: F5, quay lại trang, đổi sang chip chưa có trong cache, hoặc bấm lại chip.
  - Bấm lại chip đang chọn thì về Reel đầu và tải danh sách mới, giống vuốt tải lại trên app.
  - Đổi qua lại giữa các chip đã có trong cache thì vẫn dùng cache như trước.
- Khách chưa đăng nhập: BE bỏ qua `fresh`, nên không có gì thay đổi.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Đã đăng nhập, F5 hoặc quay lại Reels trong vòng 30 phút ra danh sách khác | Chưa thử trên trình duyệt | Unit `reload-recommended-reels.test.ts`; cần thử trên staging |
| Trang sau giữ đúng phiên (cursor), không gửi `fresh` | Đạt | Test "freshOnNewList: mọi trang đầu gửi fresh, trang sau chỉ gửi cursor" |
| App không đổi hành vi | Đạt | Test "không bật freshOnNewList: trang đầu chỉ gửi fresh ngay sau khi tải lại, và xoá cờ" |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/api-client --filter=@tripflix/web`: 6/6 task đạt. Lint không có lỗi; cảnh báo là cảnh báo cũ, không nằm trong file của task này.
- api-client: 332 test đạt (39 file). web: 582 test đạt (93 file).

## Cách kiểm lại
1. Đăng nhập web staging, mở Reels, chip "Đang hot", ghi lại 3 Reel đầu.
2. F5 (hoặc sang trang khác rồi quay lại): 3 Reel đầu phải khác, các bài vừa xem bị đẩy xuống.
3. Bấm lại chip "Đang hot": về Reel đầu, danh sách mới.
4. DevTools → Network: trang đầu `GET /api/recommendations/reels?...&fresh=true`, trang sau chỉ có `cursor`.

## Ảnh / video
- Chưa có. Sẽ quay trên staging sau khi merge.

## Ảnh hưởng tới phần của người khác
- Có: `apps/web/src/features/social/live-posts.tsx` (Thành). Chỉ thêm một tuỳ chọn cho hook và đổi `onClick` của chip Reels. Cần Thành duyệt PR.
- `packages/api-client/src/feed.ts`: chỉ thêm, không đổi chữ ký cũ.
