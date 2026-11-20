# Thiết kế lại giao diện Admin (P1–P6)

- Notion: chưa có task (không gắn mã ticket, đã thống nhất với người duyệt) · Nhánh: `trang/TF-admin-ui-redesign` · Người làm: Trang (dùng AI: có) · Ngày: 2026-11-20
- Kế hoạch và nhật ký từng giai đoạn: [`docs/admin-ui-redesign-plan.md`](../admin-ui-redesign-plan.md)

## Đã làm

- **Khung dùng chung (P1)**: layout `app/(console)/` với `AdminShell` bền vững (đổi trang không dựng lại sidebar), menu 5 nhóm có thể thu gọn, `PageHeader` một lớp, quyền xem trang theo vai trò (moderator thấy 7 mục). URL các trang giữ nguyên.
- **Thành phần dùng chung trong `apps/admin/src/ui/` (P2)**: `DataTable`, `FilterToolbar` (`SearchField`/`SelectField`), `Pagination`/`LoadMore`, `MetricStrip`, `Tabs`, `ConfirmDialog`/`AdminDialog`, `TextField`/`SelectInput`, `StatusBadge`, `AdminButton`, `Segmented`. Tab, bộ lọc, trang đang xem nằm trên URL (F5 và chia sẻ link giữ nguyên trạng thái).
- **Drawer chi tiết bên phải (P3)**: `DetailDrawer` + `useDetailParam` (`?id=`). Danh sách giữ vị trí cuộn, bộ lọc và focus; Esc đóng; Back đóng; J/K và nút trước/sau chuyển hồ sơ; có thay đổi chưa lưu thì hỏi trước khi đóng. Dùng cho Đơn hàng, Hành vi người dùng, Trace AI, Trace Analytics, ca Kiểm duyệt, bài viết, OCR ảnh bìa. Modal chỉ còn cho xác nhận và biểu mẫu ngắn.
- **Kiểm duyệt (P4)**: `moderation-workspace.tsx` 1376 → ~120 dòng, tách thành các file theo tab; 8 tab → 6; bảng bắt đầu ở y≈400px (trước ≈900px); ca kiểm duyệt mở trong drawer có footer dính (lý do, nhận xét, hành động); sau khi quyết định tự sang hồ sơ kế tiếp.
- **Tổng quan và các trang hệ thống (P5)**: Tổng quan, Số liệu & Giám sát, Chi phí AI, Job tìm kiếm/gợi ý, Lịch trống & giá, Theo dõi tìm kiếm, tab OCR dùng cùng bộ thành phần; bỏ thẻ lồng thẻ, viền màu trên, bóng, ô nhập 44px.
- **Hoàn thiện (P6)**: quét responsive/a11y 14 trang × 5 độ rộng × 2 vai trò; vòng focus đổi từ `teal` (2,66:1) sang `teal-ink` (6,3:1) vì luật toàn cục cũ trong `legacy-features.css` ghi đè các lớp Tailwind.

## Đối chiếu yêu cầu

| Tiêu chí (từ đề bài) | Đạt | Bằng chứng |
|---|---|---|
| Cấu trúc điều hướng rõ, một tiêu đề trang | Đạt | `nav.test.ts`; script P1 (sidebar không dựng lại khi chuyển 5 trang, `aria-current`, đúng một `h1`) |
| Bảng, bộ lọc, badge trạng thái nhất quán | Đạt | `ui.test.tsx` (DataTable, MetricStrip, Tabs, Pagination, StatusBadge); ảnh `p2/`, `p5/` |
| Chi tiết ở drawer bên phải, giữ danh sách, Esc, trước/sau, chặn mất thay đổi | Đạt | `ui.test.tsx` (DetailDrawer, `getNeighbors`); script P3/P4 (mở ở hàng 20 sau khi cuộn 500px, trang không nhảy; Esc trả focus đúng hàng; Back đóng; dirty guard) |
| Không đổi logic nghiệp vụ, API, phân quyền | Đạt | `moderation-shared.test.ts` (`applyDecision` giữ nguyên 4 nhánh); API gọi giữ nguyên; moderator bị chặn `/orders`; quyết định thật ghi đúng vào DB local |
| Không làm tính năng Giai đoạn 2 (lịch sử kiểm duyệt nâng cao, chỉ báo bất thường) | Đạt | Chỉ dùng dữ liệu của API hiện có |
| Token/hệ thống thiết kế, không thêm thư viện hay font | Đạt | Không đổi `packages/tokens`, `packages/ui-web`, `package.json`; bán kính 4/8/12, một easing, một bóng cho drawer/popover |
| Trợ năng: bàn phím, focus, tương phản, tablist | Đạt | `verify-a11y`: skip link là điểm Tab đầu tiên (không tính lớp phủ dev của Next), 17/17 phần tử Tab được đều có vòng focus `teal-ink`; tương phản chữ: ink 15,8:1, text-muted 4,76:1 trên nền trắng, teal-ink 6,3:1, coral-ink 5,8:1; `Tabs` có ←/→/Home/End |
| Responsive 1440 / 1280 / 1024 / 768 / 390 | Đạt | `verify-p6`: 14 trang × 5 độ rộng × 2 vai trò, 0 tràn ngang, 0 điều khiển thiếu tên/nhãn, đúng một `h1` và một `main`, 0 lỗi JS |
| Kiểm bằng giao diện thật | Đạt | Playwright (Edge) trên stack local; tab OCR kiểm bằng mock vì core-api local chưa có endpoint |

## Kết quả kiểm tra

- `tsc --noEmit` (apps/admin): xanh.
- `pnpm --filter @tripflix/admin lint`: 2 cảnh báo có sẵn từ trước (`user-activity-dialog.tsx`, file không còn được dùng), không thêm cảnh báo mới.
- `pnpm --filter @tripflix/admin exec vitest run`: **102/102** (24 file). `pnpm --filter @tripflix/i18n exec vitest run`: 2/2.
- `node tools/check-boundaries.mjs`: không vi phạm. `next build` (apps/admin): thành công, đủ 14 route.
- Script trình duyệt (stack local, tài khoản seed superadmin và moderator): `verify-p1`…`verify-p5`, `verify-p6`, `verify-a11y` đều đạt.

## Cách kiểm lại

1. `docker start tripflix-postgres-1 tripflix-redis-1 tripflix-mailpit-1`, rồi `tripflix-core-api-1 tripflix-notification-service-1 tripflix-traefik-1`; đợi `http://localhost:3000/health`.
2. `pnpm --filter @tripflix/admin dev` (cổng 3200), đăng nhập `superadmin@tripflix.local` hoặc `moderator@tripflix.local` (mật khẩu seed trong README BE).
3. Mở `/moderation`, bấm một dòng: drawer mở bên phải, danh sách không nhảy; bấm `J`/`K` đổi hồ sơ; `Esc` đóng; nút Back của trình duyệt cũng đóng.
4. Thu nhỏ cửa sổ xuống 390px: sidebar thành menu, drawer thành modal toàn màn hình, không có thanh cuộn ngang.
5. Nhấn `Tab` ngay sau khi tải trang: hiện liên kết "Đến nội dung chính"; mọi nút tiếp theo có vòng focus màu teal đậm.

## Ảnh / video

- Ảnh theo từng giai đoạn nằm ngoài repo, ở `tripflix/outputs/admin-ui-redesign/{baseline,p1,p2,p3,p4,p5-before,p5,p6,p6-moderator}/` (dán vào PR khi mở; không commit ảnh vào repo).

## Ảnh hưởng tới phần của người khác

- Có: `apps/admin` thuộc Thành (đã báo, đồng ý trước khi làm); thêm chuỗi vào `packages/i18n` (`admin-operations`, `admin-orders`, `user-activity`, `moderation-console`). Không đổi API, `packages/tokens`, `packages/ui-web`, cấu hình chung.
- Đã xoá có duyệt: `module-content.tsx` (mã chết) và trường `owner` trong `nav.ts`. Đã xoá không qua bước duyệt riêng, báo lại để Thành biết: `ai-kpi.tsx` (đúng 20 dòng, không còn nơi dùng, `MetricStrip` thay thế).
- Còn chờ duyệt xoá (RULES §3): xem danh sách ⚠️ trong báo cáo cuối của P6 và mục 9 của kế hoạch.
