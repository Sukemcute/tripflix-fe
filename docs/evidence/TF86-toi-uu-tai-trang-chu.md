# TF86 — Tối ưu lần mở trang chủ

- Jira: https://tripflix.atlassian.net/browse/SCRUM-113 (TF86).
- Nhánh: `trang/TF86-toi-uu-tai-trang-chu` · Người làm: Trang Thùy (dùng AI: có).
- Đo trước/sau: 2026-11-12. Kiểm tra lại trước khi tạo PR: 2026-11-13.

## Đã làm

- Thu hẹp `Suspense` tới form tìm kiếm dùng tham số URL; hero được xuất trong HTML thay vì chờ hydration của cả trang.
- Tối ưu ảnh của các thẻ gợi ý với Next Image; giữ ảnh gốc cho host ngoài danh sách được phép.
- Chỉ bắt đầu query gợi ý, phòng và bài viết khi phần tương ứng đến gần viewport; các hook có mặc định giữ hành vi hiện tại cho caller khác.
- Chỉ mount ảnh phong cảnh của điểm đến đang chọn trong phần tìm phòng.
- Ngăn margin của header dịch chuyển body; không đổi kiểu header khi hero vẫn nằm trong segment streaming bị ẩn. Skeleton của route giữ footer dưới viewport.

## Kết quả trước/sau

| Phép đo local | Trước | Sau |
| --- | ---: | ---: |
| Desktop: dung lượng HTTP | 4.007.292 byte | 1.419.382 byte |
| Desktop: request trình duyệt | 58 | 52 |
| Desktop: LCP | 1.444 ms | 688 ms |
| Desktop: CLS | 1,00036 | 0,00036 |
| Mobile giả lập: dung lượng HTTP | 4.407.061 byte | 903.081 byte |
| Mobile giả lập: request trình duyệt | 58 | 47 |
| Mobile giả lập: LCP | 6.420 ms | 1.976 ms |
| Mobile giả lập: CLS | 0,00103 | 0,00194 |
| API khi mở trang, cả hai viewport | 4 | 2 |

Production build local chạy trên cổng 3101, Chrome 157, khách chưa đăng nhập. Desktop 1440×900 quan sát 20 giây; mobile 390×844 quan sát 30 giây kể từ navigation commit, CDP giới hạn 1,6 Mbps xuống / 750 Kbps lên / độ trễ 150 ms / CPU chậm 4 lần. Public API được ghi lại và replay giống nhau để tách ảnh hưởng của backend và CORS localhost. Routing Playwright tắt HTTP cache ở cả hai lượt; cache ảnh phía server không bị xóa giữa các lần xác minh.

Đây là một cặp mẫu local trên mỗi viewport, không phải kết quả p75 production. Số request gồm các sự kiện request trình duyệt; lượng byte không bao gồm toàn bộ overhead TCP/TLS. Không thay đổi DNS/CDN hay chính sách cache của ảnh public chưa có version.

## Kết quả kiểm tra

- Đồng bộ `origin/develop` tại `8753a8c` (TF28): giữ `publicSource` ở tham số thứ tư của `useSocialPosts`, đưa `options.enabled` sang tham số thứ năm và cập nhật caller trang chủ. Giữ logic phân trang/cache feed gợi ý của develop. Sau xử lý xung đột: 23/23 tác vụ lint/typecheck/test/build thành công; API client 189 test, web 59 test; kiểm tra boundaries không có vi phạm.

- `pnpm turbo run lint typecheck test --affected`: 21/21 task thành công ngày 2026-11-13; lint còn cảnh báo đã có sẵn. Web: 59 test, API client: 187 test, app-core: 91 test; các package khác cũng qua.
- `pnpm turbo run lint typecheck test build --affected`: 23/23 task thành công sau khi rà soát tùy chọn query tương thích ngược, gồm build web và admin.
- Web production build thành công với API local.
- Chromium desktop/mobile: hero có trong HTML; không có page error; ảnh trả về thành công; CLS ban đầu dưới 0,1.
- Trước khi cuộn không gọi API phòng/bài viết; khi đến gần từng phần thì gọi API và nhận 200. Đổi từ Nha Trang sang Hội An chỉ giữ một ảnh phong cảnh.
- Điều hướng client search → home → search: header lần lượt đúng vị trí relative / absolute / relative.
- Smoke với backend local thật: core-api và notification health 200, gateway recommendations 200, web tải hero/gợi ý/phòng thành công, admin 200.

## Cách kiểm lại

1. Trong repo backend chạy `pnpm stack:be`; trong frontend build web với `NEXT_PUBLIC_API_URL=http://localhost:8080`, sau đó `pnpm --filter @tripflix/web start`.
2. Mở `http://localhost:3100` bằng profile sạch, xem Network và Performance. Hero phải xuất hiện sớm; API phòng/bài viết chưa chạy khi chưa tới gần phần đó.
3. Cuộn xuống phần phòng và bài viết, kiểm tra dữ liệu được tải. Đổi điểm đến, quay lại đầu trang và kiểm tra bố cục.
4. Chạy `pnpm turbo run lint typecheck test --affected`.

## Ảnh và dữ liệu đo

Ảnh sau tối ưu desktop/mobile đã đính kèm tại [Jira SCRUM-113](https://tripflix.atlassian.net/browse/SCRUM-113): `local-after-desktop.png`, `local-after-mobile.png`. Ảnh trước/sau và script đo cũng lưu ngoài repo, không commit ảnh theo quy định:

- `D:/Sukem/VinUni/VSF/performance-audit/local-before-desktop.png`
- `D:/Sukem/VinUni/VSF/performance-audit/local-after-desktop.png`
- `D:/Sukem/VinUni/VSF/performance-audit/local-before-mobile.png`
- `D:/Sukem/VinUni/VSF/performance-audit/local-after-mobile.png`
- `D:/Sukem/VinUni/VSF/performance-audit/local-comparison.json`
- Script: `compare-local.cjs`, `navigation-smoke.cjs`, `startup-smoke.cjs` trong cùng thư mục.

## Ảnh hưởng

- Có: web và API client; phần web do Thành phụ trách. Thay đổi đã được người dùng yêu cầu, test local và cho phép commit/mở PR trong phiên làm việc.
- Không đổi HTTP API, database, dependency, Docker hay CI; caller không truyền tùy chọn mới giữ nguyên hành vi.
- Chưa triển khai production; chưa đo INP, RAM/GPU, tải đồng thời hoặc trạng thái đăng nhập.
- Môi trường local hiện có một số ảnh CDN dưới prefix `dev/trang` trả 403. Các thẻ gợi ý dùng fallback, thumbnail phòng dùng placeholder; phép đo replay ở trên dùng ảnh public của dataset đã ghi lại. Cần kiểm tra quyền/key ảnh của dữ liệu local riêng, không thay đổi quyền S3 trong PR này.
