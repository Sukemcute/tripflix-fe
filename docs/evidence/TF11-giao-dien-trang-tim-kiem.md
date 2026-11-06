# TF11 — Web: banner quảng cáo và chia trang ở trang tìm khách sạn

- Notion: [TF11](https://app.notion.com/40dcb9b9e5c281708194d0561df200cd) · Nhánh: `bao/TF11-giao-dien-trang-tim-kiem` · Người làm: Quốc Bảo (dùng AI: có) · Ngày: 2026-11-06
- Backend: không đổi. Dùng `limit`, `cursor`, `nextCursor`, `total` sẵn có của `GET /api/stays`.

## Đã làm
- `apps/web` trang `/search`:
  - Cột trái có banner quảng cáo dưới "Lọc kết quả" (ảnh biển phủ cả banner, nội dung trên lớp kính mờ, nút Coral dẫn tới kết quả Đà Nẵng). Màu lấy từ `packages/tokens`.
  - Kết quả chia 5 phòng mỗi trang, thanh "Trang trước · Trang x/y · Trang sau" nằm dưới, ngoài cột kết quả.
  - Màn ≥841px: thẻ phòng cao cố định 165px và danh sách luôn giữ chỗ cho 5 thẻ, nên banner dừng đúng ở thẻ thứ 5 và không co lại ở trang ít kết quả. Banner thấp hơn 520px thì ẩn danh sách điểm nổi bật để còn chỗ cho ảnh.
  - Màn ≤840px (một cột): ẩn banner để không đẩy kết quả xuống.
- `packages/api-client`: `useStaySearch` nhận thêm `pageSize` (tuỳ chọn), thêm `previous` và `pageNumber`; tự nhớ cursor các trang trước vì API chỉ trả `nextCursor`. Chỉ thêm, trang chủ và mobile không đổi hành vi.
- `packages/i18n`: chuỗi cho phân trang và banner.
- Merge `develop` mới (có bộ lọc TF10 của Trang). Theo yêu cầu của Bảo, trang `/search` dùng lại khung "Lọc kết quả" dạng thẻ cũ (Số sao tối thiểu, Giá tối đa, Sắp xếp) với class riêng `.filterPanel`; `StayResultFilters` và CSS `.filters` của Trang giữ nguyên, chỉ ngừng dùng ở trang này. Lỗi giá của TF10 vẫn hiện dưới ô Giá tối đa. Cột trái về tối đa 240px.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Cột lọc không còn trống phía dưới, có banner quảng cáo | Có | Chạy app, ảnh trong PR |
| Kết quả có phân trang, trang không bị kéo dài khi nhiều phòng | Có | Nha Trang 7 phòng: trang 1 có 5, trang 2 có 2 |
| Banner dài đúng bằng 5 thẻ phòng, không co lại ở trang 2 | Có | Đo trên trình duyệt sau khi merge develop (1536px): đáy banner = đáy thẻ thứ 5 ở trang 1, trang 2 và khi quay lại trang 1; trước merge đã đo thêm ở 1024px |
| Ảnh banner không bị vỡ | Có | Ảnh 900×1125, `sizes` khai báo 640px |
| Gửi đúng `limit`/`cursor` cho API | Có | `packages/api-client/src/stay-search.test.ts` |

## Kết quả kiểm tra
`pnpm turbo run lint typecheck test --filter=@tripflix/web... --filter=@tripflix/mobile`: 21/21 task pass sau khi merge develop. Test: api-client 68 pass, app-core 34, utils 4, i18n 2, tokens 1; 0 fail. Lint 0 cảnh báo.

## Cách kiểm lại
1. `tripflix-be`: `pnpm stack:be`, đợi `core-api` healthy.
2. `tripflix-fe`: `pnpm --filter @tripflix/web dev`.
3. Mở `http://localhost:3100/search?placeId=nha-trang&q=Nha%20Trang` ở cửa sổ rộng hơn 840px.
4. Đáy banner ngang đáy thẻ thứ 5; bấm "Trang sau": trang 2/2 có 2 phòng, banner giữ nguyên độ dài; "Trang trước" quay lại trang 1.

## Ảnh / video
- Đính kèm trong PR.

## Ảnh hưởng tới phần của người khác
- Có: `apps/web` (chủ Thành) — `live-search-screen.tsx`, `hotel-listing.module.css`, thêm `search-ad-banner.tsx`.
- Có: bộ lọc TF10 của Trang. Trang `/search` không còn dùng `StayResultFilters` (mất giá tối thiểu, ngân sách nhanh, chọn sao dạng nút, thu gọn trên màn hẹp). File và CSS của Trang không bị xoá. Bảo đã được cảnh báo và đồng ý; cần báo Trang.
- `packages/api-client/src/stay-search.ts`: chỉ thêm tham số tuỳ chọn và hàm mới, không đổi chữ ký cũ; `apps/mobile` typecheck pass.
