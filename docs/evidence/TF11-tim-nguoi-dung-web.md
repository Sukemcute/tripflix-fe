# TF11 — Tab Người dùng và bài của tác giả khớp tên ở trang tìm kiếm web

- Notion: — · Nhánh: `duy/TF11-tim-nguoi-dung-web` · Người làm: Duy (dùng AI: có) · Ngày: 2026-11-18
- Dùng `GET /api/v1/users/search` đã có trên `develop` của tripflix-be; không phụ thuộc PR BE nào.

## Đã làm
- Grid tìm kiếm trang Cảm hứng thêm tab **Người dùng** (`?type=users`), đứng sau Tất cả.
- **Tất cả**: có người khớp tên thì hiện khối "Người dùng" (tối đa 6 thẻ, nút "Xem tất cả" sang tab Người dùng) và khối "Bài đăng của <tên>" cho người khớp đầu tiên (tối đa 6 Reels/bài viết, bỏ bài đã có trong các vùng discovery). Chỉ hiện "Kết quả gần nhất" khi không có vùng nào và không có người nào khớp.
- **Người dùng**: danh sách người khớp tên, phân trang bằng "Xem thêm" (hook mới `useInfiniteUserSearch`), bỏ người trùng giữa các trang. 5 người đầu có dải bài xem trước; dải này **chỉ tải khi người đó sắp cuộn tới** (IntersectionObserver, cách 200px), nên mở tab chỉ gọi API cho người đang trong màn hình. Từ khoá dưới 2 ký tự, lỗi 429 và không có kết quả đều có thông báo riêng.
- **Bài viết / Reels**: sau kết quả discovery, nối thêm bài viết (tab Bài viết) hoặc Reels (tab Reels) của người khớp đầu tiên, bỏ trùng theo id.
- Mở bài lấy từ hồ sơ tác giả (không có trong kết quả tìm) vẫn tải được bài theo id (`social-feed-view.tsx`).
- Tab cuộn ngang được trên màn hình hẹp. Chuyển đổi thẻ grid sang `search-author-items.ts` (hàm thuần, có test).
- `api-client`: tách `normalizeUserSearchQuery` dùng chung cho `useUserSearch` và `useInfiniteUserSearch`. `i18n`: thêm chữ cho tab Người dùng.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Tìm được người dùng theo tên ở trang tìm kiếm web | Có | Tab Người dùng với "bao", "ng" trên web dev |
| Xem nhanh bài của người tìm được, mở hồ sơ | Có | Dải bài xem trước + "Xem trang cá nhân"; `search-author-items.test.ts` |
| Tab mới có trên URL, giá trị lạ về Tất cả | Có | `search-url.test.ts` |

## Kết quả kiểm tra
- Sau khi merge `origin/develop`: `pnpm turbo run lint typecheck test --affected` → web 237, api-client 288, app-core 243, admin 29, i18n 2, tokens 1 test pass; lint 0 lỗi (21 cảnh báo có từ trước, không ở file của task).
- `@tripflix/mobile#typecheck` fail ở `assistant-cards.tsx` (vào từ develop, TF31): do `.expo/types/router.d.ts` local cũ, route `/trip-builder` có thật. Không liên quan task này.
- Chạy thật (web dev cổng 3100 + core-api local):
  - "ng", tab Người dùng (18 người): mở tab gọi 4 request bài của tác giả (2 người trong màn hình) thay vì 10; cuộn xuống thì đủ 5 người có dải xem trước.
  - "bao", tab Tất cả: khối Người dùng + "Bài đăng của Ngô Gia Bảo".

## Cách kiểm lại
1. Chạy core-api từ `develop` của tripflix-be (DB đã migrate tới `content/20261118035214_wild_fantastic_four`).
2. `pnpm --filter @tripflix/web dev`, mở `/inspiration?q=bao`.
3. Xem tab Tất cả, bấm "Xem tất cả" ở khối Người dùng, cuộn tab Người dùng; mở tab Bài viết, Reels.

## Ảnh / video
- Đính kèm trong PR.

## Ảnh hưởng tới phần của người khác
- Có: `apps/web/src/features/social/` (`search-results-grid.tsx`, `search-explore-results.tsx`, `search-url.ts`, `feed/social-feed-view.tsx`, CSS) của **Thành**. Thành đã giao phần trang tìm kiếm cho Duy. Không đổi props của component dùng chung; `useUserSearch` giữ nguyên chữ ký.
