# TF46 — Thẻ thông báo Web và số chưa đọc trên tab

- Notion: chưa có task riêng được cung cấp; phạm vi theo yêu cầu trong chat.
- Nhánh: `dung/TF46-thong-bao-web-va-tab` · Người làm: Dũng (dùng AI: có) · Ngày: 2026-11-19.
- Backend đi kèm: nhánh `dung/TF46-web-push` trong tripflix-be.

## Đã làm

- Một kết nối realtime dùng chung ở gốc Web; bỏ kết nối trùng ở nút chuông.
- Khi Web có focus: thẻ góc dưới trái, tối đa 3 thẻ, tự đóng sau 6 giây. Bấm thẻ mở nội dung và đánh dấu đã đọc; chỉ hiển thị/đóng thẻ không đánh dấu đã đọc.
- Tiêu đề tab có `(n)`/`(99+)`, giữ tên trang, trở về bình thường khi hết chưa đọc hoặc đăng xuất.
- Các job follower/post watcher hiện không phát socket: kiểm tra bù mỗi phút; không bật lại lịch sử lúc tải lần đầu, tải trang cũ hoặc đổi tài khoản.
- Nút bật thông báo trong hộp chuông, chỉ xin quyền khi người dùng bấm. Từ chối quyền không ảnh hưởng hộp thư/thẻ trong Web.
- Service Worker nhận Web Push khi ở nền. IndexedDB claim theo user/id tránh báo trùng giữa socket, push và nhiều tab; không lưu access/refresh token trong worker.
- Đăng xuất đóng thông báo hệ điều hành, xóa binding và hủy subscription trong trình duyệt. Push của binding/tài khoản cũ bị bỏ qua.
- Đường dẫn click được giới hạn cùng origin. Mở lại từ thông báo khi chưa có tab dùng receipt trong IndexedDB để đánh dấu đã đọc sau khi ứng dụng sẵn sàng.
- Không có timer cập nhật React mỗi giây lúc không có thẻ; đăng ký Service Worker được dùng lại trong một trang.
- Âm báo hiện dùng đúng file `tripi_notification.wav` do người dùng chọn, sao chép nguyên vẹn thành `apps/web/public/audio/tripi-notification.wav` (PCM 44,1 kHz stereo 16 bit, 157.040 byte, 0,89 giây). SHA-256 khớp file nguồn; URL có phiên bản `1a5762e57a29` để tránh phát bản cũ từ cache. File này thay bản Microsoft An tạo thử ban đầu.
- Âm Tripi luôn bật, không có nút tắt/nghe thử: người dùng muốn im thì tắt loa máy hoặc tắt tiếng tab. Cùng user/id chỉ phát một lần, nhiều thông báo trong 3 giây không phát dồn, không phát cho lịch sử. Đăng xuất dừng âm thanh.
- Cửa sổ bị che (vd. đang bình luận ở trình duyệt khác, Windows báo trang `hidden`) vẫn phát tiếng ngay khi socket báo thông báo mới; thẻ chờ tới khi quay lại, cùng key nên không kêu lần hai.
- Tab hiển thị nhưng mất focus vẫn nhận thẻ (và tiếng) kể cả khi đã đăng ký OS push; tab bị ẩn thì để OS push báo.
- Nút "Bật thông báo trên máy này" hiện khi chưa bật, ẩn khi đã bật; không kèm chữ giải thích. Web hỏi cấu hình Web Push của server trước; server chưa có API (404) không làm hỏng luồng khác.

## Đối chiếu yêu cầu

| Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|
| Thẻ thông báo dưới trái khi đang dùng Web | Đạt | Fixture socket local, ảnh desktop/mobile |
| Số chưa đọc trên tab và chuông cùng nguồn | Đạt | Tên tab `(2)` → `(3)`; mở chuông/click thẻ về 0 |
| Không phát lại lịch sử, không trộn tài khoản | Đạt kiểm thử | notification-arrivals.test.ts, notification-worker.test.ts |
| Chống trùng socket/push, click URL an toàn | Đạt kiểm thử | notification-worker.test.ts |
| Thông báo hệ điều hành thật qua nhà cung cấp push | Cần cấu hình môi trường | Worker và API đã có; chưa cấp VAPID/permission để gửi thật |

## Kết quả kiểm tra

- `pnpm turbo run lint typecheck test build --affected --concurrency=1 --output-logs=errors-only`.
- `node tools/check-boundaries.mjs`: không vi phạm.
- Lượt sửa 2026-11-19 tối (tiếng khi cửa sổ bị che, bỏ nút tắt âm/nghe thử, nút Web Push): 43 test phần thông báo pass, `tsc --noEmit` và oxlint Web không lỗi.
- Sau sửa activation/visibility: toàn Web 406 test pass; 44 test riêng phần thông báo pass. `turbo run lint typecheck test build --affected --concurrency=1`: 16/16 tác vụ thành công. api-client: 304 test; i18n: 2 test.
- Lượt âm báo dùng trực tiếp binary đã cài (`apps/web/node_modules/.bin/`): Vitest toàn Web, oxlint phần notifications, `tsc --noEmit`, `next build`; không tải thêm dependency.
- HTTP HEAD bản âm báo tạo thử ban đầu: 200, `audio/wav`. Khi thay bằng file người dùng chọn, đã kiểm tra header WAV và hash khớp nguyên bản, chạy lại 8 test âm báo pass.
- Build production bằng Next.js/Turbopack đã pass (biên dịch, TypeScript và 24 trang prerender). Lượt build trong môi trường hạn chế bị kẹt ở compile; chạy lại với quyền thực thi phù hợp đã thành công.
- 8 test âm báo: chống trùng/cooldown, tắt tiếng/nghe thử, autoplay bị chặn, logout/remount, hủy play đang chờ, lưu lựa chọn và storage bị chặn.
- Đã thay đường tự phát từ HTMLAudio.play() không có bước kích hoạt sang AudioContext được resume ngay trong pointerdown/keydown thật hoặc nút Nghe thử. Tải/giải mã file WAV một lần, tái dùng context và buffer cho thông báo đến bất đồng bộ. Giữ nguyên file người dùng đã chọn.
- Audio bị chặn/lỗi không còn bị bỏ qua im lặng: có trạng thái trong hộp chuông và nút Bật tiếng Tripi cạnh thẻ. Nhãn bật/tắt đổi thành hành động rõ ràng, tránh bấm nhầm nút đang bật thành tắt.
- Regression mới kiểm tra cần activation, resume trước await, thông báo sau đó tự phát, tải file lỗi có thể thử lại, tắt tiếng/logout không phát muộn và cleanup context.
- Đã tách clearNotifications khi đổi tài khoản khỏi reset/dispose khi tháo provider: thao tác đăng nhập có thể kích hoạt audio trước khi nhận user, nên không được đóng context ngay lúc login thành công. Việc xóa trạng thái tài khoản vẫn dừng nguồn phát cũ, xóa dedup/cooldown, giữ buffer âm báo công khai và activation của trình duyệt. Có test giữ activation qua login/đổi tài khoản và đóng context khi teardown.
- Tải WAV qua `loadWebAudioAsset` ở api-client đúng quy tắc repo; chỉ cho phép WAV trong `/audio/` cùng origin, không gửi cookie/token, không theo redirect. Có 7 test cho SDK tải asset, gồm traversal/URL ngoài và HTTP lỗi. Kiểm tra ranh giới module không còn raw fetch trong tính năng Web.
- Đã tái hiện thẻ bị giữ tới lúc click chuông khi tab hiển thị nhưng document chưa có focus. Frontend hiện dùng visibility cho thẻ. Worker chọn tab có focus trước; nếu chưa đăng ký OS push thì dùng tab visible để thẻ tự hiện. Khi đã có subscription OS và cửa sổ mất focus, giữ ưu tiên OS để không nuốt thông báo nền.
- Worker trả ACK shown/duplicate/deferred/ignored cho yêu cầu trình bày; tracker nhả mốc đã xử lý khi nhận deferred để không đánh rơi mục chưa hiện. Có regression visible/no focus, ACK shown không cần chuông, ưu tiên OS và retry đúng chủ tài khoản.
- Trình duyệt thật với dữ liệu giả: nhận thẻ mới, tự đóng, bấm thẻ gọi POST đánh dấu đã đọc, số trên tab/chuông đổi theo hộp thư; kiểm tra 1280×720 và 390×844.
- Fixture chỉ nằm ngoài repo; không dùng tài khoản/mật khẩu thật.

## Cách kiểm lại

1. Chạy Web và backend tương ứng; đăng nhập hai tài khoản thử nghiệm ở hai profile trình duyệt khác nhau.
2. Từ tài khoản thứ hai trả lời bình luận của tài khoản thứ nhất: Web thứ nhất đang focus thì hiện thẻ dưới trái; không hiện lại khi chỉ reload trang.
3. Bấm thẻ: mở đúng nội dung, số chưa đọc giảm. Chỉ đóng thẻ: số chưa đọc giữ nguyên.
4. Mở hộp chuông → Bật thông báo trên máy này → cấp quyền. Backend cần WEB_PUSH_ENABLED và bộ VAPID hợp lệ, migration 12.
5. Chuyển sang ứng dụng/tab khác rồi tạo thông báo mới. Hệ điều hành quyết định vị trí và có thể chặn bởi chế độ Không làm phiền.
6. Mở nhiều tab cùng tài khoản, tạo một thông báo: chỉ một nơi trình bày. Đăng xuất/đổi tài khoản rồi kiểm tra push cũ không hiện.
7. Bấm vào trang Web một lần (trình duyệt cần tương tác để cho phát tiếng), chuyển sang trình duyệt khác và bình luận từ tài khoản thứ hai: nghe tiếng Tripi ngay dù cửa sổ đang bị che.

## Giới hạn vận hành

- Đã sửa ca chuyển tab: trước đây tracker đánh dấu mục mới đã xử lý ngay cả khi tab ở nền, khiến quay lại không hiện thẻ. Hiện giữ mục đó tới khi tab có focus và hoàn tất làm mới inbox, chỉ hiện mục còn chưa đọc trong vòng hai phút; claim của Service Worker vẫn chặn mục đã hiện qua OS. Hai ca regression kiểm tra giữ mục chờ và bỏ mục đã đọc/quá cũ.

- Subscription server được gia hạn mỗi phút theo hạn access token, không trở thành một phiên đăng nhập sống lâu riêng. Nếu tab bị đóng băng quá thời hạn phiên, push dừng cho tới khi Web gia hạn lại; inbox vẫn giữ thông báo.
- Không đảm bảo OS hiện khi người dùng chặn quyền, trình duyệt đã thoát hoàn toàn, thiết bị mất mạng hoặc bật Không làm phiền.
- Push là best effort: TTL 5 phút, cửa sổ quét 10 phút, retry tối đa 5 lần; inbox là nguồn dữ liệu chính.
- Chưa benchmark tải lớn và chưa triển khai production.
- Âm báo của thông báo hệ điều hành do hệ điều hành quản lý. Browser có thể chặn audio trước tương tác đầu tiên: khi đó cạnh thẻ có nút Bật tiếng Tripi. Nhiều tab Tripflix cùng bị ẩn có thể cùng kêu. Không thay cài đặt bảo mật/autoplay của trình duyệt.
- Chưa nghe trực tiếp/kiểm tra nút mới trong Edge: công cụ điều khiển Windows bị dừng vì không xác định được URL chắc chắn. Audio có thể nghe từ file hoặc nút Nghe thử trên local; không coi HTTP 200/test mô phỏng là bằng chứng đã nghe thực tế.

## Đối chiếu backend local khi sửa tên người thả

- Đã xác nhận module Docker cũ không có `display_name`/`actorIds`, trong khi nguồn mới đã có tên và avatar. Sáu test integration reaction hiện có đều pass.
- Đã sao lưu module JS cũ ngoài repo, chép đúng module reaction đã build vào container notification local và khởi động lại; health DB/Redis/realtime OK, module mới đã có tên/actorIds.
- Đã sửa một thông báo cảm xúc local có nội dung cũ dạng số người bằng tên từ `user_directory` và actor gần nhất; giữ nguyên trạng thái đọc và khôi phục `updated_at` trong cùng transaction để không đẩy lại lịch sử qua push mobile. Không thay dữ liệu đăng nhập/tài khoản.
- Phát hiện `user_directory` local có 0 dòng, nên fallback vẫn là “Một người dùng”. Đã bootstrap 72 id/tên hiển thị/timestamp từ `access.users` local vào read model (không lấy email/mật khẩu, không ghi đè mốc mới hơn), rồi sửa lại thông báo thiếu tên. Kiểm tra chỉ trả số lượng, không in tên cá nhân.
- Đây là cập nhật runtime local; source reaction đã có sẵn trên develop, không thêm thay đổi reaction vào nhánh FE. Khi tạo lại container cần build từ source mới, tránh quay về image local cũ.

## Ảnh

Ảnh local ngoài repo, chưa upload GitHub:
- `notification-toast-desktop.jpg`
- `notification-toast-mobile.jpg`

Trong thư mục `C:/Users/ASUS/.codex/visualizations/2026/11/09/01a1be85-2ecb-7092-b037-9b08c5273acb/`.

## Ảnh hưởng tới phần của người khác

- Web (Thành): root Providers và nút chuông; giữ API/props cũ, chỉ chuyển hook realtime lên gốc.
- api-client, i18n: thêm API wrapper/chuỗi mới. Mobile/Admin không đổi luồng hiển thị.
- Backend Web Push nằm ở nhánh `dung/TF46-web-push` (tripflix-be) chưa merge; Web vẫn chạy bình thường khi server chưa có API này.
