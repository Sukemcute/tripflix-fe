# TF25 — Đồng bộ tim, lưu cho Reels mở từ tìm kiếm

- Notion: TF25 · Nhánh: `thanh/TF25-dong-bo-reels-tu-tim-kiem` · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-16

## Đã làm
- `updateReelSocialCache` cập nhật thêm mọi cache `['feed', 'byIds', ids, userId]` (của `useReelsByIds`, dùng khi mở Reels từ kết quả tìm kiếm hoặc bài ghim) của đúng người xem, kèm rollback khi lỗi.
- Chỉ đổi danh sách key (dòng do Thành viết ở `dc06b72`); vòng cập nhật và rollback giữ nguyên.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Reels mở từ tìm kiếm đổi tim, số ngay khi bấm và hoàn lại khi lỗi | Đạt | `reel-social-cache.test.ts` › "keeps Reels opened from search results (useReelsByIds) in sync, including rollback" (fail trước khi sửa, pass sau khi sửa) |
| Không đụng cache của người xem khác | Đạt | cùng test |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected --continue`: 15/16 task thành công; `reel-social-cache.test.ts` 11/11 pass.
- `@tripflix/mobile#typecheck` fail sẵn trên máy local ở các route `/my-trips`, `/(tabs)/book` (file kiểu route sinh tự động `.expo/types/router.d.ts` cũ, không commit), không liên quan file đã sửa.

## Cách kiểm lại
1. `pnpm --filter @tripflix/api-client exec vitest run src/reel-social-cache.test.ts`.

## Ảnh / video
- Không đính kèm.

## Ảnh hưởng tới phần của người khác
- `updateReelSocialCache` cũng được mobile gọi (`reel-social-overlay.tsx`, `live-post-detail-screen.tsx` của Trang): chữ ký hàm không đổi, chỉ cập nhật thêm cache.
