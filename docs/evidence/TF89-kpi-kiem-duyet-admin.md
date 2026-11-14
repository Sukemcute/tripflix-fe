# TF89 — Thẻ số liệu kiểm duyệt trên Admin lấy từ server

- Jira: [SCRUM-116](https://tripflix.atlassian.net/browse/SCRUM-116) · Nhánh: `trang/TF89-kpi-kiem-duyet-admin` · Người làm: Trang (dùng AI: có) · Ngày: 2026-11-14
- Phụ thuộc BE: [tripflix-be#182](https://github.com/Sukemcute/tripflix-be/pull/182) (endpoint `GET /v1/admin/moderation/stats`). Merge PR BE trước.

## Đã làm
- `packages/api-client`: chạy `pnpm gen:api` từ contract của BE #182, thêm `moderationApi.stats()` và test.
  - Lần sinh này kéo theo các thay đổi contract đã có trên BE `develop` nhưng FE chưa sinh lại: reason code `EXTREMISM` (TF88) và các kiểu fallback của discovery/explore. Không sửa tay file sinh.
- `apps/admin/.../moderation-workspace.tsx`: 4 thẻ KPI đọc từ một truy vấn `stats`, bỏ 2 truy vấn lấy 100 dòng queue/nhật ký rồi đếm ở FE.
  - Hàng chờ: `pendingTotal`, dòng phụ là số khẩn cấp (`pendingUrgent`).
  - Khẩn cấp: `pendingUrgent`, dòng phụ là thời điểm hồ sơ chờ lâu nhất.
  - Động cơ AI & Luật: số lần tự ẩn trong 24 giờ (`autoHidden24h`).
  - Báo cáo cộng đồng: báo cáo mới trong 24 giờ (`reports24h`). Trước đây là tổng `reportCount` của 100 hồ sơ đầu.
  - Số trên tab "Chờ duyệt" lấy từ `pendingTotal`.
  - Đang tải hiện `…`, lỗi hiện `—` và khối lỗi `AdminApiError` có nút thử lại.
- Màu: bỏ màu ghi cứng trong khối KPI (inline style và `#8B5CF6`, `#10B981` ở viền thẻ), dùng token `--color-coral-ink`, `--color-success`, `--color-navy`.
- `packages/i18n`: thêm chữ cho các dòng phụ, thêm nhãn `EXTREMISM` ("Chống phá, cực đoan") vào `moderation.reasons`. Nhãn này cần vì client mới sinh có reason code `EXTREMISM`, thiếu nhãn thì mobile lỗi typecheck ở `report-button.tsx`.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Admin hiển thị số từ API, không lọc 100 dòng ở FE | ✅ | `moderation-workspace.tsx` chỉ còn truy vấn `moderationApi.stats`; test `đọc số liệu kiểm duyệt tính ở server` trong `packages/api-client/src/moderation.test.ts` |
| Gọi qua api-client, có loading/error, màu từ token, chữ trong i18n (yêu cầu của Thành) | ✅ | Diff PR |
| Lint, typecheck, test pass | ⚠️ | Mục "Kết quả kiểm tra" |
| Ảnh màn hình | ⏳ | Chụp sau khi BE #182 lên staging (máy local không chạy được Docker) |

## Kết quả kiểm tra
`pnpm turbo run lint typecheck test --affected`: 20/21 task thành công.
- Test: api-client 28 file pass, web 13 file pass, app-core 12 file pass, i18n và tokens pass.
- Lint: 0 lỗi. Các warning có sẵn ở `staff-management.tsx`, `notifications-realtime.ts` và mobile, không thuộc thay đổi này.
- `@tripflix/admin typecheck`: pass.
- `@tripflix/mobile typecheck`: fail 11 lỗi, tất cả là route `/my-trips` và `/(tabs)/book` không có trong `apps/mobile/.expo/types/router.d.ts`. File này do Expo sinh khi chạy dev server, bị gitignore và trên máy đang cũ (route `my-trips.tsx` có thật trong `src/app`). Không liên quan thay đổi này. Lỗi mobile do `EXTREMISM` đã được sửa trong PR.

## Cách kiểm lại
1. `pnpm turbo run lint typecheck test --affected`
2. Chạy BE nhánh #182 (hoặc staging sau khi deploy), `pnpm --filter @tripflix/admin dev`, đăng nhập moderator, mở trang Kiểm duyệt.
3. So số "Hàng chờ cần duyệt" với `total` của `GET /api/v1/admin/moderation/queue?view=pending`.

## Ảnh / video
- Bổ sung vào PR sau khi BE #182 lên staging.

## Ảnh hưởng tới phần của người khác
- Có: `apps/admin/src/features/moderation/moderation-workspace.tsx` và `apps/admin/src/app/globals.css` (chủ: Thành). Thành đã đồng ý đổi khối KPI ngày 2026-11-14, chỉ sửa khối KPI và 2 dòng màu viền thẻ.
- File sinh trong `packages/api-client/src/generated` có thay đổi discovery/explore từ BE (Duy). Chỉ là sinh lại, không sửa tay.
