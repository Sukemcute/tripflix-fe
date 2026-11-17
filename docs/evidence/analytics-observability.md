# Analytics — giao diện và backend thật

- Yêu cầu: làm tiếp Analytics với observability, OpenTelemetry, metric và trace thật.
- Nhánh: `trang/TFxx-analytics-observability`; chưa gắn mã task cụ thể. Ngày: 2026-11-16.
- Chạy local tại `http://localhost:3206/analytics`, backend tại cổng 3005. Người dùng yêu cầu commit/push và mở PR vào develop ngày 2026-11-17; chưa deploy.

## Đã làm

- Dashboard: số request, request/giây, tỷ lệ 5xx, p50/p95, biểu đồ có dữ liệu dạng bảng, heartbeat/RSS/uptime, top 20 route.
- Bộ lọc 15 phút/1 giờ/6 giờ/24 giờ, service, tự cập nhật 30 giây; trạng thái đang tải, chưa có mẫu, chưa cấu hình và mất nguồn.
- Traces: lọc service/lỗi/độ trễ, tìm Trace ID, timeline span; giới hạn danh sách 50 và vùng cuộn để chi tiết vẫn dễ tìm.
- Chỉ superadmin được mở workspace Analytics; backend cũng chặn quyền. BFF chỉ thêm GET cho đúng các đường dẫn observability.
- Client được sinh bằng `pnpm gen:api` từ OpenAPI backend mới; đồng thời đồng bộ các hợp đồng backend hiện có trên develop, không sửa tay file sinh.
- Màu và chữ dùng tokens/i18n hiện có. Cập nhật nhãn menu thành “Số liệu & Giám sát”.

## Kiểm tra

- Ghép FE #175/#176 đã merge ngày 2026-11-17: giữ mobile action/select/undo và hợp đồng AI v2. Chỉ sinh lại Orval project `coreApi` từ backend đã ghép, giữ đủ AI usage và observability.
- Sửa lỗi tích hợp BFF chặn `GET /api/analytics/ai-usage` thành 404. Test hồi quy BFF **3/3 pass**: chuyển tiếp query và server session cho cả hai API, thiếu phiên nhận 401, lệnh ghi và đường dẫn ngoài allowlist vẫn bị chặn.
- Kiểm tra sau khi giải conflict: **22/22** tác vụ lint/typecheck/test thành công, **498 test pass** (admin 8); build admin thành công. Code mobile và client AI giữ nguyên so với develop. Giới hạn lưu kế hoạch 2.048 byte trong evidence của Bảo vẫn còn, không thuộc sửa conflict.

- Sau khi ghép develop ngày 2026-11-17 và sinh lại client từ backend đã đồng bộ: lint/typecheck/test **22/22 tác vụ thành công**, **493 test pass** (tokens 1, i18n 2, admin 3, app-core 174, api-client 220, web 93). Giữ cả API mới của develop và Analytics khi giải xung đột file sinh.

- `pnpm turbo run lint typecheck test --affected`: **21 tác vụ thành công**, **468 test pass** (tokens 1, i18n 2, app-core 159, api-client 213, web 93).
- `pnpm --filter @tripflix/admin build`: **build production thành công**, 17 trang được tạo.
- Playwright `tests/e2e/admin/analytics.cjs`: **8 nhóm kiểm tra pass** — đăng nhập BFF thật, metric Prometheus thật, chi tiết Tempo thật, lọc khoảng/service, Trace ID không hợp lệ, lọc trace lỗi, mobile không tràn ngang và thông báo upstream lỗi.
- Viewport **1440×1050** và **390×844**; không có JavaScript page error. Ảnh được chụp với dữ liệu thật, không dùng fixture số liệu cho ảnh.
- Lint còn các warning có sẵn ở staff-management; không có warning mới của Analytics.
- Sau lần sửa cuối: lint/typecheck **6 tác vụ thành công**, build admin production thành công và Playwright chạy lại **8 nhóm pass**; ảnh trace cuối hiển thị **3 span thật qua hai service**.

## Bằng chứng local

- [Dashboard desktop](../../../artifacts/analytics_desktop_live.png)
- [Chi tiết trace](../../../artifacts/analytics_trace_live.png)
- [Dashboard mobile](../../../artifacts/analytics_mobile_live.png)
- Log kiểm tra/build: thư mục `../../../artifacts/` nằm ngoài Git.

## Kiểm lại

1. Khởi động stack theo `../tripflix-be/docs/observability.md`.
2. Mở `/analytics` bằng superadmin; tạo vài request và chờ 30–60 giây.
3. Đổi khoảng và service, mở tab Traces, chọn một trace hoặc dán ID để xem span.
4. Chạy script Playwright với `PLAYWRIGHT_PACKAGE` trỏ runtime có sẵn và `ANALYTICS_ADMIN_URL` trỏ admin đang chạy.

Đây là dashboard observability; chưa bổ sung A15/B7 nghiệp vụ, tìm log/Loki hoặc instrumentation browser/mobile/AI. Chưa kiểm tra trên staging/production hay load-test.
