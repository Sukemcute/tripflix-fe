# TF11 — Web: trang Cảm hứng tìm khám phá bằng lời

- Jira: [SCRUM-15](https://tripflix.atlassian.net/browse/SCRUM-15) · Notion: [TF11](https://app.notion.com/40dcb9b9e5c281708194d0561df200cd) · Nhánh: `duy/TF11-web-tim-kham-pha` · Người làm: Lê Anh Duy (dùng AI: có) · Ngày: 2026-11-06
- Backend: `POST /api/search` (tripflix-be PR #64, đã merge vào develop).

## Đã làm
- `packages/api-client`: `useExploreSearch(q)` / `getExploreResults(q)` gọi `exploreControllerSearch` đã sinh từ contracts. Dùng `useQuery` (cache theo câu) thay cho mutation orval sinh cho POST, vì đây là lệnh đọc.
- `apps/web` trang Cảm hứng (`/inspiration?q=`):
  - có câu tìm: dòng **Đã hiểu** (nơi, gần bạn, ngân sách, số ngày, tên riêng, từ đã sửa lỗi gõ) và các vùng có kết quả (Ở đâu, Lộ trình, Bài viết, Video) kèm số lượng. Thẻ khách sạn dẫn tới `/hotels/:id` ("từ … / đêm"), thẻ bài dẫn tới `/trips/:id` ("~… / người");
  - không vùng nào có kết quả: hiện gợi ý khác (`suggest`) hoặc thông báo, kèm từ đã bỏ qua;
  - không có câu tìm: bài nổi bật như cũ (`PublicPosts`).
- `packages/i18n`: chuỗi mới cho kết quả; sửa chữ ô tìm (TF06K) cho đúng cách tìm mới: không cần gõ dấu, tìm cả chỗ ở và lộ trình.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Gõ kiểu người trẻ trên web vẫn ra kết quả đúng | Đạt (với dữ liệu hiện có) | Stack local: "homestay da lat duoi 1tr" → Đà Lạt · dưới 1.000.000đ, 2 homestay 520k–560k; "lich trinh da lat 3n2d" → Đà Lạt · 3 ngày; "vinpearl nha trang" → 5 khách sạn Vinpearl |
| Không vượt ngân sách | Đạt | Lọc cứng ở backend; trên trang mọi giá đều ≤ ngân sách đã hiểu |

Chưa có: vùng Ăn gì / Cà phê / Chơi gì rỗng vì chưa có nguồn POI (C18).

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`: 20/20 task pass; api-client 69 test (2 test mới trong `explore-search.test.ts`).
- Chạy thật trên stack local (`localhost:3100/inspiration?q=…`), không có lỗi console từ luồng tìm (chỉ có 401 refresh của khách chưa đăng nhập, có sẵn từ trước).

## Cách kiểm lại
1. `pnpm stack:up` trong `tripflix-be` (develop có `/api/search`), chờ worker dựng chỉ mục.
2. Mở `http://localhost:3100/inspiration`, gõ `homestay da lat duoi 1tr` → Tìm.
3. Gõ `phở bò hà giang` → thông báo chưa có kết quả, "Đã bỏ qua: phở, bò".

## Ảnh / video
- Đính kèm trong PR.
- Ảnh khách sạn hiện icon trên stack local vì local không cấu hình CDN (API trả khoá S3, giống màn tìm chỗ ở hiện có).

## Ảnh hưởng tới phần của người khác
- `apps/web`, `packages/api-client`, `packages/i18n` (Thành): thêm file mới, export mới, chuỗi mới; không đổi hàm có sẵn.
- `features/discovery/home-screen.tsx` và chữ ô tìm trang Cảm hứng (Dũng, TF06K): có câu tìm thì hiện `ExploreResults` thay cho `PublicPosts keyword`; `PublicPosts` và tham số `keyword` giữ nguyên.
