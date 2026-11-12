# TF84 — Box bento "Gợi ý" trang chủ: dừng xoay khi không xem, bỏ refetch thừa

- Jira: https://tripflix.atlassian.net/browse/SCRUM-105 · Nhánh: `duy/TF84-dung-xoay-bo-refetch` · Người làm: Duy (dùng AI: có) · Ngày: 2026-11-11

## Đã làm
- `packages/api-client/src/recommendations.ts`: `useHomeRecommendations` không còn tự refetch theo chu kỳ 10 phút và khi quay lại cửa sổ; `staleTime` tăng từ 5 lên 15 phút. Gộp ba giá trị vào `HOME_RECOMMENDATIONS_REFRESH` để test được. Lý do: danh sách gợi ý trang chủ ít đổi.
- `apps/web/src/features/discovery/ota-home-recommendations.tsx`: timer xoay 7s dừng khi tab ẩn (`visibilitychange`), box ra ngoài viewport (`IntersectionObserver`), chuột thật đang trỏ vào (`pointerType === 'mouse'`) hoặc đang focus bằng bàn phím (`:focus-visible`). Cảm ứng và bấm chuột vào nút mũi tên không làm dừng, để tránh kẹt vĩnh viễn trên mobile web.
- Không đụng `unoptimized` của `SafeComboImage` (chờ TF79). `prefetch={false}` do TF72 làm.

## Đối chiếu "Xong khi"
| Tiêu chí (chép từ Jira) | Đạt | Bằng chứng |
|---|---|---|
| Network 60s trang chủ production: không còn request `_rsc` hay fetch định kỳ | Có | Cả bản cũ và mới: 0 `_rsc`, 0 request API trong ~66s (xem bảng đo). `_rsc` đã hết từ TF72 |
| Tab ẩn thì carousel đứng | Có | Khung trình duyệt bị ẩn (`document.hidden = true`): carousel dừng ở "Đà Nẵng" suốt ~60s, chỉ phát sinh 3 request ảnh của lần xoay cuối trước khi ẩn |
| Box ngoài viewport / hover / focus thì dừng | Một phần | Hover: đo được (bảng dưới). Ngoài viewport và focus bàn phím: chưa đo trên trình duyệt |
| Không refetch khi focus lại cửa sổ | Một phần | Chỉ chứng minh bằng test `recommendations.test.ts` (`HOME_RECOMMENDATIONS_REFRESH`); chưa đo trên trình duyệt |
| Ghi số request trước/sau | Có | Bảng dưới |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/web --filter=@tripflix/api-client`: 5/5 task pass, api-client 19 file / 121 test pass.
- Build production `pnpm build` (`@tripflix/web`) thành công.

Đo trên bản production (`next start --port 3100`), backend chạy bằng `pnpm stack:be`, trang chủ, khung trình duyệt hiện, đếm qua `performance.getEntriesByType('resource')`:

| Điều kiện | Bản | Thời gian | Lần xoay | Request mới | Trong đó `_rsc` / API / ảnh |
|---|---|---|---|---|---|
| Không hover, trang hiện | Cũ | 66s | 8 | 24 | 0 / 0 / 24 |
| Không hover, trang hiện | Mới | 67s | 8 | 26 | 0 / 0 / 26 |
| Chuột trỏ trong box | Cũ | 40s | 5 | 11 | 0 / 0 / 11 |
| Chuột trỏ trong box | Mới | 40s | 0 | 0 | 0 / 0 / 0 |

Nhận xét:
- Khi không hover, hai bản giống nhau (đúng kỳ vọng: không có điều kiện nào để dừng).
- Khi hover, bản mới dừng hẳn xoay và hết request ảnh (ảnh vẫn `unoptimized`, chờ TF79).
- Không thấy request `/api/recommendations/home` lặp trong cửa sổ 60s ở cả hai bản. `refetchInterval` 10 phút và refetch khi focus vốn không rơi vào cửa sổ này, nên việc bỏ chúng là dọn dẹp, không làm số request 60s đổi.
- Lần đo đầu lúc backend đang tắt cho nhiều request `stays`/`posts` lặp: đó là retry của React Query khi backend chết, không phải lỗi của trang.

## Cách kiểm lại
1. `pnpm stack:be` trong `tripflix-be` (cần Docker Desktop), rồi trong `tripflix-fe`: `pnpm --filter @tripflix/web build && pnpm --filter @tripflix/web start`.
2. Mở `http://localhost:3100/`, cuộn tới box "Gợi ý", để chuột ngoài box: carousel xoay mỗi 7s. Đưa chuột vào box: đứng. Chuyển tab khác: đứng.
3. `pnpm turbo run lint typecheck test --filter=@tripflix/web --filter=@tripflix/api-client`.

## Ảnh / video
- Chưa có; thay đổi không đổi giao diện nhìn thấy được.

## Ảnh hưởng tới phần của người khác
- Có: `apps/web/src/features/discovery/ota-home-recommendations.tsx` thuộc phần web (chủ Thành), component do Duy làm ở TF12. Cần báo Thành khi mở PR. Không đổi props, API hay hợp đồng.
