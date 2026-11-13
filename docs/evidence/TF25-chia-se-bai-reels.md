# TF25 — Chia sẻ bài viết và Reels bằng menu nhỏ

- Jira: [SCRUM-29](https://tripflix.atlassian.net/browse/SCRUM-29) · Nhánh: `thanh/TF25-chia-se-bai-reels` · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-13

## Bối cảnh
Nút chia sẻ ở Reels không dùng được:
- Link lấy từ `shareUrl` của BE (`https://tripflix.vn/posts/<id>`): tên miền chưa phải web của team, web không có trang `/posts`.
- Link dự phòng `/trips/<id>` mở trang chi tiết không có trình phát video.
- Trên máy tính không có phản hồi gì.
- Lượt chia sẻ bị cộng cả khi người dùng huỷ.

Tab Bài viết cũng dùng `/trips/<id>`, khác cách mở bài từ tìm kiếm.

## Đã làm
- **Link chia sẻ chung** (`post-share.ts`, `buildPostShareUrl`):
  - Bài viết: `/inspiration?open=<id>`, trang Cảm hứng mở sẵn bài, như khi bấm bài từ tìm kiếm.
  - Reel: thêm `&kind=reel`.
  - Cùng dạng với `shareUrl` mới của BE (BE `thanh/TF25-share-url-theo-moi-truong`).
  - Lấy địa chỉ web từ trang đang mở, không phụ thuộc BE.
- **Menu chia sẻ** (`share-menu.tsx`), dùng chung cho Reels (mở sang trái nút) và tab Bài viết (mở phía trên nút):
  - Mục: Sao chép liên kết, Facebook, X, Email, và "Khác" (hộp chia sẻ của máy, chỉ hiện khi trình duyệt có).
  - Sao chép xong hiện "Đã sao chép liên kết" rồi tự đóng. Trình duyệt chặn clipboard thì hiện ô link để chép tay.
  - Là popover của trình duyệt (top layer): không bị khung video cắt, tự đóng khi bấm ra ngoài, nhấn Esc hoặc cuộn. Bấm lại nút chia sẻ thì đóng.
  - Nền trắng, viền mỏng, không bóng đổ hay gradient. Màu lấy từ token, chữ trong i18n.
  - Vị trí tính bằng hàm thuần `placeShareMenu`: luôn nằm trọn trong khung nhìn.
- **Chỉ ghi nhận lượt chia sẻ khi chia sẻ thật**: chép được link, mở trang chia sẻ của mạng xã hội, hoặc hộp chia sẻ của máy hoàn tất. Huỷ thì không tính.
- **Mở link Reel được chia sẻ** (`/inspiration?open=<id>&kind=reel`, không có từ khoá):
  - Reel đó hiện đầu tiên, lướt tiếp là bảng tin Reels (`prependPinnedReelCards`, bỏ bản trùng).
  - Thẻ lấy qua `useReelsByIds`.
- Zalo, Messenger chưa có: cần app id hoặc SDK riêng của Zalo, Facebook. Trên điện thoại dùng mục "Khác" để chọn Zalo, Messenger.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Reels chia sẻ được, link mở đúng Reel | Có | Chạy web local (Edge headless, 1600×900): bấm chia sẻ ở Reel → menu mở bên trái nút, nằm trọn trong khung nhìn. Bấm "Sao chép liên kết" (chuột thật): clipboard = `http://localhost:3100/inspiration?open=<id>&kind=reel`, hiện "Đã sao chép liên kết", tự đóng. `post-share.test.ts` › buildPostShareUrl |
| Mở link Reel: Reel đó lên đầu, lướt tiếp là bảng tin | Có | Mở `/inspiration?open=<Reel thứ 3>&kind=reel`: Reel đang xem đúng id đó, đứng đầu danh sách, sau là các Reel khác. `reel-post.test.ts` › prependPinnedReelCards |
| Bài viết chia sẻ về trang Cảm hứng mở sẵn bài | Có | `post-share.test.ts` › bài viết mở trang Cảm hứng với bài mở sẵn; tab Bài viết: menu mở phía trên nút; bấm lại nút thì đóng |
| Chỉ tính lượt khi chia sẻ thật | Có | Trình duyệt: chỉ gửi `POST /api/v1/posts/<id>/shares` sau khi chép link thành công |
| Link mạng xã hội đủ tham số | Có | `post-share.test.ts` › buildShareChannelUrl (mã hoá `&`, `?` của link) |
| Menu luôn trong khung nhìn | Có | `post-share.test.ts` › placeShareMenu |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`:
  - Test pass: web 83, api-client 202, app-core 125, i18n 2.
  - Lint 0 lỗi, không có warning ở file đã sửa.
- `@tripflix/mobile#typecheck` lỗi ở máy local: `.expo/types/router.d.ts` là file sinh tự động, không commit, còn cũ nên chưa có route `/my-trips`, `/(tabs)/book`. Không do thay đổi này.

## Cách kiểm lại
1. Mở `/inspiration?view=reels`, bấm nút chia sẻ ở cột phải. Chọn "Sao chép liên kết", dán link vào tab mới: mở đúng Reel đó, lướt xuống là bảng tin Reels.
2. Ở tab Bài viết, bấm chia sẻ một bài, chép link, mở: trang Cảm hứng mở sẵn bài đó.
3. Bấm Facebook hoặc X: mở cửa sổ chia sẻ có sẵn link. Số chia sẻ tăng 1. Mở menu rồi bấm ra ngoài: số không đổi.

## Ảnh / video
- Không đính kèm (theo yêu cầu).

## Ảnh hưởng tới phần của người khác
- Không: chỉ sửa code của Thành (`apps/web` social, i18n `api`). Trang `/trips/<id>` giữ nguyên để link cũ và link thông báo bình luận vẫn mở được.
