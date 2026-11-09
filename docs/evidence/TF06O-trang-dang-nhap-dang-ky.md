# TF06O — Trang đăng nhập, đăng ký mới và đăng ký kèm thông tin cá nhân

- Notion: TF06O · Nhánh: `dung/TF06O-trang-dang-nhap-dang-ky` · Người làm: Dũng (dùng AI: có) · Ngày: 2026-11-09
- Phụ thuộc: tripflix-be PR #102 (API đăng ký bắt buộc `dateOfBirth`, `gender`, `nationality`, `acceptTerms`). Merge BE trước.

## Đã làm
- `/login`, `/register`, quên/đặt lại mật khẩu, xác thực email gom vào route group `app/(auth)` dùng chung layout (`AuthShell`): ảnh nền Hạ Long làm mờ, cụm ảnh và khẩu hiệu bên trái, thẻ form kiểu liquid glass (khúc xạ SVG trên Chrome, Edge; trình duyệt khác giữ kính mờ). Không có header, footer chung. Trang cao đúng một màn hình, không cuộn.
- Chuyển giữa đăng nhập và đăng ký: thẻ rộng ra (440 → 720px) và trượt sang trái, cụm ảnh, tiêu đề, ảnh nền trượt theo; quay lại thì trượt ngược (`AuthSplitFrame` ghi `data-mode` theo đường dẫn, CSS transition 0,7s; tắt khi bật giảm chuyển động). Chiều cao thẻ co giãn mượt (`AuthCardBody`).
- Đăng nhập: nhãn nổi trong ô, icon thư/ổ khoá, nút mắt hiện/ẩn (ẩn nút mắt riêng của Edge), "Quên mật khẩu?" dưới ô mật khẩu, nút Google dạng icon trong ô vuông, nút "Tạo tài khoản mới".
- Đăng ký một thẻ hai cột: tên, email, mật khẩu; ngày sinh (ba ô Ngày/Tháng/Năm, số ngày tự khớp tháng, năm nhuận), giới tính, quốc tịch; ô tick đồng ý Điều khoản sử dụng và Chính sách bảo mật. Gửi mã xong, ô nhập mã hiện ngay trong thẻ.
- Trang mới `/dieu-khoan-su-dung` (bản nháp, cần nhóm đọc lại); Chính sách bảo mật cập nhật phần thông tin cá nhân.
- `packages/app-core`: luật dùng chung web và app (`getSignupProfileIssue`, `COMMON_NATIONALITIES`, `getAgeOn`, `parseDayMonthYear`).
- App mobile: màn đăng ký thêm ngày sinh (gõ dd/mm/yyyy), giới tính, quốc tịch, đồng ý điều khoản; `EXPO_PUBLIC_WEB_URL` để mở Điều khoản từ app.
- Link cũ `/login?mode=register` chuyển sang `/register` (giữ `returnTo`).

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Đăng nhập, đăng ký tách trang, chuyển mượt | Đạt | Chrome thật: thẻ chạy qua x 891 → 873 → 567 rồi về 891 |
| Đăng ký gửi đủ thông tin cá nhân và đồng ý điều khoản | Đạt | Request đăng ký có `dateOfBirth: 2000-05-20`, `gender`, `nationality`, `acceptTerms: true` |
| Trang vừa một màn hình | Đạt | 1920×1080, 1440×860, 1366×768, 1280×720: không cuộn; điện thoại 390px: thẻ đăng ký cuộn bên trong |
| Không lỗi runtime, hydration | Đạt | Playwright Chrome: 0 lỗi |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`: 20/20 task pass (sau khi merge develop). Lint web 6 cảnh báo có sẵn ở `flights/` và `login-form`/`register-form` (role=status từ trước).
- `packages/app-core`: 51 test pass (thêm 5 test TF06O).
- Playwright điều khiển Chrome, Edge thật (script ngoài repo, API gửi mã và đăng ký giả lập để không gửi mail thật): luồng trượt và đăng ký 16/16, các luồng đăng nhập cũ 9/9, Edge chỉ còn một nút mắt.

## Cách kiểm lại
1. Chạy BE theo nhánh tripflix-be TF06O (`pnpm db:migrate`), FE `pnpm dev`.
2. Mở `http://localhost:3100/login`, bấm "Tạo tài khoản mới": thẻ trượt sang trái và rộng ra. Điền đủ, tick điều khoản, gửi mã, nhập mã từ email.
3. Bấm "Đã có tài khoản? Đăng nhập": thẻ trượt ngược về.
4. Mobile: mở màn đăng ký trên Android, điền ngày sinh dạng 20/05/2000, chọn giới tính, quốc tịch, tick điều khoản.

## Ảnh / video
- Ảnh trong PR.

## Ảnh hưởng tới phần của người khác
- Có: `apps/web` (Thành): `globals.css` phần `.auth-*`, route `app/(auth)`, `features/legal`; `packages/i18n`, `packages/app-core`, `tests/e2e/api-integration.cjs` (đổi chữ nút "Tạo tài khoản mới").
- Có: `apps/mobile/src/features/auth/live-auth-screen.tsx` (Trang): bắt buộc vì API đăng ký đổi; chưa chạy trên Android.
- Chưa sửa `SoftDatePicker` dùng chung: đổi năm chỉ đổi lịch, chưa đổi giá trị (đăng ký dùng ba ô chọn riêng).

## Sửa sau khi lên server (2026-11-09)
- Lỗi: trên https://tripflix.io.vn/login có mảng chữ nhật mờ đè nửa ô Google. Ở local không thấy vì Google chặn origin `localhost` nên không vẽ iframe.
- Nguyên nhân: `backdrop-filter: url(#auth-glass-refraction) …` (khúc xạ SVG, chỉ bật trên Chromium) vẽ lỗi quanh iframe nút Google.
- Cách xác định: mở trang server bằng Playwright, chèn CSS tắt lần lượt: tắt khúc xạ thì hết; tắt `clip-path` hoặc `overflow: clip` của thẻ thì vẫn lỗi.
- Sửa: bỏ bộ lọc khúc xạ, giữ kính mờ, viền sáng, ánh phản chiếu. Lint, typecheck pass; Playwright local: đăng ký và trượt 16/16, đăng nhập 9/9.
- Ô Google (sửa thêm): còn nền xanh nhạt khi rê chuột (nền của nút Google trong iframe) và chỉ bấm được vùng giữa (nút "icon" cố định ~40px). Ô và logo G giờ do web vẽ; nút thật của Google phóng 2,5 lần phủ kín ô, opacity 0.01. Kiểm trên trang server (chèn CSS mới qua Playwright): bốn góc và giữa ô đều trúng nút Google, bấm góc dưới trái mở cửa sổ accounts.google.com, không còn nền xanh.
- Logo trang đăng nhập, đăng ký trùng vị trí logo header trang chủ (cùng 142x42, lề trái theo `.ota-container`, giữa hàng 80px; màn ≤640px: 120px, lề 16px). Đo bằng Playwright: 1440px x=58 y=19, 1920px x=160 y=19, 390px x=16 y=22 ở cả `/`, `/login`, `/register`.
