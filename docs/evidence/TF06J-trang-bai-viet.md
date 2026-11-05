# TF06J — Web: trang chi tiết bài viết

- Notion: <dán link task TF06J> · Nhánh: `dung/TF06J-trang-bai-viet` · Người làm: Hoàng Đức Dũng (dùng AI: có) · Ngày: 2026-11-06
- Chỉ FE, không đổi API BE.

## Vấn đề

Trang `/trips/[id]` xếp mọi thứ một cột trơn bằng lớp CSS mượn chỗ khác (`filter-bar`, `search-form`, `detail-section`): 4 nút cảm xúc to như nút lọc, "Chia sẻ" nằm lẻ một dòng, bình luận và ô viết kéo tràn ngang, tác giả chỉ hiện mã `018d9f00`, và câu "Bài đăng này chưa có ảnh hoặc video để phát." hiện ở mọi bài dù bài có video. Nhiều dữ liệu API đã trả nhưng không dùng: khách sạn gắn kèm, điểm đến, hashtag, số theo từng loại cảm xúc, lượt chia sẻ, ngày đăng.

## Đã làm

- `LivePostDetail`, `PostEditor` chuyển sang file mới `features/social/post-detail.tsx`; `live-posts.tsx` export lại nên `app/trips/[slug]/page.tsx` không đổi.
- **Bố cục 2 cột**: cột chính (bài, nút tương tác), cột phụ dính khi cuộn (chuyến đi gắn kèm, tương tác, quản lý bài viết cho tác giả), bình luận là ô riêng dưới cột chính. Màn ≤ 900px: một cột, thứ tự bài → chuyến đi → bình luận.
- **Phần đầu**: nhãn điểm đến + ngày đăng (hoặc "Bản nháp"), tiêu đề, dòng tác giả (avatar chữ cái; tác giả là mình thì hiện tên mình, còn lại "Tác giả Tripflix" vì API chưa trả tên), hashtag dạng thẻ.
- **Ô bìa** thay cho câu "chưa có ảnh hoặc video": bài có media thì hiện ảnh điểm đến có sẵn (Nha Trang, Hội An, Đà Nẵng) hoặc nền màu thương hiệu + mascot, kèm nhãn "Video · Xem video trên app Tripflix". Bài không có media thì không có ô bìa.
- **Lộ trình theo ngày** (nếu bài có `tripAttachment.items`).
- **Nút tương tác**: Thích / Yêu thích / Hữu ích dạng thẻ nhỏ có số đếm riêng, `aria-pressed`; Lưu bài / Bỏ lưu và Chia sẻ cùng hàng; chưa đăng nhập thì là link sang đăng nhập (vẫn thấy số). Chia sẻ bằng sao chép liên kết thì báo "Đã sao chép liên kết bài viết."
- **Cột phụ**: khách sạn gắn kèm, điểm đến, số ngày, chi phí ước tính/người (nếu có), nút "Tìm phòng ở đây" (`/search?q=<tên khách sạn>`), ghi chú giá; thẻ tổng cảm xúc, lượt lưu, lượt chia sẻ; thẻ "Quản lý bài viết" chỉ tác giả thấy (Sửa, Đăng bài nếu nháp, Xóa có hỏi lại và nút Hủy).
- **Bình luận** (`live-comments.tsx`): ô viết ở trên có avatar; mỗi bình luận là thẻ (`article`) có avatar, tên ("Bạn"/tên mình hoặc "Thành viên" + mã), ngày, "đã sửa"; Trả lời / Sửa / Xóa dạng chữ nhỏ; sửa ngay tại bình luận; trả lời thụt vào một bậc; chưa đăng nhập: "Đăng nhập để bình luận".
- **Header màn ≤ 640px**: hàng trên logo + tài khoản, hàng dưới menu (trước đây nút "Đăng nhập" của TF06H rớt xuống một dòng riêng).
- Giữ tương thích `tests/e2e/api-integration.cjs`: nút cảm xúc có `aria-label` đúng nhãn ("Thích"), số đếm qua `aria-describedby`; sửa bình luận vẫn là ô nhãn "Sửa" + nút "Gửi", ô viết mới ẩn khi đang sửa để chỉ có một nút "Gửi"; bình luận là `article`, thân bài là `div`.
- Khoá chữ mới `post*`, `comment*`, `hideReplies`, `commentsWithCount`; CSS `.post-*`, `.comment-*` chỉ dùng biến trong `packages/tokens`. Logic và API không đổi.

## Đối chiếu "Xong khi"

| Tiêu chí                                                          | Đạt | Bằng chứng            |
| ----------------------------------------------------------------- | --- | --------------------- |
| Bố cục rõ ràng, dùng dữ liệu API đang có                          | Có  | Kiểm thật (1), (2)    |
| Không còn báo sai "chưa có ảnh hoặc video"                        | Có  | Kiểm thật (1), (7)    |
| Cảm xúc, lưu bài vẫn chạy, số cập nhật                            | Có  | Kiểm thật (3), (4)    |
| Bình luận, trả lời, sửa, xóa vẫn chạy; test e2e của repo không vỡ | Có  | Kiểm thật (5), (6)    |
| Tác giả quản lý được bài                                          | Có  | Kiểm thật (7)         |
| Màn hẹp đúng thứ tự, không tràn                                   | Có  | Kiểm thật (8) ở 390px |

## Kết quả kiểm tra

Chạy ngày 2026-11-06, Node 24.22.1, pnpm 10.32.1:

```
pnpm turbo run lint typecheck test --affected → 20/20 task pass; mọi gói "Found 0 warnings and 0 errors"
node tools/check-boundaries.mjs → "Luật FE: không có vi phạm."
pnpm --filter @tripflix/web build → Compiled successfully
```

Kiểm thật bằng Chrome (playwright-core, script để ngoài repo) trên web `:3100` → gateway `:8080` → core-api thật, member mới đăng ký: **8/8 PASS**.

```
(1) chưa đăng nhập: 2 cột (cột phụ bên phải), có ô bìa "Xem video trên app", không còn câu "chưa có ảnh hoặc video"
(2) chưa đăng nhập: nút cảm xúc dẫn tới đăng nhập, có "Đăng nhập để bình luận", thẻ khách sạn có "Tìm phòng ở đây"
(3) bấm "Thích": aria-pressed=true, số +1; bấm lại: về như cũ
(4) "Lưu bài" → "Bỏ lưu", giữ sau khi tải lại; bỏ lưu được
(5) các bước bình luận của test e2e trong repo: viết, Gửi, Sửa, Gửi, Xóa (trong article) đều chạy
(6) trả lời hiện trong khung trả lời, thụt vào so với bình luận gốc
(7) tác giả: thẻ Quản lý, nhãn Bản nháp, bài không video thì không có ô bìa; Đăng bài; Xóa → Xác nhận → về trang chủ
(8) 390px: thứ tự bài → chuyến đi → bình luận; header: logo + Đăng nhập cùng hàng, menu hàng dưới; không tràn ngang
```

## Việc cần BE (ghi lại, không làm trong PR này)

- `GET /v1/posts/:id` chưa trả đường dẫn video (HLS), ảnh bìa và tên tác giả (chỉ `/v1/feed` có video, cả hai đều `author.name = null`), nên web chưa phát video được; phát HLS trên Chrome còn cần thư viện (ví dụ `hls.js`).
- Dữ liệu seed `content` ghi sẵn `reaction_total`, `reaction_counts` mà không có dòng trong `content.reactions`; lần đầu có người bấm cảm xúc, BE đếm lại từ bảng nên số về 0 (bài `…0a` trên máy dev: 59 → 0 lúc 2026-11-06 00:36).

## Cách kiểm lại

1. BE, FE chạy như README.
2. Mở một bài ở `/`, xem khi chưa đăng nhập và khi đăng nhập; tạo bài ở `/account` → "Chia sẻ trải nghiệm" để xem phần tác giả.

## Ảnh / video

- Đính kèm trong PR: trước (chưa đăng nhập, member, 390px), sau (chưa đăng nhập, bình luận + trả lời, tác giả, 390px). Không commit ảnh vào repo.

## Ảnh hưởng tới phần của người khác

- Có: `apps/web/src/features/social/live-posts.tsx`, `live-comments.tsx` (phần social của Trang), `apps/web/src/app/globals.css` (thêm `.post-*`, `.comment-*`, đổi header ≤ 640px), `packages/i18n` (chủ: Thành). Đã báo Thành, Trang trước khi làm. Không đổi `PublicPosts` và tên export.
