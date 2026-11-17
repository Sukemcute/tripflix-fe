# TF104 — Làm lại giao diện admin, cập nhật realtime cho kiểm duyệt viên

- Jira: [SCRUM-172](https://tripflix.atlassian.net/browse/SCRUM-172) · Nhánh: `trang/TF104-lam-lai-giao-dien-admin` · Người làm: Trang (dùng AI: có) · Ngày: 2026-11-17
- Phần BE dùng realtime staff đã có trên `develop` của `tripflix-be` (PR #232, TF100 admin realtime: phòng `staff:moderation`, sự kiện `moderation.changed`). Không cần PR BE riêng. Thiếu socket thì admin vẫn chạy bằng polling 5 giây.

## Đã làm
- **Shell mới** ở route group `app/(console)/layout.tsx`: socket realtime, số liệu kiểm duyệt và menu giữ nguyên khi chuyển trang (trước đây mỗi trang dựng lại toàn bộ shell). Menu nhóm theo vai trò; badge "Kiểm duyệt" và "Cảnh báo" lấy số thật, bỏ số cứng 312/12. Topbar có chỉ báo Trực tiếp / Đang kết nối / Mất kết nối.
- **Realtime**: BFF cấp access token ngắn hạn tại `/bff/api/admin/realtime-token` (không trả refresh cookie); `useStaffRealtime` trong `packages/api-client` nối `/ws`, nhận `moderation.changed` (không đọc payload) và tải lại query kiểm duyệt. Có socket thì polling giãn ra 30 giây; mất socket quay về 5 giây.
- **Tổng quan** (trước đây toàn số giả): KPI kiểm duyệt, biểu đồ hàng chờ theo thời gian, cơ cấu hàng chờ, 5 hồ sơ ưu tiên, hoạt động gần đây + tín hiệu live, nhịp xử lý theo giờ, loại quyết định, sức khỏe worker chỉ mục và job.
- **Kiểm duyệt**: hàng chờ dạng bảng có thanh điểm ưu tiên, tô sáng hồ sơ mới đến; ngăn chi tiết (`<dialog>` modal) dùng ảnh bìa thật, bỏ ảnh Unsplash và số lượt xem/thích giả; khiếu nại, scan cần phục hồi, nhật ký (lọc ngày/người/thao tác, tải CSV), quản lý bài viết. Mở được hồ sơ/tab qua `?case=` và `?tab=`.
- **Trang mới có dữ liệu thật**: Cảnh báo vận hành (tính từ số liệu kiểm duyệt, worker chỉ mục, job), Nhật ký kiểm toán. Đơn hàng / Xu hướng / Báo cáo chưa có API nên ghi rõ "Chưa có dữ liệu" thay vì số giả.
- **Nhân sự**: bỏ số giả `|| 1`, phân trang theo `pageSize` thật, ma trận phân quyền dạng bảng, xác nhận trước khi khoá/thu hồi quyền.
- **Đăng nhập** làm lại. Component dùng chung ở `features/ui` (Tailwind + màu từ `@tripflix/tokens`, không ghi cứng mã màu). `globals.css` từ 3.962 dòng còn 140 dòng: nền + lớp tương thích cho các màn chưa viết lại.
- Thư viện mới: `recharts@^3.10.1` (thêm vào catalog): biểu đồ SVG có tooltip, responsive.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Không còn số liệu giả trên mọi màn admin; màn chưa có API ghi rõ chưa có dữ liệu | Có | Ảnh Tổng quan, Nhân sự, Đơn hàng; bỏ `overview` số cứng, badge cứng, `|| 1` |
| Hồ sơ mới / quyết định mới → hàng chờ và KPI cập nhật ~1 giây không tải lại; mất kết nối tự quay về polling | Có | Playwright 2 phiên: moderator đang mở hàng chờ, superadmin đóng một hồ sơ → moderator cập nhật 7 → 6 sau **855 ms** (BE `develop`), không tải lại; `staff-realtime.test.ts` (trạng thái offline, nối lại, token) |
| Giữ nhãn e2e đang dùng | Có | Giữ "Chờ duyệt (N)", "Chi tiết", dialog "Chi tiết nội dung kiểm duyệt", "Đóng modal", "Khiếu nại", "Giữ quyết định", "Lên lịch thử lại", "Quản lý bài viết", "Đăng xuất", nhãn đăng nhập… |
| Lint, typecheck, test pass | Có | Mục dưới |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/admin --filter=@tripflix/api-client --filter=@tripflix/i18n --filter=@tripflix/web`: 12/12 task pass. sau khi merge develop: api-client 233 test, web 121 test, admin 12 test, i18n 2 test pass (thêm 6 test `staff-realtime`). Lint 0 lỗi (cảnh báo còn lại có sẵn ở `vocab-gaps.tsx`, `notifications-realtime.ts` và 1 ô bảng Nhân sự).
- `node tools/check-boundaries.mjs`: không vi phạm.
- Đã merge `origin/develop` (gộp trang Số liệu & giám sát, Chi phí AI, chuyển phiên admin `/auth/handoff` vào shell mới).
- Chạy thật: `pnpm stack:be` (BE `develop` 323e562) + `pnpm --filter @tripflix/admin dev`, đăng nhập bằng tài khoản seed superadmin và moderator, chụp các màn bằng Playwright.

## Cách kiểm lại
1. Ở `tripflix-be` nhánh `develop`: `pnpm stack:be`.
2. Ở `tripflix-fe`: `pnpm --filter @tripflix/admin dev`, mở http://localhost:3200, đăng nhập `moderator@tripflix.local`.
3. Topbar hiện "Trực tiếp". Mở `/moderation` ở hai trình duyệt (moderator và superadmin); xử lý một hồ sơ ở một bên, bên kia cập nhật ngay.
4. Tắt notification-service: topbar đổi "Mất kết nối · tự cập nhật mỗi 5 giây", dữ liệu vẫn tự làm mới.

## Ảnh / video
- Ảnh chụp các màn (Tổng quan, Kiểm duyệt, ngăn chi tiết, Cảnh báo, Nhân sự, Job tìm kiếm, Đăng nhập, mobile) đính kèm trong PR.

## Ảnh hưởng tới phần của người khác
- Có, người dùng (Trang) đã đồng ý trong phiên; cần chủ code duyệt PR:
  - `apps/admin`, `packages/ui-web` (Thành): làm lại shell, các màn, `globals.css`; xoá `live-workspace.tsx`, `placeholder-page.tsx`, `module-content.tsx` (không còn dùng) và 3 CSS module của màn kiểm duyệt.
  - `apps/admin/src/app/bff` (Dũng): thêm route cấp access token cho socket.
  - Màn Theo dõi tìm kiếm, Job tìm kiếm/gợi ý (Duy): **không sửa file**; chỉ đổi khung chung và định nghĩa lại các class toàn cục cũ bằng token.
  - `pnpm-workspace.yaml` (cấu hình chung): thêm `recharts` vào catalog.
