# TF95 — Trang admin chi phí AI

- Notion: TF95 · Nhánh: `bao/TF95-admin-chi-phi-ai` · Người làm: Bảo (dùng AI: có) · Ngày: 2026-11-17
- Kế hoạch Tripi: bước B11. **Phụ thuộc:** PR BE `bao/TF95-analytics-ai-usage` (`GET /api/analytics/ai-usage`). Merge PR BE trước.

## Đã làm
- **Sinh lại api-client core-api** bằng `pnpm gen:api` từ `contracts/openapi/core-api.json` của nhánh BE trên. Chỉ thêm `analytics/analytics.ts` và 6 model `aiUsage*`; không sửa tay file sinh.
- **Trang `/ai-usage` ("Chi phí AI")** trong `apps/admin`:
  - Chọn khoảng 7, 30 hoặc 90 ngày (tính tới hôm nay, theo giờ Việt Nam), và xem theo tính năng, ngày hoặc model.
  - Bảng: lần gọi, token vào, token ra, chi phí USD (4 chữ số thập phân vì mỗi lần gọi chỉ cỡ 0,0001 USD), có dòng tổng.
  - Tổng chi phí hiện ở góc tiêu đề. Ghi rõ chi phí là ước tính theo bảng giá trong ai-service.
  - Chỉ superadmin: người khác thấy câu "dành cho quản trị viên cao nhất" như trang Nhân sự. API cũng tự chặn (403).
  - Lỗi API dùng `AdminApiError` có sẵn, có nút thử lại.
- **Menu:** thêm mục "Chi phí AI" sau "Job gợi ý". Không thêm vào `MODERATOR_PAGES`.
- **i18n:** `packages/i18n/src/ai-usage.ts` và `admin.aiUsage`.

## Đối chiếu "Xong khi"
| Tiêu chí (kế hoạch B11) | Đạt | Bằng chứng |
|---|---|---|
| Trang admin đọc API chi phí AI của B3 | Đạt (code) | `features/ai-usage/ai-usage-report.tsx` gọi `aiUsageControllerGetAiUsage` |
| Theo tính năng, ngày, model; có tổng | Đạt (code) | Bảng có `tfoot` tổng |
| Chỉ superadmin | Đạt | Nhánh `admin.aiUsage` trong `live-workspace.tsx`; API `@Roles('superadmin')` |
| Khoảng ngày khớp giờ Việt Nam với API | Đạt | `ai-usage-range.test.ts` |
| Ảnh màn hình | **Chưa** | Docker trên máy tắt, chưa chạy được core |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test` cho admin, i18n, api-client, web: **12/12** task thành công (2026-11-17).
  - admin 5 test (2 test mới), api-client 220, web 93, i18n 2.
  - Lint 0 lỗi; không có cảnh báo ở file mới.
- `--affected` còn kéo theo mobile vì i18n và api-client thay đổi. Mobile **typecheck lỗi trên máy em** ở `live-comments.tsx`, `live-post-detail-screen.tsx`, `reel-social-overlay.tsx` (route `/user/[id]`).
  - Nguyên nhân: file kiểu route sinh tự động `apps/mobile/.expo/types/router.d.ts` (bị gitignore) đã cũ, chưa có route `/user/[id]` mới của develop.
  - Nhánh này không sửa file nào trong `apps/mobile`. CI không có file đó nên không bị. Chạy `pnpm --filter @tripflix/mobile start` một lần để Expo sinh lại thì hết.
- Phải chạy `pnpm install --frozen-lockfile` trước, vì máy chưa cài `vitest` của admin (develop đã khai báo). Không thêm thư viện mới.

## Cách kiểm lại
1. BE: chạy nhánh `bao/TF95-analytics-ai-usage` (`pnpm stack:up`, `pnpm db:migrate`); ai-service đang phát sự kiện (chat vài câu với Tripi).
2. `pnpm --filter @tripflix/admin dev`, đăng nhập superadmin, vào menu "Chi phí AI".
   - Thấy dòng "Trợ lý Tripi" có số lần gọi, token, chi phí.
   - Đổi "Xem theo" sang Model: thấy từng model (ví dụ `gpt-5-nano`, `deepseek-chat`).
3. Đăng nhập moderator: không thấy mục này; mở thẳng `/ai-usage` thì thấy câu chỉ dành cho superadmin.

## Ảnh / video
- **Chưa có.** Bảo chụp theo "Cách kiểm lại" khi chạy được stack, rồi dán vào PR.

## Ảnh hưởng tới phần của người khác
- Có: `apps/admin` (chủ: **Thành**).
  - `features/shell/nav.ts` thêm 1 mục menu.
  - `features/shell/live-workspace.tsx` thêm 1 nhánh hiển thị (11 dòng), theo đúng kiểu trang Nhân sự.
  - Phần còn lại là thư mục mới `features/ai-usage/` và route `app/ai-usage/`.
  - Cần Thành duyệt trước khi merge.
- `packages/api-client` (file sinh), `packages/i18n`: chỉ thêm.
