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

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Mở `/search?placeId=ha-long` đổi bộ lọc: không có request `_rsc`, chỉ còn REST API `/v1/discovery/stays` | Đạt | Chuyển sang `window.history.pushState`, loại bỏ `router.push` nội bộ trên `/search` |
| URL cập nhật theo bộ lọc; F5 hoặc chia sẻ link mở đúng kết quả | Đạt | `parseSearchParams` đồng bộ 2 chiều qua URL query string |
| Back / Forward trình duyệt khôi phục đúng bộ lọc và danh sách | Đạt | Hook lắng nghe `useSearchParams()` kết hợp `search.apply` đồng bộ ngay khi URL lùi/tiến |
| Hết remount: ô input không mất focus, giao diện không chớp | Đạt | Bỏ `key` trên `<LiveSearchScreen />` ở `SearchPage` |
| Chọn khách sạn từ gợi ý sang `/hotels/...` và submit từ trang chủ sang `/search` bình thường | Đạt | Giữ nguyên nhánh `router.push` cho `search.selection.type === 'hotel'` và `isHomepage` |
| Nút quay lại từ trang khách sạn (`from: resultHref`) giữ đúng bộ lọc | Đạt | `resultHref` được tính động theo `search.submitted` và `placeName` hiện tại |
| Unit tests & Turbo pipeline xanh | Đạt | 7 test trong `search-params.test.ts`, 3 test trong `stay-search.test.ts`, `pnpm turbo run lint typecheck test --affected` 21/21 tasks pass |

## Số lượng request trước và sau khi sửa (Cùng thao tác lọc 1 bộ lọc)
- **Trước khi sửa:**
  - 1 request Server Component Flight: `GET /search?placeId=ha-long&stars=4&_rsc=...` (Next.js server render lại trang rỗng)
  - 1 request REST API: `GET /v1/discovery/stays?placeId=ha-long&stars=4`
  - ➕ Remount toàn bộ component `LiveSearchScreen`, mất focus trên ô nhập.
  - **Tổng cộng: 2 requests**
- **Sau khi sửa:**
  - 0 request `_rsc` (hoàn toàn cập nhật URL ở Client-side bằng History API)
  - 1 request REST API: `GET /v1/discovery/stays?placeId=ha-long&stars=4`
  - Giữ nguyên DOM, focus và trạng thái component.
  - **Tổng cộng: 1 request (giảm 50% số request, loại bỏ 100% request `_rsc` thừa)**

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`: 21/21 task pass (16 cached, 5 executed).
- `pnpm --filter @tripflix/web test`: 7/7 unit tests pass (`search-params.test.ts`).
- `pnpm --filter @tripflix/api-client test`: 17/17 test suites pass (106 unit tests bao gồm `stay-search.test.ts`).
- `pnpm --filter @tripflix/web typecheck`: 0 lỗi.
- `pnpm --filter @tripflix/web build`: Build production thành công.
- `node tools/check-boundaries.mjs`: Luật FE không có vi phạm.

## Ảnh hưởng tới phần của người khác
- Không sửa `ota-home-recommendations.tsx` (tránh xung đột với TF72 của Bảo).
- Không thay đổi contract API backend, không chạy `gen:api`.
- Giữ nguyên toàn bộ hành vi của trang chủ (`isHomepage: true`) và các trang khác (`/inspiration`).
