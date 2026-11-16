# TF25 — Đăng bài viết kèm ảnh trên web

- Jira: [SCRUM-29](https://tripflix.atlassian.net/browse/SCRUM-29) · Nhánh: `thanh/TF25-anh-bai-viet` · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-13
- Cần BE nhánh `thanh/TF25-anh-bai-viet` (upload ảnh qua `media/uploads`, bài trả `images`).

## Đã làm
- **api-client:** `uploadImage`.
  - Tạo lượt tải lên kèm kích thước, PUT một phần, hoàn tất.
  - Lỗi mạng thì thử lại; link hết hạn (403) thì xin link mới.
  - Kèm `resolveImageMimeType` và các giới hạn `MAX_POST_IMAGES` (10), `MAX_POST_IMAGE_BYTES` (10 MB).
  - Sinh lại client theo hợp đồng mới.
- **Form đăng bài (`ComposerModal`), khi chọn Bài viết, có khu "Ảnh" (`composer/post-image-picker.tsx`):**
  - Kéo thả hoặc bấm chọn nhiều ảnh, xem trước dạng lưới 4:5.
  - Ảnh đầu tiên gắn nhãn "Ảnh bìa".
  - Đổi thứ tự bằng nút trước/sau, xoá ảnh.
  - Thanh tiến độ từng ảnh; ảnh lỗi có nút "Thử lại".
  - Đếm "n/10".
- **`usePostImages`:**
  - Chọn là tải lên ngay, tối đa 3 ảnh cùng lúc.
  - Đọc kích thước bằng `createImageBitmap`.
  - Xoá ảnh đang tải thì huỷ request; thu hồi link xem trước khi xoá hoặc đóng form.
- **Lọc file (`selectImageFiles`):**
  - Chỉ nhận JPEG, PNG, WebP; mỗi ảnh tối đa 10 MB; tổng tối đa 10 ảnh.
  - Báo gộp theo lý do kèm tên file. GIF và HEIC báo rõ là chưa nhận.
- **Lưu bài:**
  - Bài viết gửi đủ `media_ids` theo thứ tự (kể cả rỗng, để xoá hết ảnh cũng lưu được), `cover_media_id` là ảnh đầu.
  - Ảnh còn đang tải hoặc bị lỗi thì báo, chưa lưu.
  - Mở lại bản nháp thì nạp lại ảnh đã có.
- **Trang tài khoản, mục "Chia sẻ trải nghiệm" (`post-composer.tsx`):** có khu "Ảnh" giống form ở trang Cảm hứng, lưu nháp gửi `media_ids` và ảnh bìa. Bỏ dòng "Đăng ảnh và video đang được hoàn thiện" ở form này.
- **Trang chi tiết bài (`/trips/<id>`):** bài có ảnh thì hiện lưới ảnh thật (ảnh bìa rộng cả hàng), thay cho khối "Video, xem trên app". Bài video giữ như cũ.
- **Sửa lỗi:** nạp bản nháp từng lấy `mediaIds[0]` làm "video cũ" cho mọi loại bài; giờ chỉ áp dụng với Reels.
- **Hiển thị:** `getPostImages` nhận `uploadedImageUrls`. Bài có ảnh thật thì chỉ dùng ảnh thật, không trộn ảnh minh hoạ. Áp dụng cho thẻ bài, xem ảnh lớn, ảnh bìa ở panel lịch trình và grid kết quả tìm kiếm. Bài chưa có ảnh vẫn dùng ảnh minh hoạ như cũ.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Upload ảnh đúng luồng API, thử lại khi lỗi | Có | `image-upload.test.ts` (4 test): khai kích thước, không gửi thời lượng; 403 xin link mới; 400 thì dừng |
| Chỉ nhận đúng loại, dung lượng, số lượng | Có | `composer/post-image-files.test.ts` › selectImageFiles |
| Đổi thứ tự ảnh | Có | `composer/post-image-files.test.ts` › moveItem |
| Thẻ bài dùng ảnh thật | Có | `post-cover.test.ts` › bài có ảnh tác giả tải lên |
| Đăng bài kèm ảnh trên trình duyệt với S3 thật | Chờ | Cần BE nhánh này đã migrate; xem "Cách kiểm lại" |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`:
  - Test pass: web 81, api-client 206, app-core 125, i18n 2.
  - Lint 0 lỗi, không có warning ở file đã sửa.
- `@tripflix/mobile#typecheck` lỗi ở máy local, không do thay đổi này. File sinh tự động `.expo/types/router.d.ts` (không commit) còn cũ, chưa có route `/my-trips`.

## Cách kiểm lại
1. Chạy BE nhánh `thanh/TF25-anh-bai-viet` đã migrate, chạy web.
2. Ở trang Cảm hứng, bấm tạo bài, chọn Bài viết, kéo 3 ảnh vào khu "Ảnh". Thanh tiến độ chạy, ảnh đầu có nhãn "Ảnh bìa". Đổi thứ tự, xoá 1 ảnh.
3. Lưu nháp, đóng rồi mở lại bản nháp: ảnh còn đúng thứ tự. Đăng bài: thẻ bài ở tab Bài viết hiện đúng ảnh, bấm ảnh xem lớn lướt đúng thứ tự.
4. Ở trang tài khoản, mục "Chia sẻ trải nghiệm": thêm ảnh, lưu bản nháp, bấm "Xem chi tiết": trang bài hiện đúng ảnh.
5. Chọn file GIF hoặc ảnh trên 10 MB: báo lý do, không thêm.

## Ảnh / video
- Không đính kèm (theo yêu cầu).

## Ảnh hưởng tới phần của người khác
- Không: chỉ sửa code của Thành (`apps/web` social, `packages/api-client`, i18n `api`). Không sửa `video-upload.ts` (anh Phong).
- App mobile chưa làm (theo yêu cầu, làm web trước).
- Có thể đụng chỗ với PR chia sẻ #154 (cùng sửa `live-posts.tsx`); merge PR nào sau thì giải xung đột ở PR đó.
