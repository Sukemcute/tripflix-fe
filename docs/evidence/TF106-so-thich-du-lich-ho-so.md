# TF106 — Sở thích du lịch trên trang hồ sơ web

- Jira: [SCRUM-171](https://tripflix.atlassian.net/browse/SCRUM-171) (mobile: SCRUM-160) · Nhánh: `duy/TF106-so-thich-du-lich-ho-so` (BE: `duy/TF106-luu-so-thich-onboarding`) · Người làm: Duy (dùng AI: có) · Ngày: 2026-11-17
- API và luật lưu: `tripflix-be/docs/evidence/TF106-luu-so-thich-onboarding.md`.

## Đã làm
- Thẻ "Sở thích du lịch" ở tab Hồ sơ (`apps/web/src/features/auth/travel-preferences.tsx`), ngay dưới "Thông tin cá nhân". Cùng dữ liệu với khảo sát onboarding mobile; trên web chỉ sửa, chưa có trang onboarding.
- 3 trường, chọn nhiều, có thể bỏ trống, cùng một kiểu đính tag, mỗi trường một khung trên một hàng: mỗi lựa chọn một pill có nút ×, nút + mở danh sách còn lại (chọn xong tự đóng), nhiều pill thì xuống dòng trong khung. Bản dropdown trước đó bị chữ dài đẩy khung lấn sang ô bên cạnh:
  - "Bạn thích" `interests`: Biển & đảo, Núi & thiên nhiên, Phố cổ & văn hoá, Ăn uống, Thành phố & về đêm, Nghỉ dưỡng.
  - "Vùng muốn đi" `regions`: Miền Bắc, Miền Trung, Tây Nguyên, Miền Nam.
  - "Mức chi phí" `budgetLevels`: Tiết kiệm, Vừa phải, Cao cấp.
- Lưu: `PATCH /api/auth/me` với `travelPreferences` (không chọn gì thì `status: skipped`), `updatedAt` = lúc bấm Lưu. "Đặt lại" gửi `null`. Cập nhật cache `['account', 'me', userId]` sau khi lưu.
- Danh sách của nút + đóng khi bấm ra ngoài hoặc Esc, mỗi lúc mở một danh sách (`name` chung): danh sách mở che các ô và nút Lưu bên dưới.
- Chữ ở `packages/i18n/src/api.ts` (`travel*`). Ghi rõ "Hiện chỉ lưu lại, chưa dùng để thay đổi gợi ý".
- `packages/api-client` sinh lại bằng `pnpm gen:api` từ OpenAPI của nhánh BE: thêm `TravelPreferencesDto` và 4 enum, sửa `MyProfileDto`, `UpdateProfileDto`.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Chọn sở thích, lưu, tải lại trang vẫn còn | Có | Kiểm thật trên web local với core-api Docker (ảnh trong PR) |
| Đặt lại xoá sở thích | Có | Như trên (PATCH `null` → 200) |
| Chọn nhiều không làm khung tràn sang ô bên cạnh | Có | 6 pill xuống 2 dòng trong khung; khổ 375px không khung nào tràn, trang không tràn ngang |
| Danh sách thêm không che nút Lưu khi đã chọn xong | Có | Bấm ra ngoài / Esc đóng danh sách; mở ô này thì ô kia đóng |
| Gọi API qua client sinh ra, chữ trong i18n, màu từ token | Có | Xem diff |

## Kết quả kiểm tra
Chạy ngày 2026-11-17:

```
pnpm turbo run lint typecheck test --affected --filter='!@tripflix/mobile'
  → 20/20 task pass, lint 0 lỗi (cảnh báo còn lại ở file không thuộc TF106)
  sau khi merge origin/develop: web 121, api-client 227, app-core 174, admin 12, i18n 2, tokens 1 test pass
```

- Không lọc mobile thì `@tripflix/mobile:typecheck` lỗi kiểu route của expo-router (`/my-trips`, `/user/[id]`…) ở file TF106 không đụng tới: do `apps/mobile/.expo/types/router.d.ts` sinh cục bộ đã cũ (09/11, gitignore). Nhánh không đổi file nào trong `apps/mobile`.
- Web local + core-api Docker nhánh BE: chọn 3 trường, Lưu → PATCH 200, tải lại trang vẫn đúng; gửi `pace` → 400.

## Cách kiểm lại
1. BE nhánh `duy/TF106-luu-so-thich-onboarding`: `pnpm stack:be` (chạy migration).
2. FE: `pnpm --filter @tripflix/web dev` với `NEXT_PUBLIC_API_URL=http://localhost:8080`, đăng nhập tài khoản seed, mở `/account`.
3. Ở mỗi trường bấm + để thêm, × để bỏ; bấm Lưu; tải lại trang; bấm Đặt lại.

## Ảnh / video
- Ảnh thẻ khi đã lưu và khi mở danh sách của nút +: đính trong PR.

## Ảnh hưởng tới phần của người khác
- Có: `apps/web` và `packages/i18n` (chủ Thành): thêm một file component, một dòng render trong `live-account.tsx`, CSS `travel-*` mới trong `globals.css`, khoá `travel*` mới trong i18n. Không sửa component có sẵn. Cần Thành duyệt: PR tag Thành.
- `packages/api-client/src/generated`: chỉ file sinh ra cho `travelPreferences`.
- Nhánh dựng trên `eb297f9` (trước merge TF05I #181 nhầm); trước khi mở PR phải merge `origin/develop` sau khi TF05I được gỡ.
