# TF25 — Làm gọn giao diện tab Cảm hứng

- Notion: TF25 · Nhánh: `thanh/TF25-lam-gon-ui-cam-hung` · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-17

## Đã làm
- **Bớt hiệu ứng thừa (chỉ tab Cảm hứng):**
  - Nút "Đăng bài", nút "+" ở thanh bên, nút "Xem chi tiết" lịch trình, nút gửi bình luận: bỏ bóng màu cam, gradient, hiệu ứng nhấc lên; dùng màu trơn `--color-coral`.
  - Thẻ bài đang mở bình luận chỉ đổi viền. Nền pop-up đăng bài chỉ tối đi, bỏ `blur`.
  - Nút trong trình xem ảnh bỏ kính mờ. Màu `#FF6A00` ghi cứng đổi sang token.
  - Giữ lại lớp tối đè lên ảnh bìa và nền mờ sau video Reels, vì cần cho chữ dễ đọc và lấp khung.
- **Thanh cuộn sidebar lịch trình:** ẩn thanh, vẫn cuộn bằng chuột, vuốt, bàn phím.
- **Pop-up đăng bài:**
  - Bỏ các nhãn "Bắt buộc", "Bắt buộc với Reels", "Đang chỉnh sửa bản nháp" (tiêu đề đổi thành "Sửa bản nháp"), bỏ icon lấp lánh ở thông báo lưu nháp.
  - Card một lớp bóng nhẹ, màu từ token thay vì `#FFFFFF … !important`.
  - Nút ở chân pop-up không còn bóng đổ.
- **Ô nhập thẻ** (`composer/hashtag-input.tsx`):
  - Enter, dấu phẩy hoặc dấu cách chốt thẻ; Backspace ở ô trống bỏ thẻ cuối; dán "a, b c" thành 3 thẻ.
  - Bỏ `#`, chữ thường, không trùng, tối đa 10 thẻ, mỗi thẻ 30 ký tự.
  - Chưa chốt thẻ khi đang gõ dấu tiếng Việt (IME).
  - Gửi API vẫn là mảng `hashtags`.
- **Kéo thả video:** ô Reels nhận file thả vào, viền đổi màu khi kéo qua; file không phải MP4/MOV thì báo lỗi.
- **Thanh tiến độ tải video:**
  - Đo theo byte đã gửi (XHR `upload.onprogress`, có sẵn trong `api-client`) thay vì nhảy theo từng phần 10 MB.
  - Vẽ bằng `scaleX` kèm chuyển động 280 ms; lúc chờ server hoàn tất có vệt chạy.
  - Tắt chuyển động khi máy bật "giảm chuyển động".
- **Sau khi đăng bài:**
  - Trước đây pop-up đóng ngay, không báo gì, và bài không hiện cho tới khi F5. Lý do: feed gợi ý cố ý giữ nguyên trang đã tải khi làm mới, để không lặp bài.
  - Giờ sau khi đăng, web lấy chi tiết bài rồi chèn lên đầu feed bài viết và "Bài đăng của tôi" (`composer/published-post.ts`).
  - Cuối màn hình hiện "Đã đăng bài viết." kèm nút "Xem bài" cuộn tới bài; tự ẩn sau 6 giây.
  - Reels thì báo video đang xử lý, sẽ hiện trong mục Reels sau ít phút.
- **Bớt màu thừa, đồng bộ kiểu (đợt rà toàn tab):**
  - Hashtag trên thẻ bài thành chữ xám, tối đa 3 thẻ kèm "+N" (rê chuột xem đủ).
  - Icon thanh soạn bài cùng một màu; nút "+" ở thanh bên cùng màu nút "Đăng bài".
  - Nhãn "tác giả" trong bình luận thành chữ xám.
  - Chữ mô tả trong pop-up (gợi ý ô ảnh, ô video, phần lịch trình) cùng cỡ 0.8rem màu xám.
  - Ô xổ xuống trong pop-up (quyền riêng tư, ngày) bỏ mũi tên mặc định của hệ điều hành, vẽ mũi tên bằng màu token.
  - Ba menu xổ xuống (chia sẻ, "…" của bài, "…" của bình luận) cùng một kiểu: nền trắng, viền mỏng, bo 12px, bóng xám nhẹ, chữ mục 0.88rem.
- **Trang tài khoản:** bỏ mục "Chia sẻ trải nghiệm"; đăng bài chỉ còn ở tab Cảm hứng. `?tab=create` cũ mở tab Tài khoản.

## Đối chiếu "Xong khi"
| Tiêu chí (anh Thành yêu cầu) | Đạt | Bằng chứng |
|---|---|---|
| Ẩn thanh cuộn sidebar lịch trình | Đạt | `social-feed.module.css` `.itineraryScrollBody` |
| Bỏ "Chia sẻ trải nghiệm" ở trang tài khoản | Đạt | `account-tabs.ts`, `live-account.tsx`; e2e chuyển sang tab Cảm hứng |
| Bớt neon, bóng, blur ở tab Cảm hứng và pop-up | Đạt | Chụp trước/sau bằng Chrome headless (gửi anh trong phiên, không commit) |
| Thanh tiến độ mượt | Đạt | `composer-inputs.test.ts` › "chạy liên tục theo byte đã gửi" |
| Kéo thả video | Đạt | `composer-inputs.test.ts` › "thả video vào ô chọn"; chụp trạng thái đang kéo |
| Đăng xong có thông báo, bài hiện ngay trên feed | Đạt | `published-post.test.ts` (4 test); chạy thật: đăng bài "Hai ngày ở Đà Lạt", bài nằm đầu feed, thông báo hiện |
| Ô nhập thẻ | Đạt | `composer-inputs.test.ts` › "thẻ (hashtag)"; chạy thật: gõ "dalat⏎ caphe⏎ cho dem " ra 4 thẻ |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected --continue`: 16/17.
  - Test: web 25 file pass (gồm `composer-inputs.test.ts` 13/13, `published-post.test.ts` 4/4), api-client 31, app-core 18, admin 7, i18n 1.
  - Lint web 0 lỗi; 15 cảnh báo đều có sẵn từ trước, không có trong file của task này.
- `@tripflix/mobile#typecheck` fail ở máy local vì file sinh `.expo/types/router.d.ts` (gitignore, tạo ngày 12/11) chưa có route `/my-trips`. Lỗi này có sẵn từ trước, không do thay đổi này; mobile chỉ bị kéo vào vì `packages/i18n` đổi.
- e2e `tests/e2e/api-integration.cjs` chưa chạy được ở máy local (thiếu `playwright-core` và API ở cổng 8080).

## Cách kiểm lại
1. `pnpm --filter @tripflix/web exec vitest run src/features/social/composer`.
2. Chạy web, đăng nhập, vào `/inspiration`, bấm "Đăng bài":
   - gõ thẻ rồi Enter hoặc dấu cách;
   - chọn "Reels (Video)", kéo một file MP4 vào ô video;
   - bấm đăng và xem thanh tiến độ chạy liên tục.
3. `/account?tab=create` mở tab Tài khoản, không còn mục "Chia sẻ trải nghiệm".

## Ảnh / video
- Không đính kèm (theo yêu cầu của anh Thành).

## Ảnh hưởng tới phần của người khác
- `live-account.tsx` (Dũng viết phần lớn): bỏ tab `create` (10 dòng). `post-composer.tsx` của Dũng giữ nguyên nhưng không còn chỗ dùng; đã nhắn Dũng tự quyết có xoá không.
- `tests/e2e/api-integration.cjs` (Trang viết): bước "Lưu bản nháp và đăng bài chữ vào database" chuyển sang pop-up ở tab Cảm hứng, vẫn kiểm đủ lưu nháp, đăng, trạng thái `published`, thêm kiểm hashtag. Bước cũ vốn đã hỏng từ commit `274ba20` (link "Xem chi tiết" đổi sang `/inspiration?open=…` nên `href.split('/').pop()` không còn ra id).
- `post-owner-menu.module.css` (Dũng) và `comment-visibility.module.css` (Trang): chỉ đổi CSS cho theo kiểu menu chung, không đổi hành vi; anh Thành đồng ý, đã báo hai người.
- Anh Thành đã đồng ý cách làm này trong phiên.
