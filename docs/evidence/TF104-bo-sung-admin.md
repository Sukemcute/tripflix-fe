# TF104 — Bổ sung giao diện admin sau PR #182

- Jira: SCRUM-172 · Nhánh: `trang/TF104-bo-sung-admin` · Người làm: Trang (dùng AI: có) · Ngày: 2026-11-17

PR #195 (làm lại toàn bộ giao diện admin) đã đóng vì trùng với PR #182 trên `develop`. Nhánh này chỉ thêm ba phần `develop` còn thiếu, viết theo cấu trúc của #182 (`Panel`, `operations-ui`, luồng SSE qua BFF).

## Đã làm
- **Một luồng realtime cho mọi trang** (`features/shell/admin-realtime-stream.ts`). Trước đây mỗi trang mở một `EventSource` riêng. Mỗi lần chuyển trang, BFF phải đóng rồi mở lại socket tới gateway, và có khoảng trống không nhận tín hiệu. Giờ các trang dùng chung một luồng. Luồng chỉ đóng khi không còn trang nào dùng sau 10 giây, và trang mở sau khi luồng đã sẵn sàng được báo `ready` ngay.
- **Đánh dấu hồ sơ mới vào hàng chờ kiểm duyệt** (`features/moderation/use-fresh-ids.ts`):
  - Hồ sơ xuất hiện sau khi trang đã tải được tô nền và gắn nhãn "Mới" trong 8 giây.
  - Có nút "N hồ sơ mới vào hàng chờ" để cuộn tới hồ sơ mới.
  - Lần tải đầu không đánh dấu gì.
- **Nhịp xử lý 24 giờ trên Tổng quan** (`features/overview/throughput*.ts(x)`):
  - Biểu đồ cột chồng số quyết định mỗi giờ, tách kiểm duyệt viên và hệ thống tự động.
  - Bên cạnh là cơ cấu loại quyết định trong cùng cửa sổ 24 giờ.
  - Dữ liệu lấy từ 100 thao tác gần nhất của `moderationApi.log`, không cần API mới.
- Chữ mới nằm trong `packages/i18n/src/admin-operations.ts`. Màu dùng biến token (`var(--color-navy)`, `var(--color-teal)`) như các biểu đồ có sẵn.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Chuyển trang không mở thêm luồng realtime | Có | `admin-realtime-stream.test.ts`. Playwright: sau 3 lần chuyển trang có 1 luồng (trước đó 3). |
| Kiểm duyệt viên thấy ngay hồ sơ mới do người khác tạo ra | Có | `use-fresh-ids.test.ts`. Playwright hai phiên: nhãn hiện sau 1377 ms, biến mất sau 9 giây. |
| Tổng quan cho thấy nhịp xử lý theo giờ | Có | `throughput.test.ts`. Ảnh Tổng quan: 4 thao tác trong 24 giờ khớp 4 cột. |
| Không đổi API, sự kiện hay schema | Có | Chỉ sửa trong `apps/admin` và `packages/i18n`. |

## Kết quả kiểm tra
`pnpm turbo run lint typecheck test --affected`: 22/22 task thành công.
- admin: 29 test qua (10 file), lint 0 cảnh báo.
- i18n: 2 test qua. web: 121 test qua. app-core: 187 test qua. api-client: 233 test qua. tokens: 1 test qua.
- Các cảnh báo lint ở web, mobile và api-client đã có từ trước. Nhánh này không sửa file nào trong các gói đó.

## Cách kiểm lại
1. Chạy stack BE từ `develop`, rồi `pnpm --filter @tripflix/admin dev` (cổng 3200).
2. Đăng nhập `moderator@tripflix.local`, mở Kiểm duyệt.
3. Ở cửa sổ khác, đăng nhập `superadmin@tripflix.local` và xử lý một hồ sơ. Cửa sổ đầu sẽ hiện "N hồ sơ mới vào hàng chờ" và nhãn "Mới".
4. Chuyển qua lại các trang. Tab Network chỉ có một kết nối `/bff/api/admin/realtime`.
5. Mở Tổng quan và kéo xuống "Nhịp xử lý 24 giờ".

## Ảnh / video
- Đính kèm trong PR: Tổng quan có nhịp xử lý, hàng chờ có hồ sơ mới.

## Ảnh hưởng tới phần của người khác
- Có: sửa `apps/admin` (chủ: Thành) ở `use-admin-realtime.ts`, `moderation-workspace.tsx` và `admin-overview.tsx`. Chỉ thêm code, không đổi props hay hành vi có sẵn. Người dùng đã đồng ý trong phiên làm việc; PR mời Thành duyệt.
