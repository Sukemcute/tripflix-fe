# TF32 — Giao diện hàng chờ và báo cáo nội dung

- Jira: [SCRUM-36](https://tripflix.atlassian.net/browse/SCRUM-36)
- Nhánh: `trang/TF32-hang-cho-kiem-duyet` · Người làm: Trang (dùng AI: có) · Ngày: 2026-11-09

## Đã làm

- Thêm tab hàng chờ, chi tiết hồ sơ và nhật ký vào trang kiểm duyệt. Có lọc trạng thái, bài/bình luận, nguồn, lý do; log lọc theo ID và thời gian, có phân trang.
- Hiển thị nội dung, ảnh bìa khi có, evidence luật/AI, báo cáo và audit. Bắt buộc lý do khi hide/restore/remove/dismiss; lỗi lưu giữ nguyên lý do/ghi chú. Giữ màn quản lý bài cũ trong tab riêng.
- Sinh client từ OpenAPI của backend, dùng adapter moderationApi và i18n/tokens hiện có. Generation cũng đồng bộ các endpoint hiện có trong hợp đồng AI local; không sửa tay file generated.
- Mobile có báo cáo bài và bình luận, chọn lý do, ghi chú, khoá gửi lặp khi pending, xác nhận thành công. 404 ở chi tiết bỏ bài khỏi cache feed/social và không hiển thị nội dung stale.
- Adapter summary hiểu trường hợp core giữ lại văn bản do nguồn bị ẩn, hiển thị trạng thái chờ, không tái hiển thị bản cũ vì parse lỗi.

## Đối chiếu “Xong khi”

| Tiêu chí | Đạt | Bằng chứng |
| --- | --- | --- |
| Hàng chờ/chi tiết/log gọi đúng API | Đạt với API giả trong browser | tools/verify-moderation.cjs |
| Bắt buộc lý do; lỗi giữ draft; retry thành công | Đạt | Playwright desktop 1440px và mobile viewport 390px |
| Gửi báo cáo bằng phiên đăng nhập + Idempotency-Key | Đạt trên Expo web | tools/verify-report.cjs |
| Bài 404 không hiện nội dung stale | Đạt trên Expo web và test cache | verify-report.cjs, remove-unavailable-post.test.ts |
| Kiểm tra trên Android | Chưa chạy | Máy chưa có Android SDK/simulator được cấu hình |

## Kết quả kiểm tra

- `pnpm turbo run lint typecheck test --affected`: **20/20 task pass**, api-client **95 test pass**, i18n **2 test pass**.
- `node tools/check-boundaries.mjs`, `git diff --check`: pass.
- `tools/verify-moderation.cjs`: 7 kiểm tra hành vi trên mỗi viewport desktop/mobile, có ảnh queue/detail và log; API giả, không thay thế ghép backend thật.
- `tools/verify-report.cjs`: 6 kiểm tra luồng report và 404 trên Expo web; chưa phải bằng chứng Android.
- Typecheck web từng gặp artifact route types cũ trong `.next/dev/types`; chạy Next dev để sinh lại types hiện tại rồi kiểm tra thành công, không sửa route source hoặc nới tsconfig.

## Cách kiểm lại

1. `pnpm gen:api` khi hai repo backend/AI nằm cạnh, sau đó chạy lệnh affected.
2. Chạy admin dev ở cổng 3201 và Expo web ở 8084 (script hỗ trợ đổi base URL qua env).
3. Dùng Playwright đã có, đặt PLAYWRIGHT_PACKAGE trỏ tới package runtime; chạy `node tools/verify-moderation.cjs`, `node tools/verify-report.cjs`. Mặc định dùng Edge headless; không thêm dependency vào app.

## Ảnh / video

Ảnh ngoài Git, tại `.agent/evidence/TF32` trong workspace cha:

- admin-1440-queue.png, admin-1440-log.png
- admin-390-queue.png, admin-390-log.png
- mobile-web-report.png, mobile-web-post-unavailable.png

Chưa upload ảnh, chưa push hoặc mở PR.

## Ảnh hưởng tới phần của người khác

- Mở rộng phần moderation admin của Thành theo đồng ý trong plan; giữ màn post cũ. API client generated dùng hợp đồng backend cùng task.
- Mobile do Trang phụ trách. Không sửa phần web 404/nút báo cáo mà Thành đang nhận.

## Còn lại trước nghiệm thu

- Ghép backend thật và cấu hình staging, kiểm tra lại trên Android, gắn evidence vào PR sau khi Trang duyệt.
