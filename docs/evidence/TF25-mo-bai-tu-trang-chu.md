# TF25 — Mở bài chia sẻ từ trang chủ trong Cảm hứng

- Yêu cầu: người dùng xác nhận triển khai trong phiên làm việc; chưa có ticket riêng cho lỗi này.
- Nhánh: `thanh/TF25-mo-bai-tu-trang-chu` · Gốc: `develop` tại `7772adc`.
- Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-13.

## Đã làm

- Mục “Chuyện kể từ những chuyến đi” lấy `post_type=vlog` trước khi chọn ba bài. Giữ `publicSource=latest` và điều kiện tải gần viewport của TF86.
- Thẻ trang chủ dẫn đến `/inspiration?view=posts&open=<id>`.
- Cảm hứng đọc `open` độc lập với từ khóa tìm kiếm; link mở bài chọn tab Bài viết. Chọn tab hoặc bộ lọc khác thì bỏ bài đang mở khỏi URL.
- Với link mở thẳng, lấy chi tiết qua `socialApi.getPost`, ghim bài lên đầu feed gợi ý và loại bản trùng. Giữ viewer context của chi tiết để hiển thị đúng trạng thái thích/lưu.
- Chỉ cuộn tới bài được chọn một lần; tải thêm feed giữ vị trí người dùng đang đọc. Tạm ngừng phân trang khi bài được chọn đang tải hoặc không xem được.
- Khi chi tiết lỗi, đổi ID hoặc ID trỏ tới Reel, không dùng bài cũ hay bài đầu feed thay thế. Hiện trạng thái lỗi bằng chuỗi i18n và component xử lý lỗi hiện có.
- Mở từ grid tìm kiếm tiếp tục dùng dữ liệu của grid. Route `/trips/[slug]` và khả năng mở bình luận qua route đó được giữ nguyên.

## Đối chiếu tiêu chí hoàn tất

| Tiêu chí | Đạt | Bằng chứng |
| --- | --- | --- |
| Trang chủ chỉ hiện bài viết | Có | Chrome xác nhận request có `post_type=vlog`; ba thẻ dẫn về Cảm hứng |
| Bài ngoài trang gợi ý đầu vẫn mở đúng | Có | Browser fixture giữ bài mục tiêu ngoài bảy bài gợi ý đầu; bài xuất hiện một lần, không cần duyệt cursor để tìm |
| F5, Back và Forward hoạt động | Có | Ba kiểm tra trình duyệt tương ứng |
| Bài lỗi không hiện nhầm nội dung | Có | Browser kiểm tra 404, 403 và ID của Reel; không có thẻ feed thay thế |
| Giữ luồng grid tìm kiếm | Có | Mở kết quả không phát sinh request chi tiết mới; Back giữ từ khóa và về grid |
| Giữ link chi tiết cũ | Có | Browser mở `/trips/:id`, kiểm đúng tiêu đề bài |
| Hiển thị trên màn hẹp | Có | Chrome viewport 390×844: đúng bài, không tràn ngang |

## Kết quả kiểm tra

- `pnpm turbo run lint typecheck test --affected`: 16/16 tác vụ thành công; Web 69 test, API client 189 test, app-core 91 test, i18n 2 test. Có các tác vụ được Turbo lấy từ cache.
- Có 8 test mới: 7 test về bài được ghim (ngoài trang đầu, chưa có feed, loại trùng, viewer context, dữ liệu cũ/lỗi, loại bài) và 1 test về URL mở từ trang chủ/chuyển tab.
- `pnpm --filter @tripflix/web build`: thành công, gồm kiểm tra TypeScript và sinh 19 trang tĩnh.
- `node tools/check-boundaries.mjs`: không có vi phạm.
- `git diff --check`: không có lỗi khoảng trắng.
- Chrome headless trên Web dev local cổng 3100, API fixture qua CDP: 11/11 tình huống pass; không có runtime exception. Dùng profile khách riêng, response API được giả lập để kiểm soát thứ tự feed và các lỗi 404/403.
- Môi trường báo Node 22.17.1 thấp hơn mức `engines` của repo (>=22.22.0). Các lệnh trên vẫn thành công. Lint Web báo 14 cảnh báo ở code có sẵn, 0 lỗi; không nới lint hay sửa code ngoài phạm vi.

## Cách kiểm lại

1. Chạy Web với backend tương thích, mở trang chủ rồi cuộn tới “Chuyện kể từ những chuyến đi”. Network phải có `GET /api/v1/posts?post_type=vlog` khi phần này đến gần viewport.
2. Bấm một tiêu đề: URL là `/inspiration?view=posts&open=<id>`, tab Bài viết hiển thị đúng bài. Thử với bài không thuộc trang đầu feed gợi ý.
3. F5, Back về trang chủ, Forward về bài. Thử link Cảm hứng trực tiếp trên viewport desktop và 390×844.
4. Thử ID không tồn tại, bài bị ẩn hoặc không đủ quyền xem: hiện thông báo, không hiện nhầm bài đầu feed. Thử ID của video: không chèn Reel vào tab Bài viết.
5. Tìm kiếm trong Cảm hứng, mở bài từ grid rồi Back; kiểm từ khóa và grid được giữ. Mở `/trips/<id>` để kiểm link chi tiết cũ.
6. Chạy lại lint/typecheck/test và build theo các lệnh ở trên.

## Ảnh / video

Ảnh và dữ liệu kiểm tra lưu ngoài repo:

- `C:/Users/THINKPAD/AppData/Local/Temp/tripflix-tf25-home-stories/home-stories-desktop.png`
- `C:/Users/THINKPAD/AppData/Local/Temp/tripflix-tf25-home-stories/focused-story-desktop.png`
- `C:/Users/THINKPAD/AppData/Local/Temp/tripflix-tf25-home-stories/focused-story-mobile.png`
- `C:/Users/THINKPAD/AppData/Local/Temp/tripflix-tf25-home-stories/missing-story-desktop.png`
- `C:/Users/THINKPAD/AppData/Local/Temp/tripflix-tf25-home-stories/results.json`
- Script chạy local: `C:/Users/THINKPAD/AppData/Local/Temp/tripflix-home-story-check.cjs`.

## Ảnh hưởng tới phần của người khác

- `apps/web` thuộc phạm vi của Thành. Phần thẻ trang chủ do Trang sửa gần đây; giữ điều kiện tải gần viewport. Feed gợi ý TF28 của Duy giữ nguyên nguồn, cách phân trang và cache.
- Chỉ sửa `apps/web` và thêm evidence; dùng API client hiện có, không đổi hợp đồng HTTP, database, dependency hay cấu hình chung.
- Người dùng đã đồng ý triển khai theo phân tích trong phiên. Bản sửa hiện ở local; chưa push, mở PR, cập nhật ticket hoặc triển khai production.
