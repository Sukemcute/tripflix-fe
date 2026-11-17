# TF103 & TF102 — FE Admin đổi chu kỳ job & khoảng trống từ vựng

- Jira: [SCRUM-127](https://tripflix.atlassian.net/browse/SCRUM-127) (TF103), [SCRUM-126](https://tripflix.atlassian.net/browse/SCRUM-126) (TF102)
- Duy, dùng AI: có; ngày 2026-11-16; nhánh `duy/TF103-fe-doi-chu-ky-va-tu-vung`.

## Đã làm
- Sinh lại API client bằng `pnpm gen:api` từ OpenAPI contract mới của `tripflix-be` (`develop`), bổ sung `adminDiscoveryJobsControllerSetInterval` (`PUT /api/v1/admin/discovery/jobs/{job}/interval`) và `adminVocabGapsControllerList` (`GET /api/v1/admin/search/vocab-gaps`).
- Thêm phần đổi chu kỳ tự chạy (`IntervalEditor`) trong `apps/admin/src/features/discovery-jobs/discovery-jobs.tsx` cho các job có `canChangeInterval: true` (`explore` và `recommend_build`), hỗ trợ chọn mức có sẵn hoặc nhập số phút tùy chỉnh (1–1440 phút), nút "Về mặc định", ghi chú riêng cho `recommend_build`, và chỉ hiển thị cho `superadmin`.
- Tách hàm thuần `toIntervalMs` và `formatInterval` sang `apps/admin/src/features/discovery-jobs/interval.ts` kèm unit test `interval.test.ts`.
- Thêm component `VocabGaps` (`apps/admin/src/features/discovery-jobs/vocab-gaps.tsx`) hiển thị ở trang `/search-jobs` (`group === 'search'`), có bộ lọc số ngày (1/7/30/90), badge tổng lượt tìm, và dòng `<details>` mở rộng xem `variants` + tối đa 5 `samples`.
- Bổ sung chuỗi hiển thị i18n trong `packages/i18n/src/discovery-jobs.ts`.

## Kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/admin --filter=@tripflix/i18n --filter=@tripflix/api-client`: 9/9 task pass (`@tripflix/admin`: 3 tests pass; `@tripflix/i18n`: 2 tests pass; `@tripflix/api-client`: 220 tests pass; 0 errors).
- Kiểm thử end-to-end trên stack Docker (`pnpm stack:up` trong `tripflix-be`, Admin tại `http://localhost:3200`):
  - `superadmin@tripflix.local`:
    - `/search-jobs`: `explore` đổi chu kỳ sang `2` phút lưu thành công, hiện nút `Về mặc định (10 phút)`, bấm reset về `10 phút` thành công; `suggest` không hiện ô đổi chu kỳ.
    - `/search-jobs` mục Khoảng trống từ vựng: sau khi seed `POST /api/search` với `"cafe nàng thơ"`, bảng hiển thị dữ liệu và mở rộng `<details>` xem được `variants` và `samples`.
    - `/recommend-jobs`: `recommend_build` hiện ô đổi chu kỳ kèm ghi chú DB/freshness; `recommend_purge` không hiện ô đổi chu kỳ; không render Khoảng trống từ vựng.
  - `moderator@tripflix.local`:
    - Cả `/search-jobs` và `/recommend-jobs` đều ẩn nút `Chạy ngay` và toàn bộ phần đổi chu kỳ; `/search-jobs` vẫn xem được Khoảng trống từ vựng.

## Kiểm lại
1. Chạy stack BE + FE: `pnpm stack:up` trong `tripflix-be`, mở `http://localhost:3200`.
2. Đăng nhập `superadmin@tripflix.local` / `moderator@tripflix.local` (mật khẩu `SEED_PASSWORD` trong `deploy/compose.yaml`) để kiểm tra `/search-jobs` và `/recommend-jobs`.
3. Chạy unit test & typecheck: `pnpm turbo run lint typecheck test --filter=@tripflix/admin --filter=@tripflix/i18n --filter=@tripflix/api-client`.

## Ảnh hưởng
- Phụ thuộc BE TF102 (#220) và TF103 (#219) đã merge vào `develop` của `tripflix-be`.
- Không đụng `/search-monitor` (`features/search-monitoring`).
