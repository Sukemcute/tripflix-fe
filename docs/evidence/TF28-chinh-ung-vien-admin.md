# TF28 — Panel admin chỉnh số ứng viên gợi ý for_you

- Notion: TF28 · Nhánh: `duy/TF28-chinh-ung-vien-admin` · Người làm: Duy (dùng AI: có) · Ngày: 2026-11-27

## Đã làm

Đo tải ngày 27/11 cho thấy Reels/for_you nghẽn ở CPU core-api. Nguyên nhân là ranker `trip_v1` xếp hạng mọi ứng viên hot trong mỗi phiên. Bên BE (tripflix-be PR #346) đã có API để chỉnh số ứng viên lúc chạy. PR này thêm panel trên trang **Job gợi ý** để admin xem và chỉnh số đó, khỏi phải gọi API tay.

- Panel "Số ứng viên gợi ý for_you" nằm trên "Số liệu gợi ý" và hiện:
  - số đang dùng, và đó là mặc định hay admin đã đặt;
  - mặc định trong code;
  - p50/p95 thời gian dựng phiên cùng số phiên đã đo.
- Phần chỉnh chỉ superadmin thấy:
  - ô số (200–5.000) với nút "Lưu số ứng viên";
  - nút "Về mặc định (…)", chỉ hiện khi admin đã đặt khác mặc định;
  - báo lỗi khi nhập sai;
  - một dòng nhắc kết quả đo để admin chọn số hợp lý.
- Nếu ranker không dùng ứng viên (ví dụ `tag_affinity_v0`), panel báo là không chỉnh được.
- `toCandidateLimit()` (`candidate-limit.ts`) kiểm tra giá trị trước khi gửi. Khoảng hợp lệ lấy từ BE trả về, không ghi cứng.
- Chữ nằm ở `packages/i18n/src/discovery-jobs.ts`. Màu dùng token sẵn có (`text-text-muted`, `text-coral-ink`).
- `pnpm gen:api` sinh lại client. Chỉ commit phần của `admin-discovery-jobs` và model mới. Phần `auth`/`feed` cũng đổi khi sinh lại nhưng không thuộc task này, nên để nguyên.

## Đối chiếu "Xong khi"

| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Admin xem được số ứng viên đang dùng và thời gian xếp hạng | ✅ | Ảnh 1 |
| Superadmin đổi được số ứng viên, không cần deploy | ✅ | Ảnh 1: nhập 1.000 → "1.000 · Admin đã đặt", p50/p95 giảm từ 95/241 ms xuống 41/93 ms |
| Về mặc định được | ✅ | Bấm "Về mặc định (5.000)" → API trả `limit 5000, isOverridden false` |
| Nhập sai bị chặn | ✅ | Nhập 150 → "Số ứng viên phải là số nguyên từ 200 đến 5.000.", nút Lưu bị khoá; `candidate-limit.test.ts` |

## Kết quả kiểm tra

- `pnpm turbo run lint typecheck test --affected --concurrency=2`: 23/23 task pass.
- `@tripflix/admin`: 109 test pass.

## Cách kiểm lại

1. Chạy BE ở nhánh của PR #346, rồi chạy admin (`pnpm --filter @tripflix/admin dev`).
2. Đăng nhập superadmin, mở **Job gợi ý** và kéo xuống panel "Số ứng viên gợi ý for_you".
3. Nhập 1000 rồi bấm Lưu. Mở Reels for_you vài lần, quay lại thì thấy p50/p95 có số.
4. Bấm "Về mặc định".

## Ảnh / video

- Ảnh 1: đính kèm trong PR (panel sau khi đặt 1.000, đo trên máy local với 41k bài).

## Ảnh hưởng tới phần của người khác

- Có: `apps/admin/src/features/discovery-jobs/discovery-jobs.tsx` thuộc `apps/admin` của Thành. File do Duy viết, Trang thiết kế lại ngày 20/11. PR chỉ **thêm** component mới, không sửa phần có sẵn. Duy đã đồng ý trong phiên, cần Thành duyệt.
