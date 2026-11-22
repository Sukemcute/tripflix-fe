# SCRUM-142 — Trạng thái tải và phục hồi gallery

- Jira: https://tripflix.atlassian.net/browse/SCRUM-142
- Nhánh `trang/SCRUM-142-gallery-states` · Trang (AI) · 2026-11-20
- Base develop `3b8c425`. PR #321 vẫn mở, không merge hoặc đưa thay đổi của nhánh đó vào task này.

## Điều tra / kết luận có căn cứ

- Gallery hiện đã có placeholder, onLoad/onError và retry từ SCRUM-169. Hai caller đang dùng là hero khách sạn và ảnh phòng trong `hotel-parts.tsx`. Ảnh hợp lệ hiển thị và chuyển được trong preview với nguồn ảnh fixture; chưa có bằng chứng rằng Expo Go gây ra lỗi ảnh ở lần audit cũ.
- Khoảng trống còn lại xác nhận từ source/fixture: request treo không phát onLoad/onError giữ trạng thái loading vô thời hạn; bộ đếm chỉ hiện 1/2 kể cả ảnh chưa tải. Đã chặn request để tái hiện, dùng browser clock vượt 15 giây để kiểm tra phục hồi.
- Chưa có URL/log mạng của lần audit cũ nên chưa xác định nguồn ảnh, lazy loading hay mạng là nguyên nhân gốc của ảnh complete=false/currentSrc rỗng đó. Không coi fixture là bằng chứng lỗi của cùng khách sạn trên thiết bị native.

## Đã làm

- Chờ tối đa 15 giây cho ảnh **đang xem** ở trạng thái loading; sau đó hiện Ảnh tải lâu hơn dự kiến và nút Thử tải lại ảnh. Timer được dọn khi ảnh tải xong/lỗi, đổi ảnh, retry hoặc unmount. Không tự thử mạng liên tục.
- Retry remount ảnh và bỏ cache cho lần thử lại; không tự sửa URL, thêm query cache-busting hoặc thay ảnh của khách sạn khác.
- Bộ đếm phân biệt Đang tải / Chưa tải / số ảnh đã tải. Tên truy cập có vị trí và trạng thái, ảnh chưa tải hoặc nằm ngoài slide hiện tại được ẩn khỏi cây truy cập; thông báo live chỉ ở slide hiện tại.
- Skeleton tĩnh và nhãn trên nền biển, không shimmer/animation bắt buộc. Giữ tỷ lệ khung và nội dung/CTA không nhảy; nút bo 6 và vùng chạm giữ nguyên 44. Không gạch chân chữ hoặc viền trang trí đầu card; không thêm dependency.
- Không đổi API, dữ liệu/URL ảnh, lựa chọn phòng, giá, ngày, số khách, checkout hoặc payment.
- UI/UX Pro Max query `loading network fallback` / UX: stable skeleton, busy status, không để thời gian chờ dài thiếu giải thích. Áp dụng vào gallery hiện có, không thiết kế lại toàn trang.

## Kiểm tra / đối chiếu nghiệm thu

| Tiêu chí | Kết quả |
|---|---|
| Ảnh hợp lệ, 404/chậm/rỗng, thử lại | Preview có fixture, đạt; timeout được tái hiện bằng chặn request |
| Khách sạn và ảnh phòng | 404/retry/đổi ảnh cả hai caller đạt; offscreen ảnh 2 lỗi vẫn báo Chưa tải rồi retry được |
| Không đổi tỷ lệ/che CTA | Tên khách sạn giữ vị trí trước/sau tải; retry không đè pager ở 390×844 và 375×667; Chọn phòng luôn hiển thị |
| Native iOS/Android/Wi-Fi chậm cùng khách sạn | Chưa chạy; không đánh dấu nghiệm thu phần này |

- `pnpm turbo run lint typecheck test --affected`: **23/23 tác vụ đạt**. Cảnh báo repo có sẵn ngoài phạm vi không được tắt; không có cảnh báo tại hotel-parts.tsx.
- `node tools/check-boundaries.mjs`, `git diff --check`: đạt.
- `tools/verify-mobile-hotel-hero.cjs`: Edge browser thật/API và image fixtures, 375/390/430 px. Hai ảnh, CTA giữ ngày/nhóm khách khi mở phòng, long title, ảnh rỗng/thumbnail, 404, timeout/recovery, retry ảnh phòng, 140% browser text. Không page error/tràn ngang; không tạo đơn hoặc thao tác ghi backend.
- Timeout dùng browser clock, không chờ/sleep 15 giây hay nới test; request cũ bị Image remount hủy được coi là fixture teardown, request mới phải tải thành công.
- QA JSON: `SCRUM-142-gallery-states-qa.json`.

## Cách kiểm lại / evidence

1. Mobile preview 8083 → khách sạn → gallery, đổi ảnh bằng mũi tên; mở Chọn phòng và thử gallery phòng.
2. Với fixture: đặt PLAYWRIGHT_PACKAGE tới Playwright và MOBILE_EVIDENCE_DIR tới output; chạy `node tools/verify-mobile-hotel-hero.cjs`. Có thể chặn request ảnh trong DevTools để quan sát loading → timeout, rồi cho mạng hoạt động và bấm Thử tải lại ảnh.
3. Kiểm tra native cần cùng khách sạn/nguồn ảnh, Wi-Fi chậm, ảnh 404; chưa có thiết bị kết nối trong phiên này.
- Ảnh Jira: `SCRUM-142-gallery-loading-timeout-recovered.png`, `room-image-error.png`, `image-timeout-short.png`.
- Ảnh trước gallery thường lưu tại output `before-hotel-375/390/430.png`; trước task chưa có trạng thái timeout để chụp. Không ghi ảnh mới thành lỗi cũ hoặc dùng ảnh fixture làm ảnh dịch vụ thật.

## Giới hạn / ảnh hưởng

- Giữ In Review và assignee trống do tiêu chí native/cùng khách sạn thực tế chưa xác nhận. Chưa chạy TalkBack/Dynamic Type lớn nhất hoặc Wi-Fi chậm thật; 140% chỉ browser.
- Thay module booking/gallery (Trang), copy hotel, script và evidence. Giữ phần room/rate/cart của team, không sửa shared app components, backend, generated client, web/admin hoặc dependency.
