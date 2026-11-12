# TF25 — Tìm kiếm trang Cảm hứng: nhấn Enter mới tìm, kết quả dạng grid, dùng search của discovery

- Jira: [SCRUM-29](https://tripflix.atlassian.net/browse/SCRUM-29) · Nhánh: `thanh/TF25-tim-kiem-grid-web` · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-12

## Bối cảnh
- Ô tìm kiếm ở dock trái gọi API theo từng phím gõ ("t", "tr", "tra"…).
- Màn Reels tìm bằng `GET /v1/posts?keyword=` (ILIKE của content/social) rồi lọc video ở client; tab Bài viết tìm bằng discovery. Hai màn ra kết quả khác nhau, tab Bài viết đang ẩn vẫn tìm theo.
- Dock và drawer tìm kiếm dùng cam `#FF6A00` ghi cứng, lệch với design OTA.

## Đã làm
- **Chỉ tìm khi nhấn Enter** (hoặc bấm mục gợi ý, tìm gần đây, hashtag trên Reels); gõ chữ không gọi API. Từ khoá kiểm bằng `validateInspirationKeyword` (2–100 ký tự).
- **Một engine tìm duy nhất: discovery** (`POST /api/search/posts`). Gỡ query `/v1/posts?keyword=` khỏi màn Reels.
  - `usePostSearchFeed(keyword, postType?)` (`packages/api-client/src/post-search-feed.ts`): mỗi trang 12 bài, lấy chi tiết từng bài, gắn `viewerContext` vào bài, trả ảnh bìa discovery theo id.
  - Grid và tab Bài viết dùng chung query nên mở bài từ grid không gọi lại API.
- **Grid kết quả kiểu TikTok** (`search-results-grid.tsx`): tab Tất cả · Bài viết · Reels; thẻ ảnh 3:4, số tim, caption 1 dòng (hashtag tô màu), avatar chữ cái, tên, ngày đăng; khung xám khi tải; cuộn tới cuối tự tải thêm. Tab Reels hỏi discovery loại `video`; tab Bài viết lọc vlog và tự tải trang sau khi trang hiện tại không có bài viết.
- **Mở bài**: bài viết mở ở tab Bài viết (chỉ các bài viết trong kết quả, cuộn sẵn tới bài vừa bấm), có thanh "Quay lại kết quả"; Back của trình duyệt về đúng grid và vị trí cuộn (grid giữ mounted). Reels tạm báo "chưa mở được" vì chưa lấy được link phát theo id bài (đã nhờ anh Phong thêm `/v1/feed?postIds=`).
- **URL**: `?q=` từ khoá, `?type=` tab kết quả, `?open=` bài đang mở; F5 giữ nguyên chỗ.
- **Dock + drawer thiết kế lại theo token OTA, bố cục kiểu TikTok**: mục đang chọn là viên coral nhạt + icon coral-ink; nút Tạo bài teal-ink trơn; ô tìm dạng viên; "Tìm gần đây" (lưu 10 từ khoá trên máy, hiện 5, có Xem thêm, xoá từng mục); "Có thể bạn thích" (gợi ý cố định trong i18n). Bỏ màu ghi cứng, chữ dock chuyển sang i18n, bỏ nút xoá trùng của input search và viền focus thừa.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Gõ chữ không gọi API, nhấn Enter mới tìm | Có | `instagram-left-dock.tsx` (form submit), kiểm tay tab Network |
| Web chỉ dùng search của discovery | Có | `post-search-feed.test.ts`; không còn chỗ gọi `listPosts({ keyword })` |
| Kết quả dạng grid, có tab Tất cả / Bài viết / Reels | Có | `search-results-grid.tsx`, `search-result-card.test.ts` › tab kết quả trên URL |
| Bấm bài viết mở như bình thường, quay lại được grid | Có | `social-feed-view.tsx` (`focusPostId`, `onBackToResults`), `search-url.ts` |
| Dock/drawer đồng bộ token OTA | Có | `social-feed.module.css` (dock, drawer không còn mã màu ghi cứng) |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/web --filter=@tripflix/api-client --filter=@tripflix/app-core --filter=@tripflix/mobile --filter=@tripflix/i18n` — 14/14 task; web 59, api-client 186, app-core 89, i18n 2 test pass; lint 0 lỗi, không có warning ở file đã sửa.
- Anh Thành đã kiểm giao diện trên localhost.

## Cách kiểm lại
1. Mở `/inspiration`, bấm Tìm kiếm ở dock, gõ "đà lạt": tab Network không có request nào khi gõ; nhấn Enter thì hiện grid.
2. Đổi tab Bài viết / Reels: URL có `?type=`, F5 vẫn giữ tab.
3. Bấm một bài viết: tab Bài viết cuộn tới bài đó; bấm "Quay lại kết quả" hoặc Back về đúng grid.
4. Bấm một Reel: hiện thông báo chưa mở được.
5. Mở lại drawer: từ khoá vừa tìm nằm trong "Tìm gần đây".

## Ảnh / video
- Không đính kèm (theo yêu cầu).

## Ảnh hưởng tới phần của người khác
- `packages/api-client/src/generated/.../postsControllerListPublicPostsParams.ts`: sinh lại từ hợp đồng BE (chỉ đổi mô tả `keyword` thành deprecated). Phụ thuộc PR BE `thanh/TF25-deprecate-keyword-posts`. Đã bỏ phần sinh thêm `admin-index-health` không thuộc task.
- Dùng lại `getPostSearchResults` của Duy (`explore-search.ts`), không sửa file của Duy.
- `features/discovery/home-screen.tsx`, `app/inspiration/page.tsx` (apps/web, anh Thành phụ trách): bỏ truyền từ khoá, InspirationView đọc thẳng từ URL.
