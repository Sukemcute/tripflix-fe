# TF06N — Chi tiết bài ở màn Kiểm duyệt (admin)

- Notion: <dán link task TF06N> · Nhánh: `dung/TF06N-admin-chi-tiet-bai` · Người làm: Hoàng Đức Dũng (dùng AI: có) · Ngày: 2026-11-06
- Chỉ FE (`apps/admin`, `packages/i18n`). Không đổi API BE, dùng sẵn `GET /v1/admin/posts/:id` và `POST /v1/admin/posts/:id/moderation`.

## Vấn đề

- Bấm "Xem chi tiết" ở màn Kiểm duyệt, khung bài chỉ in tiêu đề, nội dung, tên tác giả thành ba dòng chữ trơn trên nền xanh, ô Lý do và các nút xếp dưới cùng. Không giống bài viết bên web, kiểm duyệt viên không thấy hashtag, điểm đến, lộ trình, số tương tác, trạng thái bài.
- Lịch sử kiểm duyệt in mã hành động tiếng Anh (`hide · SPAM · …`).
- Bấm "Xem chi tiết" ở dòng trên của bảng dài thì khung bài nằm tít cuối trang, phải tự cuộn xuống tìm.

## Đã làm

- **Khung bài mới** (`features/moderation/moderation-post-detail.tsx`), 2 cột, xếp 1 cột khi màn ≤ 1000px:
  - **Cột trái, bài như trang bài viết bên web (TF06J)**: dòng trên có điểm đến, ngày đăng, nhãn trạng thái (Đã đăng / Bản nháp / Đã ẩn / Đã gỡ / Đã xóa, màu theo trạng thái); tiêu đề lớn; avatar chữ cái đầu + tên tác giả + hashtag; ảnh bìa theo điểm đến khi bài có media (cùng bộ ảnh với web, không khớp điểm đến thì hiện Tripi) kèm số ảnh/video đính kèm; nội dung giữ xuống dòng; lộ trình theo ngày; liên kết "Xem trên web ↗" mở `/trips/:id` ở tab mới (chỉ hiện khi bài đang đăng, vì bài ẩn/gỡ trả 404 bên web).
  - **Cột phải, thẻ xử lý** (dính khi cuộn ở desktop): số cảm xúc / bình luận / chia sẻ / lượt lưu và ngày cập nhật; ô Lý do nền trắng, viền cam khi bấm; nút Ẩn bài / Xóa / Khôi phục, nút Xóa chữ đỏ, nút không đổi được gì ở trạng thái hiện tại thì khóa (bài đang đăng thì khóa Khôi phục, đã ẩn thì khóa Ẩn bài, đã gỡ thì khóa Xóa); lịch sử kiểm duyệt dạng dòng thời gian (Ẩn bài / Gỡ bài / Khôi phục, lý do, thời gian), chưa có thì ghi "Chưa có lần kiểm duyệt nào."
- **Cuộn tới khung bài** khi bài tải xong, mỗi bài một lần (ẩn/khôi phục xong tải lại không làm trang nhảy). Nút "Đóng" chuyển lên đầu khung.
- `post-moderation.tsx` chỉ còn bảng, bộ lọc và gọi API; giữ nguyên tên "Xem chi tiết", nhãn "Lý do", nút "Ẩn bài", "Khôi phục", thông báo "Đã lưu thay đổi." mà `tests/e2e/api-integration.cjs` dùng.
- CSS mới `.admin-post-*` trong `apps/admin/src/app/globals.css`, chỉ dùng biến trong `packages/tokens`. Xóa các luật `.admin-record:has(> label)`, `.admin-record label/input`, `.admin-record .admin-filters` vốn chỉ dành cho khung cũ (khung `.admin-record` ở `module-content.tsx` không dùng các luật đó).
- Ảnh `hoian.jpg`, `sea.jpg`, `home-shore.jpg` (≈ 266 KB) chép từ `apps/web/public/brand` sang `apps/admin/public/brand`, ghi nguồn trong README của thư mục. Mascot dùng `tripi-welcome.png` có sẵn ở admin (không chép `tripi-curious.png` 1,2 MB).
- Biến mới `NEXT_PUBLIC_WEB_URL` (mặc định `http://localhost:3100`) trong `apps/admin/.env.example`.
- Khóa chữ mới trong `packages/i18n`: `api.moderation*`.

## Đối chiếu "Xong khi"

| Tiêu chí                                                     | Đạt | Bằng chứng           |
| ------------------------------------------------------------ | --- | -------------------- |
| Chi tiết bài hiển thị giống bài viết bên web                 | Có  | Kiểm thật (2)–(5)    |
| Bấm Xem chi tiết thì nhảy tới nội dung bài                   | Có  | Kiểm thật (1)        |
| Ẩn / khôi phục vẫn chạy, lịch sử hiện đúng                   | Có  | Kiểm thật (6)–(8)    |
| Màn hẹp 390px không tràn ngang                               | Có  | Kiểm thật mobile (7) |
| Không làm hỏng e2e `api-integration.cjs` (giữ nhãn, tên nút) | Có  | Giữ nguyên tên/nhãn  |

## Kết quả kiểm tra

Chạy ngày 2026-11-06:

```
pnpm turbo run lint typecheck test --affected --force → 20/20 task pass, 0 cảnh báo lint
node tools/check-boundaries.mjs → "Luật FE: không có vi phạm."
pnpm --filter @tripflix/admin build → Compiled successfully
```

Kiểm thật bằng Chrome (playwright-core, script để ngoài repo) trên admin `:3200` → gateway `:8080` → core-api, Postgres thật, tài khoản `moderator@tripflix.local`. Script tự tạo member và một bài Hội An có hashtag và lộ trình 2 ngày, xong thì xóa bài. **16/16 PASS, chạy 3 lần liên tiếp.**

```
[mobile 390px]
(1) bấm Xem chi tiết → cuộn tới khung bài
(2) tiêu đề + tác giả + 2 hashtag
(3) dòng trên: Hội An, ngày đăng, trạng thái Đã đăng
(4) nội dung giữ xuống dòng + lộ trình 2 ngày
(5) có liên kết Xem trên web đúng /trips/:id
(6) Khôi phục bị khóa khi bài đang hiện, chưa có lịch sử
(7) 390px không tràn ngang
[desktop 1366px]
(1)–(6) như trên (khung ở sát cuối trang: trang cuộn hết cỡ)
(7) Ẩn bài → trạng thái Đã ẩn, lịch sử có "Ẩn bài · TF06N_TEST", mất link web
(8) Khôi phục → Đã đăng, lịch sử 2 dòng
(9) Đóng → ẩn khung chi tiết
```

Ghi chú: tên tác giả hiện dạng "User 890e4119" vì API admin chỉ trả tên dựng từ id (BE social chưa ghép tên hiển thị từ access). Không thuộc PR này.

## Cách kiểm lại

1. BE: `pnpm stack:infra`, `pnpm db:migrate`, `pnpm db:seed`, chạy core-api và gateway.
2. FE: `pnpm install`, `pnpm dev` (admin `:3200`).
3. Đăng nhập admin bằng `moderator@tripflix.local`, vào Kiểm duyệt, bấm "Xem chi tiết" một bài, nhập lý do, ẩn rồi khôi phục.

## Ảnh / video

- Đính kèm trong PR: chi tiết bài ở 1366px (trước / sau), sau khi ẩn bài, màn 390px. Không commit ảnh vào repo.

## Ảnh hưởng tới phần của người khác

- Có: `apps/admin` (`features/moderation/*`, `app/globals.css`, `public/brand`, `.env.example`), `packages/i18n` — chủ: Thành. Không đổi tên export, không đổi màn khác.
