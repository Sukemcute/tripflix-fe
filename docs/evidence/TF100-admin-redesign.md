# TF100 — Thiết kế lại không gian quản trị

- Yêu cầu: người dùng trong chat; phạm vi đã chốt toàn bộ admin, thêm Recharts, Tailwind v4 + tokens và realtime FE + BE.
- Nhánh FE: `trang/TF100-thiet-ke-admin`. Nhánh BE: `trang/TF100-admin-realtime`.
- Thực hiện bằng Codex, ngày 2026-11-17. Chưa push, mở PR hoặc deploy.

## Thay đổi

- Shell mới: điều hướng theo vai trò, menu mobile, tài khoản thật, sửa active route Nhân sự, thêm Lịch vào menu, làm mới các query đang mở. Bộ đếm hàng chờ từ server.
- Tổng quan lấy moderation stats, 5 hồ sơ ưu tiên, nhật ký gần đây và index health từ API; biểu đồ cơ cấu dùng số liệu server. Xoá biểu đồ mẫu không còn được gọi.
- Kiểm duyệt: bảng gọn, tab cuộn, nút chi tiết luôn thấy trên mobile, panel chi tiết bên phải bằng native modal để giữ focus/Escape. Bỏ video, lượt xem, lượt thích và tác giả giả. Yêu cầu chọn lý do trước khi quyết định. Giữ bulk action, held, appeals, scans và lịch sử.
- Nhân sự được viết lại bằng Tailwind: số liệu thật, phân trang theo total/pageSize server, bộ lọc ghi rõ phạm vi trang, tạo moderator qua email đặt mật khẩu, xác nhận đổi quyền/khoá. Native dialog có tên truy cập được và chặn đóng khi đang ghi.
- Search giữ đầy đủ truy vấn, phân trang, giám sát, export JSON và worker health; biểu đồ xu hướng dùng Recharts, giữ khoảng trống khi request lỗi. Jobs có tổng hợp các lượt đã tải và biểu đồ thời gian thực thi từ lịch sử thật. Lịch có khối chọn tài nguyên và khối cập nhật riêng.
- Cảnh báo tổng hợp kiểm duyệt/index health. Audit và Báo cáo đọc nhật ký kiểm duyệt; CSV chỉ xuất các dòng đã tải, escape dữ liệu và chống formula injection.
- Analytics và Đơn hàng chưa có API cho màn quản trị; hiển thị trạng thái chưa tích hợp với lối sang các màn khả dụng. Báo cáo/Audit không nhận là báo cáo toàn hệ thống.
- Admin dùng chung phiên web qua mã handoff một lần; shell chuyển người chưa có phiên tới đăng nhập web. CSS chung cũ được thu gọn: shell/Tổng quan/Nhân sự dùng Tailwind, các feature còn lại giữ CSS Modules và một lớp tương thích đã bỏ nhiều rule không dùng.

## Realtime

`content outbox → Redis Streams → notification-service → staff socket → admin BFF → SSE → invalidate query`

- BE chỉ tự join `staff:moderation` cho moderator/superadmin từ token đã xác minh; giữ cơ chế ngắt khi khoá/đổi vai trò.
- BFF kết nối Socket.IO phía server bằng token của session httpOnly. Browser mở `/bff/api/admin/realtime` cùng origin; chỉ nhận tên tín hiệu và `{}`, không nhận token, nội dung hoặc ID sự kiện.
- Chỉ báo trực tiếp bật sau `moderation.ready` từ BE, xác nhận socket đã vào phòng staff; backend cũ chưa có phòng này vẫn hiện trạng thái chờ kết nối.
- Khi nối lại, tải lại dữ liệu để bù tín hiệu đã lỡ. Gom invalidate trong 250 ms. Khi socket gián đoạn, kiểm duyệt vẫn tải lại mỗi 30 giây khi trang đang hoạt động.
- Đăng xuất, session hết hạn/thu hồi, request huỷ hoặc reader huỷ đều dọn socket và heartbeat. Kiểm tra session trước mỗi tín hiệu, heartbeat mỗi 10 giây.
- `ADMIN_REALTIME_URL`: địa chỉ gateway `/ws` mà **server admin** truy cập được, không phải `/bff`. Đã bổ sung `.env.example`. Notification consumer cần được bật theo cấu hình BE hiện có.
- Không sửa hợp đồng HTTP nên không cần sinh lại api-client. BE sinh thêm hai schema event bằng `pnpm contracts:build`.

## Kiểm tra

- `pnpm turbo run lint typecheck test --affected`: FE 22/22 task pass; BE 49/49 task pass (một số test parity/benchmark sẵn có không chạy theo cấu hình của repo).
- FE: admin production build, typecheck, lint; 9 test admin; 2 test i18n; kiểm tra ranh giới import/API.
- Browser: `operations-redesign.cjs` kiểm tra 12 route, 5 màn ở 390px, tạo nhân sự, huỷ đổi quyền, Escape modal, menu mobile, hạn chế moderator, trạng thái lỗi/rỗng và tải CSV.
- `held-moderation.cjs`: giữ nguyên luồng held → cho hiển thị/đóng hồ sơ.
- `search-monitoring.cjs`: truy vấn, phân trang, lỗi/thử lại, JSON, 60s polling, biểu đồ có lỗi/giá trị 0, worker health và phân quyền, ở 1440px/390px. Fixture cập nhật cho đường BFF và shell mới; giữ assertions về nghiệp vụ.
- `realtime-bff.cjs`: chạy production Next với HTTP + Socket.IO giả lập cục bộ; kiểm tra 401, cross-origin 403, tín hiệu socket đi qua BFF, không lộ payload/token và ngắt sau logout.
- BE: toàn bộ 127 test notification-service; 41 test tích hợp moderation/pre-publication với Postgres thật (33 + 8), gồm 2 test mới xác minh signal/outbox atomic và rollback.
- Backend lint/typecheck và build contracts pass; warning sẵn có ở test inbox/push và rules không thuộc thay đổi.

## Bằng chứng và chạy lại

Ảnh local ở `D:\Sukem\VinUni\VSF\tripflix\outputs\admin-redesign` (desktop, mobile, lỗi/rỗng, held và thư mục `search`). Dữ liệu trên ảnh là **fixture kiểm thử**, không phải dữ liệu vận hành. Không commit ảnh vào repo.

```powershell
pnpm --filter @tripflix/admin build
pnpm --filter @tripflix/admin lint
pnpm --filter @tripflix/admin typecheck
pnpm --filter @tripflix/admin test
node tools/check-boundaries.mjs

# PLAYWRIGHT_PACKAGE trỏ tới runtime Playwright đã cài ngoài repo.
$env:ADMIN_TEST_URL='http://localhost:3210'
node tests/e2e/admin/operations-redesign.cjs
$env:HELD_ADMIN_URL='http://localhost:3210'
node tests/e2e/admin/held-moderation.cjs
$env:SEARCH_ADMIN_URL='http://localhost:3210'
node tests/e2e/admin/search-monitoring.cjs

# Cần build admin trước; socket.io mặc định lấy từ repo BE cùng thư mục cha,
# hoặc cấu hình SOCKET_IO_PACKAGE tới runtime riêng.
node tests/e2e/admin/realtime-bff.cjs
```

## Phần liên quan cần review

- FE `apps/admin`, giao diện/tokens dùng chung: Thành; moderation: Trang; Search/Jobs: Duy.
- BE moderation: Trang; notification-service và contracts: Dũng. Giữ API/hành vi hiện có, thêm event tương thích ngược. Không sửa database schema/migration.
- Recharts được người dùng đồng ý để thay biểu đồ thủ công và thêm tooltip/responsive. Socket.IO client đã có trong workspace catalog, thêm vào dependency admin để BFF dùng phía server.
- Chưa kiểm thử hoặc triển khai lên staging/production. Các test browser và BFF dùng fixture, quyền staff được kiểm riêng bằng socket E2E qua bộ xác thực JWT thật với khoá test trong notification-service.
