# TF33 — Xử lý lỗi 404 bài viết không còn khả dụng và dọn cache trên Web

- Jira/Task: TF33 (Ẩn bài đồng bộ / Hàng chờ kiểm duyệt) · Nhánh: `thanh/TF33-web-post-404-cache` · Người làm: Thành (dùng AI: có) · Ngày: 2026-11-09

## Đã làm
- `@tripflix/api-client`: Thêm hàm tiện ích `isPostNotFoundError` và `evictPostFromCache` (trong `post-cache.ts`) để phát hiện lỗi 404 và dọn sạch query chi tiết, bình luận, tóm tắt AI, đồng thời lọc post bị xoá/ẩn khỏi cache của infinite feed reels và social list.
- `@tripflix/i18n`: Thêm các bản dịch `postUnavailable`, `postUnavailableHint`, `postUnavailableNext`, `backHome`.
- `apps/web` (Trang chi tiết `/trips/:id`): Khi GET chi tiết trả 404, tự động kích hoạt `evictPostFromCache` và render giao diện thông báo "Bài viết không còn khả dụng" kèm icon cảnh báo và nút quay lại trang chủ thay vì hiện lỗi generic.
- `apps/web` (Immersive Viewer): Khi GET chi tiết bài đang active trả 404, tự động kích hoạt `evictPostFromCache` và render overlay thông báo bài viết không còn khả dụng kèm nút xem bài tiếp theo.
- Bổ sung 4 unit test trong `post-cache.test.ts`.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Nhận diện lỗi 404 và dọn sạch bài khỏi TanStack Query cache | Có | 4 unit test trong `packages/api-client/src/post-cache.test.ts` pass |
| Trang chi tiết hiển thị thẻ "Bài viết không còn khả dụng" khi 404 | Có | Component `LivePostDetail` trong `apps/web/src/features/social/post-detail.tsx` |
| Immersive feed hiển thị overlay thông báo và nút chuyển bài kế tiếp khi 404 | Có | Component `InspirationImmersiveViewer` trong `apps/web/src/features/social/live-posts.tsx` |

## Kết quả kiểm tra
- `pnpm --filter @tripflix/web typecheck`: 0 lỗi.
- `pnpm --filter @tripflix/api-client typecheck`: 0 lỗi.
- `pnpm --filter @tripflix/web lint`: 0 lỗi.
- `pnpm --filter @tripflix/api-client lint`: 0 lỗi.
- `pnpm test`: 5/5 package test suites pass (bao gồm 97 unit test của `api-client`).

## Cách kiểm lại
1. `pnpm --filter @tripflix/api-client test`
2. `pnpm --filter @tripflix/web typecheck`
3. Điều hướng tới `/trips/<id-khong-ton-tai>` trên web để thấy giao diện "Bài viết không còn khả dụng".

## Ảnh hưởng tới phần của người khác
- Không làm thay đổi props hoặc contract dùng chung.
- Phục vụ đồng bộ trải nghiệm khi bài viết bị kiểm duyệt ẩn theo yêu cầu của Trang (TF33).
