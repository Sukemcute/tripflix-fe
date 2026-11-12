# TF10 — Trang chi tiết khách sạn OTA trên web

- Nhánh: `trang/TF10-web-hotel-detail` · Người làm: Trang (dùng AI: có) · Ngày: 2026-11-06.
- Phạm vi được yêu cầu trong chat: nối phần backend TF10 đã merge của Thắng vào web, kiểm tra với API local và sửa dữ liệu ảnh. Không thay đổi API backend hoặc thêm thư viện.

## Đã làm

- Sinh lại API client bằng `pnpm gen:api` từ hợp đồng backend hiện tại. Vì sinh toàn bộ hợp đồng, diff generated cũng bao gồm các bổ sung mới của discovery, bình luận và summary đang có trong develop backend.
- Thêm `/hotels/[id]`, link từ tên khách sạn/nút chọn phòng trong kết quả tìm kiếm. Chọn gợi ý khách sạn rồi tìm kiếm mở thẳng trang chi tiết. Giữ ngày nhận, trả và số khách của lần tìm kiếm đã gửi.
- Hiển thị gallery ảnh CloudFront, tên, sao, địa chỉ/bản đồ, rating kèm nguồn; giới thiệu, highlights, nearby; tiện ích nổi bật và theo nhóm, facts, ngôn ngữ; ảnh/phân loại phòng, diện tích, hướng nhìn, tiện nghi; giá gạch, phần trăm giảm, giá bán, tổng kỳ ở, perks, điều kiện huỷ; giờ nhận/trả và chính sách. Trường null và mảng rỗng không tạo mục trống.
- Map toàn bộ slug icon đang có trong catalog sang SVG trong app, có biểu tượng dự phòng cho slug mới.
- Đổi kỳ ở/số khách gọi lại API giá, đồng bộ URL; kiểm tra ngày và số khách; trạng thái tải, lỗi/thử lại, không tìm thấy và không có phòng.
- Mục reviews có điểm trung bình, số lượng, phân bố sao, tags, tóm tắt, thông tin người viết/phòng/tháng ở/ngày viết, nội dung, ảnh và lượt hữu ích. Bộ lọc sao, tag, loại khách, sort và phân trang gọi API thật; đổi bộ lọc về trang 1.
- OpenAPI hiện chưa khai báo query parameters của reviews dù endpoint runtime có hỗ trợ. `packages/api-client/src/hotel-reviews.ts` dùng URL sinh tự động, lớp HTTP chung và wrapper query có kiểu để gửi các tham số; không sửa tay generated.
- Luồng checkout/thanh toán web chưa nằm trong phần này; giao diện giữ thông tin hiện có về trạng thái chức năng đặt chỗ.

## Kết quả kiểm tra

- `pnpm turbo run lint typecheck test --affected`: 20/20 tác vụ thành công. API client: 65 test pass, gồm 4 test mới cho truyền bộ lọc/encoding, bỏ tham số rỗng, phản hồi không hợp lệ và HTTP lỗi.
- `node tools/check-boundaries.mjs`: không có vi phạm.
- `pnpm --filter @tripflix/web build`: thành công, có route động `/hotels/[id]`.
- `git diff --check`: không lỗi.
- `tests/e2e/hotels/detail.cjs`: 18 nhóm kiểm tra qua trên Chrome với API local thật; desktop 1440px, mobile 390px. Kiểm tra tìm kiếm → chi tiết, gợi ý khách sạn, ảnh tải được/viewer/Escape, lọc/sort/trang khớp API, đổi số khách và URL, không tràn ngang/lỗi JS. Dùng route mock riêng cho null/rỗng và lỗi reviews 503/thử lại; không sửa response API trong luồng kiểm tra dữ liệu thật.

## Backend local

- Build lại image core-api từ develop hiện tại. Container cũ chưa có reviews.
- Lệnh dev mặc định lỗi do 11 persistent tasks vượt concurrency 10. Dùng override command tạm ngoài repo để build → migrate → seed → start core-api; không sửa compose hoặc Dockerfile.
- Database đang dùng là `core`, schema `commerce`; đã có migration cũ `20261105102339_add_hotel_details`, trong khi develop gộp thành `20261105182815_add_hotel_details_reviews`. Migrate lần đầu báo cột address đã tồn tại và rollback.
- Đã sao lưu cấu trúc commerce ra `%TEMP%/tripflix-tf10-commerce-schema-before.sql`, đối chiếu các cột/constraint chi tiết đã tồn tại với migration mới. Chỉ áp dụng bảng reviews, 2 index và 2 FK còn thiếu trong transaction; ghi migration với hash nội dung gốc, giữ bản ghi migration cũ và đồng bộ owner bảng với catalog. Không xoá dữ liệu hoặc sửa migration nguồn.
- Chạy lại migrate thành công và seed với `S3_KEY_PREFIX=dev/thang/` chỉ cho lệnh seed. Prefix upload của container giữ nguyên. 220 khách sạn, 642 loại phòng; reviews sinh lại theo seed của Thắng.
- Kiểm thật `/api/hotels/P-h-nt-01` và `/api/hotels/P-h-nt-01/reviews?limit=5`: HTTP 200, 206 đánh giá ở khách sạn mẫu. Ảnh từ dev/thang tải được trên Chrome.

## Cách kiểm lại

1. Chạy backend có migration/seed TF10 và web ở cổng 3100.
2. Mở `/search`, chọn địa điểm và tìm, bấm Chọn phòng. Hoặc mở `/hotels/P-h-nt-01` trực tiếp.
3. Xem ảnh, thay ngày/số khách, xem tiện ích/chính sách và thử lọc/sắp xếp/phân trang đánh giá.
4. Chạy `node tests/e2e/hotels/detail.cjs` với Playwright có sẵn. Script hỗ trợ `PLAYWRIGHT_PACKAGE`, `PLAYWRIGHT_CHROMIUM_PATH`, `WEB_PREVIEW_URL`, `HOTEL_EVIDENCE_DIR` để dùng runtime/browser cài ngoài repo, không thêm dependency.

## Ảnh

- Lưu ngoài repo: `%TEMP%/tripflix-hotel-detail/` gồm `hotel-top-1440.png`, `hotel-top-390.png`, ảnh phần phòng/reviews ở hai độ rộng, ảnh full page và `verification.json`.

## Ảnh hưởng tới phần của người khác

- Thêm tính năng dưới `apps/web` (chủ: Thành), chỉnh liên kết và xử lý chọn gợi ý trong `live-search-screen.tsx`; giữ giao diện tìm kiếm hiện tại, không đổi chữ ký component.
- Thêm chữ trong `packages/i18n`, wrapper reviews và generated API client dùng chung; đã chạy typecheck/test cả mobile và admin qua affected tasks.
- Giữ các chỉnh sửa màu cam/chữ trắng từ yêu cầu trước của người dùng trong working tree.
- Backend không có thay đổi source. Chỉ có thao tác môi trường/database local như mô tả trên.
- Chưa push, mở PR hoặc ghi Notion.

## Trang chủ và luồng tìm khách sạn

- Trang chủ giữ hero OTA, thêm Tripi từ bộ nhận diện, thẻ điểm đến, ba gợi ý có phòng theo điểm đến, khối dẫn sang Cảm hứng và bài chia sẻ lấy từ API. Các ảnh minh hoạ điểm đến lấy từ bộ tài sản thiết kế hiện có, ảnh thẻ phòng lấy từ danh mục khách sạn.
- Tab Khách sạn mở `/search`, mặc định hiển thị phòng tại Nha Trang. Có bộ lọc sao, giá tối đa và cách sắp xếp. Link từ trang chủ mở đúng điểm đến, ngày và số khách. Link quay lại từ chi tiết khôi phục các điều kiện tìm kiếm đã gửi.
- Kiểm trên Chrome 1440px, 390px và 320px với backend local. Đã thử chuyển điểm đến, đổi số khách từ trang chủ, áp dụng/xóa bộ lọc, mở khách sạn và quay lại. Đã kiểm tra ảnh khách sạn, ảnh Tripi và không tràn ngang ở cả ba độ rộng.
- Ảnh chụp ngoài repo ở `%TEMP%/tripflix-ota-refresh/` gồm trang chủ và danh sách khách sạn ở 1440px và 390px.
