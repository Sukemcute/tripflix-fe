# TF64 — Web: security headers, robots.txt

- Jira: SCRUM-68 (TF64) · Nhánh: `phong/TF64-security-headers-robots` · Người làm: Phong (Thành giao lại; dùng AI: có) · Ngày: 2026-11-17

## Đã làm
- Ba header bảo mật cho mọi trang, khai báo ở `src/lib/security-headers.ts` và gắn trong `next.config.ts`:
  - `X-Content-Type-Options: nosniff`: trình duyệt không đoán lại loại file.
  - `Referrer-Policy: strict-origin-when-cross-origin`: sang trang khác chỉ gửi tên miền, không lộ đường dẫn và tham số.
  - `X-Frame-Options: DENY`: chặn nhúng Tripflix vào iframe (clickjacking).
- Trước khi đặt `DENY` đã kiểm: không chỗ nào nhúng trang Tripflix vào iframe. Nút Google là iframe của Google nằm trong trang mình nên không bị ảnh hưởng. App mobile không mở web bằng WebView.
- `src/app/robots.ts`:
  - Chặn `/api/`, `/account`, `/checkout`, `/payments` theo Jira.
  - Thêm `/auth`, `/bookings`, `/cart`, vì đây cũng là trang riêng của người dùng.
  - Trang công khai vẫn được lập chỉ mục.

## Đối chiếu "Xong khi"
| Tiêu chí (Jira) | Đạt | Bằng chứng |
|---|---|---|
| Security headers: nosniff, Referrer-Policy, X-Frame-Options DENY | Có | `security-headers.test.ts`; `curl -I` trên bản build chạy local |
| `app/robots.ts` chặn `/api/`, `/account`, `/checkout`, `/payments` | Có | `robots.test.ts`; `curl /robots.txt` |
| `remotePatterns` cho `media.tripflix.io.vn`, bỏ `unoptimized` | Có (PR khác) | #185 thêm host. `hotel-gallery.tsx` và `stay-thumbnail.tsx` chỉ tắt tối ưu cho host lạ (TF79) |
| Gọi playback-session với `credentials: 'include'` trước khi phát | Có (PR khác) | #185 (TF82). Xin lại trước khi hết hạn 30 phút |
| Phát bằng hls.js khi trình duyệt không hỗ trợ HLS sẵn; xin lại cookie khi gặp 403 | Chưa | Cần thêm thư viện `hls.js`. Hiện web dùng `<video src>`, chạy trên Safari |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/web`: 3/3 tác vụ đạt, 113 test. Lint 15 cảnh báo có từ trước, không có ở file mới.
- `next build` rồi `next start -p 3999`, `curl -I`: `/`, `/robots.txt` và trang 404 đều có đủ 3 header. `/robots.txt` trả `Disallow` cho 7 đường dẫn ở trên.

## Cách kiểm lại
1. `pnpm --filter @tripflix/web exec vitest run src/app/robots.test.ts src/lib/security-headers.test.ts`
2. Sau khi deploy staging: `curl -sI https://tripflix.io.vn/ | grep -iE 'x-content-type|referrer-policy|x-frame'` ra 3 dòng; `curl -s https://tripflix.io.vn/robots.txt`.

## Ảnh / video
- Không đổi giao diện.

## Ảnh hưởng tới phần của người khác
- `apps/web` (Thành): Thành giao task này cho Phong; nhờ Thành duyệt PR.
