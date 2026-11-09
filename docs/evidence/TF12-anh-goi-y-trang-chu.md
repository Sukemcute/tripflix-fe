# TF12 — Sửa lỗi ảnh CDN ở khối "Gợi ý dành cho bạn" trang chủ

- Notion: TF12 · Nhánh: `dung/TF12-anh-goi-y-trang-chu` · Người làm: Dũng (dùng AI: có) · Ngày: 2026-11-09

## Đã làm
- `SafeComboImage` trong `apps/web/src/features/discovery/ota-home-recommendations.tsx` thêm `unoptimized` cho `next/image`.
- Vì sao: ảnh khách sạn từ API trỏ tới CDN media (`MEDIA_CDN_URL`, CloudFront). `next.config.ts` chỉ khai báo `images.unsplash.com` trong `remotePatterns`, nên `next/image` ném lỗi runtime "hostname ... is not configured under images" và cả trang chủ hiện màn lỗi. Các component khác dùng ảnh CDN (`stay-thumbnail`, `hotel-gallery`) đã dùng `unoptimized`; sửa theo đúng kiểu đó thay vì ghi cứng tên miền CloudFront vào `next.config.ts` (cấu hình chung).
- Ảnh CDN lỗi (ví dụ 403 khi file chưa có trên CDN) vẫn rơi về ảnh mặc định qua `onError` sẵn có.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Trang chủ không còn lỗi runtime "not configured under images" | Đạt | Chrome thật, `http://localhost:3100/`: 0 lỗi loại này, không có overlay lỗi |
| Khối "Gợi ý dành cho bạn" hiển thị ảnh | Đạt | Ảnh chụp màn hình trong PR |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/web`: 2/2 task pass. Lint 0 lỗi, 6 cảnh báo có sẵn ở `flights/date-picker.tsx`, `flights/airport-picker.tsx`, `auth/login-form.tsx` (không thuộc thay đổi này).
- `apps/web` chưa có test runner; thêm thư viện test nằm ngoài phạm vi sửa lỗi, nên kiểm bằng trình duyệt thật (Playwright điều khiển Chrome, script ngoài repo).

## Cách kiểm lại
1. BE chạy với `MEDIA_CDN_URL` như `.env.example`, FE `pnpm dev`.
2. Mở `http://localhost:3100/`, cuộn tới "Gợi ý dành cho bạn": không còn màn "Runtime Error", ảnh hiện (ảnh CDN hoặc ảnh mặc định).

## Ảnh / video
- Ảnh trước/sau trong PR.

## Ảnh hưởng tới phần của người khác
- Có: `apps/web/src/features/discovery/ota-home-recommendations.tsx` (code của Duy, TF12; `apps/web` do Thành phụ trách). Sửa 1 prop, không đổi props hay hành vi khác. Đã báo Duy, Thành review PR.
