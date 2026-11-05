# TF08 — Trình phát Reels (chờ kiểm thử thiết bị)

- Task do người dùng chuyển yêu cầu từ Phong trong phiên làm việc, chưa có URL Notion.
- Nhánh `trang/TF08-trinh-phat-reels`, người làm Trang (dùng AI), ngày 2026-11-05.

## Đã triển khai

- Cài `expo-video ~58.0.13` và `expo-network ~58.0.4` bằng Expo CLI theo SDK 58.
- Tab Reels dùng màn riêng. `LiveFeedScreen` tiếp tục dùng ở Bài của tôi và Đã lưu.
- Đã nối API cuối cùng `GET /api/v1/feed` từ PR BE #48. Client được sinh lại bằng `pnpm gen:api`, gọi qua `packages/api-client`, phân trang bằng cursor nguyên gốc và gửi token khi có phiên đăng nhập. Khách xem được theo contracts mới.
- Feed có trạng thái tải, lỗi, rỗng, kéo để làm mới và tải trang kế tiếp. Bỏ qua mục thiếu nguồn video. Lỗi trang kế tiếp giữ video đã tải và cho thử lại đúng trang, chặn tự lặp yêu cầu lỗi.
- Đồng bộ contracts sau BE `5ec327b`, gồm query `flat` cho bình luận và client AI Summary. Giới hạn nhập bình luận của mobile và web là 10.000 ký tự theo DTO mới.
- Giao diện có tác giả, chú thích và thanh thích, bình luận, lưu, chia sẻ. Thích và lưu dùng API social và cập nhật số đếm. Khách được chuyển tới đăng nhập khi tương tác cần tài khoản. Chia sẻ dùng bảng chia sẻ hệ thống và ghi nhận qua API khi thành công.
- Bảng bình luận dạng sheet dùng lại `LiveComments`, thêm giao diện gọn cho Reels, hỗ trợ gửi, sửa, xoá và trả lời qua API. Mở bảng thì tạm dừng video, đóng bảng phát tiếp. Bình luận của clip thử chỉ lưu trong phiên và có nhãn giải thích. Không giả lập bài đăng thật cho clip mẫu.
- Màn phát vuốt dọc, ba player dùng lại cho bài trước, hiện tại và sau. Bài hiện tại đặt buffer 30 giây, hai bài cạnh 4 giây.
- Thay nguồn native theo thứ tự, bỏ qua kết quả tải đã hết hiệu lực khi vuốt hoặc rời màn hình.
- Chỉ bài hiện tại phát. Rời tab, vào nền hoặc mất mạng thì dừng và tháo nguồn; native player được hook giải phóng khi unmount.
- Chọn ảnh bìa nhỏ nhất đủ chiều rộng, giữ ảnh tới khung hình đầu. Có trạng thái đang tải, lỗi, mất mạng, nút thử lại và bật/tắt tiếng.
- Đã đọc `D:/Sukem/VinUni/VSF/tripflix/feed-demo/src/usePlayerPool.ts`, `Slide.tsx` và `App.tsx`. Áp dụng cách tắt tiếng trước khi dừng, đổi bài khi qua nửa màn hình và đợi trang dừng để thay nguồn. Giữ nguyên toàn khung video dọc, ngang và vuông; video ngang có ảnh bìa mờ phía sau.
- Trên mạng di động, đặt `player.maxResolution` theo chiều video để giữ ABR trong giới hạn 540p. Sang Wi-Fi thì bỏ giới hạn bằng `null`, giữ nguồn master và bộ đệm hiện tại. Bản SDK 58 đã cài có setter này trong TypeScript, Android và iOS. Android dùng giới hạn cứng khi có track phù hợp, iOS dùng mức ưu tiên. Có nhãn chất lượng thực tế trong development để thử trên điện thoại.
- Hai biến demo trong `apps/mobile/.env.example` cho link HLS và ảnh bìa, chỉ dùng trong development. Đã điền nguồn Phong cung cấp vào `.env` local, bỏ tham số theo dõi `fbclid`. Ảnh bìa mặc định lấy đủ ba cỡ cạnh master của worker Tripflix. URL và bí mật không được commit.
- Khi feed trống hoặc lỗi, development có nút mở video thử nghiệm riêng, có nút quay lại feed. Luồng bình thường luôn lấy feed thật, không tự trộn clip mẫu vào bài đăng.

## Kiểm tra đã chạy

- `pnpm check` thành công, lint không có cảnh báo, typecheck thành công và 57/57 test qua.
- `expo export --platform android` thành công với code feed mới, tạo bundle Hermes 3,1 MB và assets trong thư mục tạm `C:/Users/ADMIN/AppData/Local/Temp/tripflix-tf08-feed-android-221f636b`. Đây là kiểm tra biên dịch, chưa phải chạy trên Android.
- Bốn test mới kiểm lựa chọn ảnh bìa, giữ đúng tỷ lệ khung hình, cửa sổ ba player khi vuốt xuôi/ngược/nhảy xa và kích thước giới hạn 540p cho ba chiều video.
- Ba test API mới kiểm endpoint thật trong client sinh, cursor, huỷ yêu cầu, token tuỳ chọn và lỗi phản hồi.
- Local BE đã cập nhật `develop` tại `5ec327b`, build và migration thành công. Đã chạy `pnpm db:seed` với `SEED_PASSWORD` trong `.env` local. Feed thật trả 10 bài phát được, phân trang limit 3 có 4 trang và không trùng. Toàn bộ là video dọc với mức 360p, 540p. Cả 10 master HLS và 30 poster qua CloudFront trả thành công.
- Cấu hình commerce local đã chuyển từ database `commerce` cũ sang schema `commerce` trong database `core` theo hướng dẫn TF57. Dùng lệnh cấp quyền/tạo schema idempotent, chạy migration và seed vào `core`, giữ database cũ. Tài khoản đã có được seed giữ nguyên.
- Mobile `.env` local dùng `http://192.168.2.147:8080`, địa chỉ Wi-Fi của máy chạy BE khi kiểm tra, và thêm origin Expo LAN vào CORS. API và app đều chạy được qua IP này. Đây là cấu hình theo máy, cần đổi nếu IP Wi-Fi đổi.
- Playwright trên Expo web kiểm bằng API thật qua IP Wi-Fi, feed 10 bài có HLS tự phát, mở bình luận seed trong sheet, đóng/mở bảng thì video dừng/phát đúng. Đăng nhập bằng tài khoản member seed, gửi bình luận và thích bài qua API thật thành công, dọn bình luận thử và phục hồi phản ứng ban đầu sau kiểm tra. Không có lỗi JavaScript.
- Các case lỗi và phân trang được kiểm thêm bằng API fixture trên mobile web, HLS phát qua CloudFront thật.
- Lệnh mở Expo Web kèm API URL tạm qua biến shell bị bộ duyệt tự động chặn (`blocked by policy`). Các test trình duyệt dùng cấu hình hiện có và route fixture trong phiên kiểm thử; API thật được kiểm qua HTTP riêng.
- Link HLS Phong cung cấp trả 200, có 360p, 540p, 720p và ba poster 360/540/720 đều trả 200. Tổng thời lượng playlist là 60 giây.
- Chromium chạy bản mobile web đã phát HLS thật, thời gian phát tăng, xác nhận tạm dừng, phát tiếp, bật tiếng, mất mạng và tự phát lại khi kết nối phục hồi. Lỗi HTTP 503 của master hiện thông báo, nút tải lại phát thành công sau khi nguồn phục hồi. Không có lỗi JavaScript.
- Dùng fixture tạm với bốn item cùng nguồn HLS để kiểm cửa sổ 0 → 1 → 3 → 1 → 0. Có hai VideoView ở đầu/cuối, ba ở giữa, mỗi lần chỉ một video phát. Rời màn hình dừng phát. Fixture được xoá sau kiểm tra. Kiểm tra cuộn bằng vị trí trên bản web, chưa đo hiệu năng vuốt Android.
- Playwright trên cổng 8081 xác nhận thanh tương tác, mở/đóng bảng bình luận và phát/dừng video, bình luận demo giữ trong phiên. Với API fixture xác nhận PUT reaction, PUT bookmark, POST comment có Idempotency-Key, số đếm làm mới, draft được giữ sau lỗi 503 và xoá sau gửi thành công. Giao diện comment compact đã kiểm lại. Không có lỗi JavaScript.
- Sau khi thêm tương tác, `pnpm check` qua đủ 57 test, lint không có cảnh báo. `expo export --platform android --max-workers 2` xuất bundle Hermes thành công tại thư mục tạm `tripflix-tf08-social-7a23de06`.
- Ảnh kiểm tra tương tác tại cùng thư mục ảnh local, tên `tf08-social-reels.png`, `tf08-social-comments.png`, `tf08-api-reels.png` và `tf08-api-comments.png`.
- Ảnh API và video seed thật tại cùng thư mục, tên `tf08-seeded-reels.png` và `tf08-seeded-comments.png`. Bộ seed có watermark của bên khác, chỉ dùng thử/demo nội bộ theo Phong.
- Với BE develop mới, `core-api test` qua 346/346 test và `test:int` qua 71/71 test. GET comments `flat=true&limit=200` trả 200; GET AI Summary trả 404 khi bài seed chưa có bản tóm tắt.
- Ảnh local `C:/Users/ADMIN/.codex/visualizations/2026/11/05/01a1a9aa-8b59-7d62-b98e-78403bb40fde/tf08-phong-player.png` thể hiện nguồn video thử. Các ảnh `tf08-login.png` và `tf08-awaiting-video.png` thể hiện trạng thái chờ trước khi điền nguồn. Đây là ảnh bản web, chưa phải evidence Android.

## Còn cần để nghiệm thu

- App dùng feed có sẵn playback thay cho luồng lấy mediaIds rồi gọi API playback tạm. Tác giả seed chưa có tên trong access nên API trả author.name null, app hiển thị nhãn tác giả dự phòng.
- API AI Summary đã có nhưng OpenAPI chưa khai báo schema phản hồi thành công, client sinh có `data: void`. Cần chủ BE bổ sung DTO phản hồi trước khi nối giao diện tóm tắt có kiểu. Seed chưa có tóm tắt, GET trả 404 đúng thiết kế.
- Chưa đo tự đổi chất lượng trên Android. Máy hiện tại chưa có adb hoặc thiết bị Android kết nối. `maxResolution`, `bufferOptions` và `videoTrack` là các API native, bản web của expo-video chưa triển khai chúng, nên kết quả trình duyệt chỉ xác nhận luồng phát và giao diện.
- Cần thử trên điện thoại thật với Wi-Fi, 4G và mạng yếu để nghiệm thu tự đổi chất lượng và thời gian đứng hình. Trên iOS, `maxResolution` là gợi ý cho AVPlayer, cần kiểm riêng nếu tiêu chí yêu cầu trần cứng.

## Cách kiểm lại

1. `.env` local đã có `EXPO_PUBLIC_REELS_DEMO_HLS_URL` do Phong cấp. Trên máy khác, chép mẫu và điền link thử vào biến này. `EXPO_PUBLIC_REELS_DEMO_POSTER_URL` có thể bỏ trống để dùng ba poster của worker.
2. Chạy `pnpm --filter @tripflix/mobile start` và mở app bằng Expo Go SDK 58 trên Wi-Fi.
3. Mở tab Reels để xem 10 bài từ seed thật và thử bình luận. Nếu dùng database mới, chạy migrate và seed ở BE trước. Video mẫu ba mức vẫn có thể mở bằng cấu hình demo trên màn rỗng/lỗi để kiểm riêng khi cần.
4. Chuyển Wi-Fi → 4G → Wi-Fi, xem nhãn độ phân giải trong development, ghi lại thời gian đổi mức và các lần đứng hình. Để video chạy đủ lâu vượt phần đã tải trong bộ đệm 30 giây.
5. Dùng ít nhất ba bài từ API thật để thử vuốt xuôi, ngược, kéo làm mới, phân trang và kiểm bộ đệm trên Android. Seed chỉ có hai mức, dùng master mẫu Phong đã cung cấp nếu cần thử 720p.

## Ảnh hưởng

- `apps/mobile` của Trang, `packages/api-client`, `packages/app-core`, `packages/i18n`, manifest dependency và lockfile thay đổi trong phạm vi TF08 người dùng đã giao. Client đồng bộ cả thay đổi contracts commerce từ BE develop.
- Không sửa code BE của Phong. `.env` local BE có thêm origin Expo web 8081/8085 và vẫn được Git bỏ qua.
