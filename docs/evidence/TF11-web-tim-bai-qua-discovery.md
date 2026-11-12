# TF11 — Trang Cảm hứng (web) tìm bài bằng endpoint discovery

- Notion: (chưa có link) · Nhánh: `duy/TF11-web-tim-bai-qua-discovery` · Người làm: Duy (dùng AI: có) · Ngày: 2026-11-11

## Đã làm
- `packages/api-client/src/explore-search.ts`: thêm `searchPublicPosts(keyword, cursor, signal)`. Gọi `POST /api/search/posts` (10 bài mỗi trang), rồi lấy chi tiết từng bài bằng `socialApi.getPost` theo đúng thứ tự xếp hạng, trả `{ items, nextCursor }` cùng dạng với `socialApi.listPosts`. Bài mà chi tiết lỗi (đã ẩn/xoá giữa hai lần gọi) bị bỏ qua thay vì làm hỏng cả trang.
- `packages/api-client/src/queries.ts`: trong `useSocialPosts`, khi có từ khoá thì dùng `searchPublicPosts` thay cho `socialApi.listPosts({ keyword })` (ILIKE của content, không bỏ dấu, không ghép/tách chữ). Không có từ khoá thì giữ nguyên.
- `apps/web` không phải sửa: `SocialFeedView` và `InspirationImmersiveViewer` đã nhận kết quả của `useSocialPosts`.
- Lý do: Thành nhờ chuyển search trang Cảm hứng sang discovery. Engine discovery bỏ dấu, ghép/tách chữ (`vin com`, `sunworld`), sửa gõ sai nhẹ, hiểu nơi/ngân sách/số ngày.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Search trang Cảm hứng gọi endpoint discovery thay vì content | Đạt | Trình duyệt gọi `POST /api/search/posts` rồi `GET /api/v1/posts/<id>`, không còn `GET /api/v1/posts?keyword=` |
| "vin com" ra bài Vincom | Đạt | `/inspiration?q=vin%20com` hiện các bài Vincom (Plaza Hạ Long, Mega Mall Royal City, Landmark 81, Đồng Khởi, Bà Triệu…) |
| Giữ thứ tự xếp hạng và phân trang | Đạt | `search-public-posts.test.ts`: thứ tự `b, a, c` giữ nguyên, `nextCursor` truyền đi |
| Bài lỗi không làm hỏng trang | Đạt | `search-public-posts.test.ts`: bài trả 404 bị bỏ, trang vẫn có kết quả |
| Không có từ khoá thì không đổi hành vi | Đạt | Nhánh `keyword` rỗng vẫn gọi `socialApi.listPosts`; test `queries` hiện có vẫn pass |

## Kết quả kiểm tra
- `packages/api-client`: `vitest run` 22 file, 147 test pass; `tsc --noEmit` và `oxlint` sạch.
- `pnpm turbo run lint typecheck test --affected`: 20/21 task pass. `@tripflix/mobile#typecheck` fail ở `apps/mobile/src/features/booking/hotel-screen.tsx:81` (`"/hotel-rooms"` không thuộc kiểu route), file này không thuộc thay đổi; chưa kiểm trên `develop` thuần.

## Cách kiểm lại
1. Chạy BE local (`pnpm stack:be` trong `tripflix-be`) có vài bài đăng chứa "Vincom".
2. Chạy web: `NEXT_PUBLIC_API_URL=http://localhost:8080 pnpm --filter web exec next dev --port 3200` (cổng 3100 hoặc 3200 mới qua CORS của gateway).
3. Mở `/inspiration?q=vin%20com`, `?q=sunworld`, `?q=lot%20te`. Tab Network phải thấy `POST /api/search/posts` và các `GET /api/v1/posts/<id>`.

## Ảnh / video
- Chưa có ảnh: trình duyệt trong phiên làm việc không chụp được màn hình (timeout). Kết quả kiểm bằng DOM và danh sách request. RULES §5 yêu cầu ảnh khi đổi giao diện; thay đổi này không đổi giao diện, nhưng nên bổ sung ảnh vào PR.

## Ảnh hưởng tới phần của người khác
- Có: `packages/api-client` dùng chung với mobile và `apps/web` (Thành). Mobile gọi `useSocialPosts` không truyền từ khoá nên không đổi. Thành đã được nhắn và là người duyệt.
- Giới hạn: mỗi trang tìm kiếm tốn 1 + 10 request (search rồi 10 lần lấy chi tiết) vì chưa có endpoint lấy nhiều bài theo danh sách id. `isFallback`/`dropped` của BE chưa hiển thị trên UI.
