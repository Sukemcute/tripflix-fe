# TF05H — Đăng nhập bằng Google trên app mobile

- Notion: chưa có task · Nhánh: `dung/TF05H-dang-nhap-google-mobile` · Người làm: Dũng (dùng AI: có) · Ngày: 2026-11-16

## Đã làm
- Màn đăng nhập mobile có "hoặc tiếp tục với" + nút **Google**. Bấm thì mở Google trong trình duyệt, chọn tài khoản xong quay lại app và đăng nhập (`session.loginWithGoogle`, giống web).
- Đăng nhập qua trình duyệt, không dùng module native, nên chạy được cả **Expo Go** (iPhone, Android) và APK. Bản đầu dùng `@react-native-google-signin/google-signin` (build APK trên EAS thành công) đã bỏ vì Expo Go không có module native.
- Web thêm `POST /auth/google/mobile`: Google gửi ID token về đây (`response_mode=form_post`), trang chuyển token sang app sau dấu `#`. Chỉ trả về `tripflix://` hoặc `exp://` có IP LAN/máy; chặn `exp://` công khai (tunnel) và mọi địa chỉ khác để token không bị gửi ra ngoài.
- App dùng client **web** của Google, nên ID token có `aud` mà BE (`GOOGLE_CLIENT_IDS`) đã nhận. **BE không đổi.**
- `app.config.ts` đọc `EAS_PROJECT_ID` (mỗi người dùng project EAS của mình); `eas.json` bản preview trỏ `https://api.tripflix.io.vn` thay địa chỉ staging giả.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Bấm "Đăng nhập bằng Google" chọn được tài khoản và vào Tripflix | Chưa kiểm trên máy | Cần deploy web + redirect URI (xem "Cách kiểm lại"); bổ sung ảnh sau |
| Token chỉ về app, không về địa chỉ lạ | Đạt | `apps/web/src/features/auth/mobile-google-return.test.ts` (3 test) |
| Lint, typecheck, test pass | Đạt | Mục dưới |

## Kết quả kiểm tra
`pnpm turbo run lint typecheck test --affected` (sau khi merge `origin/develop`): 21/21 task pass. web 93 test, api-client 210, app-core 147, i18n 2, tokens 1 — tất cả pass. Lint không có cảnh báo ở file mới.

## Cách kiểm lại
1. Deploy web có route `/auth/google/mobile` lên `https://tripflix.io.vn`.
2. Google Cloud → client **web** → Authorized redirect URIs: thêm `https://tripflix.io.vn/auth/google/mobile`. OAuth consent screen ở trạng thái "In production" (hoặc thêm test user).
3. `apps/mobile/.env`: `EXPO_PUBLIC_API_URL=https://api.tripflix.io.vn`, `EXPO_PUBLIC_WEB_URL=https://tripflix.io.vn`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<client web>`.
4. Điện thoại và máy cùng wifi, `pnpm --filter @tripflix/mobile start` (không `--tunnel`), quét QR bằng Expo Go.
5. Vào Đăng nhập → Google → chọn tài khoản → mở lại Expo Go → vào trang Tôi.

## Ảnh / video
- Chưa có: bổ sung vào PR sau khi web được deploy.

## Ảnh hưởng tới phần của người khác
- Có: `apps/mobile/*` (Trang) — `google-login-button.tsx` mới, `live-auth-screen.tsx`, `app.config.ts`, `eas.json`, `.env.example`; `apps/web` (Thành) — route và helper mới, không sửa file cũ. Cần Trang và Thành duyệt.
