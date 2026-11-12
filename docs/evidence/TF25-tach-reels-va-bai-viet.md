# TF25 — Tách bạch Reels và Bài viết (frontend)

- Jira: [SCRUM-29](https://tripflix.atlassian.net/browse/SCRUM-29) · Nhánh: `thanh/TF25-tach-reels-va-bai-viet` · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-12
- Phụ thuộc PR backend cùng tên nhánh trong `tripflix-be` (hợp đồng `post_type`, `/v1/feed?saved=true`, `tripAttachment` trong thẻ feed).

## Đã làm
- **Tab Bài viết (web, mobile)** chỉ lấy `vlog` cho công khai, bài của tôi và đã lưu. Tìm theo từ khoá vẫn đi qua Discovery (giữ luồng của develop), tạm lọc `vlog` sau khi lấy chi tiết vì Discovery chưa có loại khớp đúng vlog.
- **Reels web lấy dữ liệu từ `/v1/feed`** (mặc định, có lộ trình, đã lưu), giống Reels mobile. Chỉ khi tìm theo từ khoá mới đọc `/v1/posts` rồi lọc bài video.
- **Reels web không còn trông như bài viết khi lướt nhanh (touchpad)**:
  - Ảnh chờ và nền mờ dùng poster thật thay vì ảnh minh hoạ theo điểm đến.
  - Reel chưa có link phát hiện khung tối kèm spinner.
  - Tải trước poster 3 Reel kế tiếp.
- **Đã lưu**: bỏ lưu thành công thì Reel bị xoá khỏi danh sách; nếu đang xem thì chuyển sang Reel kế tiếp tại chỗ.
- **Form tạo bài**: chỉ chọn video khi là Reels; chuyển sang Bài viết thì bỏ video đã chọn.
- Sinh lại `packages/api-client` từ hợp đồng mới; merge `origin/develop`, giải conflict `queries.ts` giữ cả luồng Discovery và `postType`.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Tab Bài viết không hiện Reels (web, mobile) | Có | `social-feed-view.tsx`, `live-feed-screen.tsx` truyền `vlog`; `post-type-filter.test.ts` |
| Reels web chỉ có video, không hiện dạng bài viết | Có | `reel-post.test.ts` › toReelPost; khung chờ thay lưới ảnh trong `MediaTrackItem` |
| Bỏ lưu trong "Đã lưu" thì Reel biến khỏi danh sách | Có | `reel-social-cache.test.ts` › removes an unsaved reel…; `reel-post.test.ts` › pickReelAfterRemoval |
| Reels đã lưu cập nhật thích/lưu đồng bộ | Có | `reel-social-cache.test.ts` › keeps the saved Reels list in sync… |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/web --filter=@tripflix/api-client --filter=@tripflix/mobile`: 8/8 task thành công.
  - api-client: **151 test pass**
  - web: **17 test pass**
  - lint 0 lỗi (warning còn lại đều có sẵn từ develop)

## Cách kiểm lại
1. `pnpm install && pnpm turbo run lint typecheck test --filter=@tripflix/web --filter=@tripflix/api-client --filter=@tripflix/mobile`
2. Chạy BE nhánh cùng tên, mở `/inspiration?view=reels` trên web, lướt nhanh bằng touchpad: không thấy lưới ảnh kiểu bài viết, ảnh chờ là poster video.
3. Chọn bộ lọc "Đã lưu", bỏ lưu Reel đang xem: Reel kế tiếp hiện tại chỗ.

## Ảnh / video
- Cần bổ sung: video lướt touchpad trên `/inspiration?view=reels` (web) và ảnh tab Bài viết trên Android, đính kèm trong PR.

## Ảnh hưởng tới phần của người khác
- Có:
  - `apps/mobile/src/features/feed/live-feed-screen.tsx` (Trang): 1 dòng truyền `vlog`, Trang đã review.
  - `packages/api-client/src/reel-social-cache.ts` (Phong, Trang): thêm khoá Reels đã lưu và hàm xoá khỏi "Đã lưu", có test.
  - `packages/api-client/src/queries.ts`: giải conflict giữ luồng Discovery của develop.
