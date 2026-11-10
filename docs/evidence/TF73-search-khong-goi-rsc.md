# TF73 — `/search` lọc ở client, không gọi `_rsc` và không remount trang

- Jira: [SCRUM-94](https://tripflix.atlassian.net/browse/SCRUM-94) (TF73) · Nhánh: `duy/TF73-search-khong-goi-rsc` · Người làm: Duy · Ngày: 2026-11-10

## Đã làm
- `packages/api-client/src/stay-search.ts`:
  - Thêm phương thức `apply(query: string, filters: StayFilters)` vào `useStaySearch` (bọc `useCallback` ổn định reference) để cập nhật `text`, reset `selection`, cập nhật `filters`, `submitted` và quay về trang đầu tiên `goToFirstPage()`.
  - Cập nhật điều kiện kích hoạt `suggestions`: `enabled: isReady && !filters.placeId && ...` thay vì phụ thuộc vào `initialFilters?.placeId` tĩnh.
  - Bổ sung unit test trong `packages/api-client/src/stay-search.test.ts` kiểm chứng `apply` và cập nhật state chính xác.
- `apps/web/src/features/discovery/search-params.ts`:
  - Tách hàm thuần `parseSearchParams(read: (key: string) => string)` chuẩn hoá/validate toàn bộ query parameters (`placeId`, `q`, `checkIn`, `checkOut`, `adults`, `rooms`, `minStars`, `stars`, `priceMin`, `priceMax`, `sort`).
  - Viết 7 unit test trong `apps/web/src/features/discovery/search-params.test.ts` bao phủ các ca: `placeId` sai định dạng, `q` rỗng/hợp lệ, ngày quá khứ, `checkOut` sai, các giới hạn số lượng/sao ngoài khoảng, giá min > max, sort lạ.
- `apps/web/src/app/search/page.tsx`:
  - Tái sử dụng `parseSearchParams` để render ban đầu phía server.
  - Bỏ thuộc tính `key={JSON.stringify([placeName, initialFilters])}` trên `<LiveSearchScreen />`, chấm dứt việc React remount toàn bộ DOM khi URL thay đổi.
- `apps/web/src/features/discovery/live-search-screen.tsx`:
  - Đồng bộ URL ➡️ State: Lắng nghe `useSearchParams()` thông qua `useEffect` (bỏ qua lần đầu mount). Khi URL thay đổi do pushState hoặc người dùng bấm Back/Forward trình duyệt (`popstate`), component gọi `parseSearchParams` và `search.apply(...)` để cập nhật kết quả mà không cần remount.
  - Submit lọc & Xoá bộ lọc: Chuyển từ `router.push(href)` sang `window.history.pushState(null, '', href)` khi `!isHomepage`. Giữ nguyên `router.push` khi submit từ trang chủ (`isHomepage: true`) và khi chuyển sang trang chi tiết khách sạn `/hotels/:id`.
  - Chip điểm đến nhanh (`OTA_DESTINATIONS`): Chuyển thẻ `<Link>` sang thẻ `<a>` chuẩn kèm `onClick` chặn click thông thường để gọi `window.history.pushState`, tránh việc Next.js prefetch RSC hay kích hoạt router transition ngầm.
  - Thay thế `initialQuery` tĩnh tại các vị trí tính `resultHref` (dòng ~66), tiêu đề kết quả "N khách sạn tại <place>" (dòng ~481) và link chuyển sang trang chi tiết khách sạn `from: resultHref` bằng `placeName` hiện tại.

## Sửa sau review PR #90
- Tiêu đề "N nơi lưu trú tại …" và `resultHref` (link `from=` sang trang khách sạn) trước đây dùng `placeName` lấy từ ô đang gõ nên đổi theo chữ gõ dở. Nay lấy tên điểm đến từ URL đang áp dụng qua `parseFullSearchParams(searchParams.toString()).placeName` (trang chủ vẫn dùng `placeName`).
- Tách `parseFullSearchParams` trong `search-params.ts` (điền mặc định đủ `StayFilters`), dùng chung cho effect đồng bộ URL → state và cho tiêu đề; thêm 3 test (tổng 10 test trong `search-params.test.ts`).

## Kiểm chứng thật (10/11/2026)
Môi trường: `pnpm build` rồi `pnpm start` (production, port 3100), API giả ở cổng 18080 (`NEXT_PUBLIC_API_URL=http://localhost:18080`) vì không có backend. Trình duyệt trong app, đọc Network và `performance.getEntriesByType('resource')`.

| Tiêu chí | Kết quả | Quan sát |
|---|---|---|
| Đổi bộ lọc không gọi `_rsc` | Đạt | Chọn "4 sao" rồi "Tìm phòng trống": URL thành `...&stars=4`, phát sinh đúng 1 request `GET /api/stays?...&stars=4`; không có request `/search?...&_rsc=` nào cho URL mới. Các `_rsc` còn thấy (`/`, `/flights`, `/inspiration`, `/login`, `/hotels/h1`, `/search` không query) là prefetch của `<Link>` ở header/footer/thẻ khách sạn, thuộc TF72 |
| Không remount | Đạt | Giữ nguyên cùng một phần tử `#place-query` (so sánh tham chiếu DOM) sau khi lọc và sau Back/Forward; ô nhập giữ focus khi gõ |
| Back / Forward | Đạt | Back: URL mất `stars=4`, ô nhập trả về "Hội An", radio sao về "Tất cả", gọi lại `stays` không có `stars`. Forward: `stars=4`, radio "4 sao". Không có `_rsc` |
| Gõ dở không đổi tiêu đề/link | Đạt | Gõ "Đà N" vào ô: tiêu đề vẫn "7 nơi lưu trú tại Hội An"; link khách sạn vẫn mang `from=/search?q=Hội+An&...` |
| Chip điểm đến | Chưa đo | Khối chip nằm trong phần kết quả, lần đo không click được (kích thước 0). Logic giống nhánh submit; cần Duy bấm tay một lần |
| Chọn khách sạn / về trang chủ | Chưa đo | Không đổi so với trước (vẫn `router.push`) |

Số request cho cùng một thao tác lọc (đo thật): sau khi sửa = 1 request REST `/api/stays`, 0 request `_rsc` cho URL lọc. Số liệu "trước khi sửa" trong bản evidence cũ là ước lượng từ mô tả của mentor, chưa đo lại trên nhánh `develop`.

Lưu ý khi đo: `isReady` của session đến chậm với API giả (refresh lỗi), nên dữ liệu hiện sau vài giây; không liên quan PR.

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`: pass (chạy lại sau khi sửa review).
- `pnpm --filter @tripflix/web test`: 10/10 unit tests pass (`search-params.test.ts`).
- `pnpm --filter @tripflix/api-client test`: 17/17 test suites pass (106 unit tests bao gồm `stay-search.test.ts`).
- `pnpm --filter @tripflix/web typecheck`: 0 lỗi.
- `pnpm --filter @tripflix/web build`: Build production thành công.
- `node tools/check-boundaries.mjs`: Luật FE không có vi phạm.

## Ảnh hưởng tới phần của người khác
- Không sửa `ota-home-recommendations.tsx` (tránh xung đột với TF72 của Bảo).
- Không thay đổi contract API backend, không chạy `gen:api`.
- Giữ nguyên toàn bộ hành vi của trang chủ (`isHomepage: true`) và các trang khác (`/inspiration`).
