# SCRUM-160 — Khảo sát sở thích trên web, mobile lên 6 sở thích

- Jira: https://tripflix.atlassian.net/browse/SCRUM-160 · Nhánh: `trang/SCRUM-160-onboarding-web` · Người làm: Trang (dùng AI: có) · Ngày: 18/11/2026

## Đã làm
- **Bộ mã dùng chung** (`packages/app-core/src/travel-survey.ts`): 6 sở thích `coast, nature, culture, food, city, stays`, 3 nhịp đi, `OnboardingRecord`/`parseOnboarding`, `buildTravelPreferences`, `needsSurvey`. Mobile và web cùng đọc một nơi, không lệch mã.
- **Mobile**: 4 → 6 sở thích (thêm `food`, `city`, nhãn theo Duy). Hai mục mới dùng icon vì chưa có ảnh phù hợp. Dòng gợi ý "chọn 2–5, không ép"; vẫn cần chọn ít nhất 1 để bấm Tiếp tục, vẫn có "Khám phá trước".
- **Web, trang mới `/onboarding`** (`apps/web/src/features/onboarding/`): chào → sở thích → nhịp đi → xem lại. Checkbox/radio thật, mục đã chọn có dấu ✓ và chữ "Đã chọn", Back giữ lựa chọn, bản nháp còn sau khi tải lại.
  - Khách: chỉ lưu `localStorage` (`tripflix.onboarding.v1`), không gọi API. Sau đăng nhập/đăng ký (mật khẩu hoặc Google) bản đã hoàn tất được PATCH một lần với `updatedAt` = lúc khách bấm hoàn tất (`completedAt`), hồ sơ chưa làm thì mở khảo sát. Đăng xuất xoá bản local.
  - Tài khoản: PATCH `/api/auth/me` rồi tải lại hồ sơ. Chỉ báo "Đã lưu sở thích của bạn." khi PATCH thành công; lỗi/mất mạng giữ lựa chọn và có nút Thử lại (giữ nguyên thời điểm bấm hoàn tất). Bỏ qua khi hồ sơ đã `completed` thì không ghi đè.
  - `/account` → thẻ "Sở thích du lịch" có nút "Làm lại khảo sát" (`?mode=edit`, điền sẵn sở thích đã lưu). Đây là đường vào cho SCRUM-162.
- Không ghi "đã cá nhân hoá feed" ở chỗ nào.

## Khác với tin nhắn của Duy (cần Duy/Dũng biết)
- BE đã merge TF106 với hợp đồng `{status, interests, regions, budgetLevels, updatedAt}`, **chưa có `pace`**, nên web và mobile hiện chỉ lưu nhịp đi trên máy, không gửi `pace`, giữ nguyên `regions`/`budgetLevels` đã có. Khi BE thêm `pace` và chạy `pnpm gen:api`, nối thêm vào `buildTravelPreferences` (một chỗ).
- Không chạy `gen:api`, không sửa BE, không sửa code sinh ra.

## Đối chiếu yêu cầu
| Yêu cầu (tin nhắn Duy / Trang) | Đạt | Bằng chứng |
|---|---|---|
| Web có luồng onboarding như mobile | Có | `/onboarding`, `tools/verify-web-onboarding.cjs` (10 nhóm) |
| 6 mã sở thích đúng chính tả | Có | `travel-survey.test.ts` "đủ 6 mã"; QA web "6 sở thích đúng nhãn" |
| Gợi ý chọn 2–5, không ép, vẫn có bỏ qua | Có | QA web: "gợi ý 2–5", "Khám phá trước → trang chủ, ghi skipped" |
| Nhịp đi chọn một, có thể bỏ qua | Có | Nút "Bỏ qua câu này"; pace chỉ lưu local |
| Lưu qua PATCH `/api/auth/me`, `status` completed/skipped, `updatedAt` lúc bấm hoàn tất | Có | QA web tài khoản: body `{status, interests, regions, budgetLevels, updatedAt}`; `buildTravelPreferences` test |
| Khách chỉ lưu local, đăng nhập thì PATCH một lần, đăng xuất xoá local | Có (đồng bộ + xoá: unit/logic; chưa chạy đăng nhập thật) | `post-auth.test.ts`, `use-after-auth.ts`, `survey-logout-cleanup.tsx` |
| Back giữ lựa chọn | Có | QA web "Back giữ các lựa chọn" |
| Lỗi/mất mạng: giữ lựa chọn, có Thử lại, chỉ báo đã lưu khi thành công | Có | QA web "PATCH lỗi → giữ lựa chọn…", "thử lại thành công…" |
| Mục đã chọn có tick/chữ, không chỉ đổi màu | Có | "✓ Đã chọn" trên web; mobile giữ dấu tick sẵn có |
| Đặt lại `{travelPreferences: null}` | Đã có sẵn ở thẻ hồ sơ (nút "Đặt lại"), không đổi | `travel-preferences.tsx` |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`: **22/22 task thành công**; lint chỉ còn cảnh báo có sẵn ở file khác, không có cảnh báo ở file mới.
- app-core: 200 test pass (7 test mới cho `travel-survey`). web: 168 test pass (gồm `post-auth.test.ts` mới). api-client: 243 pass. admin: 29 pass.
- `node tools/verify-mobile-onboarding-profile.cjs`: pass (cập nhật theo 6 mã; kiểm giữ mã lạ `legacy-code`).
- `node tools/verify-web-onboarding.cjs` (Chrome thật, web dev `:3100`): **10 nhóm pass** — khách (6 sở thích, ✓ + chữ, Back, tải lại còn nháp, hoàn tất chỉ lưu local không PATCH, Khám phá trước, 390px không tràn ngang) và tài khoản với API giả lập (PATCH lỗi giữ lựa chọn, Thử lại thành công, không gửi `pace`, về `/account`).

## Giới hạn kiểm thử
- Chưa chạy đăng nhập/đăng ký thật tới BE: phần "khách → đăng nhập → PATCH một lần" và "đăng xuất xoá local" kiểm bằng logic + unit test, không có QA trình duyệt đầu cuối. Phần tài khoản dùng API giả lập (route chặn `/api/auth/*`).
- Chưa chạy lại `verify-mobile-onboarding.cjs` / `verify-mobile-signup-onboarding.cjs` (cần mobile preview `:8082`); chỉ đổi nhãn trong script cho khớp tên mới.
- Chưa chụp trên Android cho mobile (RULES mục 10); thẻ icon của `food`/`city` mới chỉ qua typecheck.

## Cách kiểm lại
1. `pnpm turbo run lint typecheck test --affected`.
2. Chạy web (`pnpm --filter @tripflix/web dev`), mở `http://localhost:3100/onboarding`.
3. `PLAYWRIGHT_PACKAGE=<đường dẫn playwright> WEB_URL=http://localhost:3100 node tools/verify-web-onboarding.cjs`.

## Ảnh / video
- 7 ảnh (chào, sở thích, xem lại, khách đã lưu, 390px, lỗi lưu, tài khoản đã lưu) do `verify-web-onboarding.cjs` sinh ra; đính kèm trong PR, không commit vào repo.

## Ảnh hưởng tới phần của người khác
- **Có — `apps/web` là của Thành** (cần Thành duyệt PR): thêm `app/onboarding/`, `features/onboarding/`; sửa nhỏ `login-form.tsx` và `register-form.tsx` (thay `goBack` bằng `useAfterAuth`), `providers.tsx` (+1 dòng `SurveyLogoutCleanup`), `travel-preferences.tsx` (+nút Làm lại khảo sát), `globals.css` (chỉ thêm cuối file).
- `packages/i18n/src/api.ts`, `packages/app-core`: chỉ thêm khoá/hằng số/hàm.
- BE (Dũng/Duy): không đụng.
