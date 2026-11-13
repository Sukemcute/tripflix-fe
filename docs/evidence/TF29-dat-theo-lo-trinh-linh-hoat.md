# TF29 — Đặt theo lộ trình linh hoạt trên mobile

- Nhánh: `thang/TF29-dat-theo-lo-trinh` · Người làm: Thắng (dùng AI: có) · Ngày: 2026-11-13
- Phạm vi và tiêu chí: yêu cầu trực tiếp của người dùng trong phiên; chưa cung cấp link Notion.

## Đã làm

- Cho đặt riêng vé bay hoặc khách sạn; chặng không có tuyến bay hợp lệ được ghi là tự túc. Giữ nguyên hasTripPlan.
- Truy vấn từng chặng bay độc lập bằng useQueries, khách sạn có truy vấn riêng. Lỗi/hết chỗ ở một mục không chặn mục khác.
- Mỗi mục còn giá mặc định được chọn; có checkbox bỏ/chọn, mục hết chỗ bị vô hiệu hóa. Tổng và checkout chỉ gồm mục đang chọn, giữ sourcePostId và chuyển sang /checkout.
- Mở danh sách vé/hạng giá hoặc phòng/rate plan từ cùng báo giá, sắp giá tăng dần. Đổi bộ lọc trả lựa chọn về giá thấp nhất.
- Thêm trẻ em và em bé; người lớn + trẻ em không quá MAX_FLIGHT_SEATS, em bé không quá người lớn. Báo giá phòng chỉ nhận adults vì API không hỗ trợ children.
- Thêm chuỗi tiếng Việt trong mobile.tripPlan. Repo hiện chỉ có locale vi, dùng lại mobile.ts.

## Đối chiếu tiêu chí

| Tiêu chí                                                      | Kết quả                                   | Bằng chứng                             |
| ------------------------------------------------------------- | ----------------------------------------- | -------------------------------------- |
| Vé riêng, phòng riêng, chặng tự túc, giới hạn số mục          | Đã có logic và test                       | trip-plan.test.ts                      |
| Danh sách giá, tổng mục được chọn, số khách                   | Đã có logic và test                       | trip-plan.test.ts                      |
| Trẻ em/em bé chỉ gửi checkout khi có vé                       | Đã có test                                | trip-plan.test.ts                      |
| Lỗi báo giá riêng, chọn vé/phòng, bộ lọc, điều hướng checkout | Đã triển khai; cần kiểm tra trên thiết bị | trip-plan-sheet.tsx                    |
| Ảnh giao diện Android                                         | Chưa có                                   | Không có adb trong PATH của môi trường |

## Kết quả kiểm tra

- `pnpm --filter @tripflix/app-core test`: 10 file, 97 test pass. Chạy qua pnpm.cmd với npm_config_manage_package_manager_versions=false để vượt lỗi khóa kho công cụ; pnpm tự thử kiểm tra/cài phụ thuộc trước script nhưng bị sandbox từ chối. Không chạy pnpm install, không thay lockfile.
- Chạy lại trực tiếp `packages/app-core/node_modules/.bin/vitest.cmd run`: 10 file, 97 test pass.
- `pnpm --filter @tripflix/mobile typecheck` và `pnpm --filter @tripflix/mobile lint`: launcher bị lỗi truy cập kho công cụ ngoài workspace (ERR_PNPM_STORE_DIR_OPEN_OPERATION_LOCK).
- Lệnh tương đương bằng công cụ đã cài: `node node_modules/typescript/bin/tsc --noEmit -p apps/mobile/tsconfig.json`: pass.
- `node node_modules/typescript/bin/tsc --noEmit -p packages/app-core/tsconfig.json`: pass.
- `node_modules/.pnpm/node_modules/.bin/oxlint.cmd -c .oxlintrc.json apps/mobile/src`: exit 0, chỉ có 6 cảnh báo ở reels-launch.tsx, use-player-pool.ts, reel-slide.tsx, reels-screen.tsx; không có cảnh báo trong file thay đổi.
- Prettier kiểm tra 4 file mã nguồn: pass. `git diff --check`: pass.
- Codex CLI được giao rà soát chỉ đọc API/caller nhưng không trả kết quả; agent chính tự thực hiện rà soát và toàn bộ code/test.

## Cách kiểm lại trên Android

1. Mở lộ trình có cả vé/phòng, chỉ vé, chỉ phòng và chặng xe/tàu hoặc thiếu mã sân bay; kiểm tra dòng tự túc.
2. Mở dòng vé/phòng, đổi lựa chọn; bỏ chọn từng mục rồi tất cả, kiểm tra tổng và nút đặt.
3. Cho một chặng hết chỗ hoặc lỗi mạng; kiểm tra các mục còn lại vẫn đặt được.
4. Đổi ngày, sân bay, khách sạn, số khách; kiểm tra lựa chọn trở về rẻ nhất. Tăng trẻ em tới giới hạn ghế, tăng em bé tới số người lớn rồi giảm người lớn.
5. Đặt riêng vé hoặc phòng và cả hai; kiểm tra sourcePostId, các mục và số khách trong checkout, điều hướng /checkout.

## Ảnh / video

- Chưa có; cần chụp trên Android khi kiểm tra thủ công.

## Ảnh hưởng tới phần của người khác

- apps/mobile thuộc Trang; lịch sử sửa gần nhất của các file mục tiêu ghi Quốc Bảo. Đã thông báo phạm vi trong phiên, thực hiện theo yêu cầu cụ thể của người dùng.
- Không sửa web/admin/backend, không thêm thư viện, không commit/push/PR/ghi Notion.

## Cập nhật — Tách xem lộ trình và tab Đặt (2026-11-13)

Phần trên ghi nhận công việc trước khi tách màn. Luồng hiện tại thay thế phần đặt trong sheet bằng tab Đặt theo yêu cầu mới.

### Thay đổi

- `TripPlanSheet` chỉ xem timeline: thẻ vé/chỗ ở được làm nổi bật, chặng tự túc và hoạt động cộng đồng giữ nguyên. Không còn gọi báo giá hay chọn dịch vụ trong sheet. Nút `Đặt lộ trình này` lưu bài nguồn, đóng sheet và navigate tới `/(tabs)/book`; luôn giữ nút nhờ Tripi.
- Thêm `app/(tabs)/book.tsx`, `features/booking/trip-booking-screen.tsx`, `trip-booking-store.ts`, `trip-plan-parts.tsx`. Chuyển nguyên bộ chọn và logic từng chặng/phòng sang màn đặt; tóm tắt ngày/khách mở bằng nút Đổi, footer tổng tiền cố định, login quay về tab Đặt.
- Lộ trình nổi bật dùng `useReelsFeed`, lọc bài có dịch vụ đặt được, bỏ trùng và bài đang chọn; có poster, thông tin ngày/điểm đến, icon chặng bay/chỗ ở, tải thêm và trạng thái trống/lỗi. Chọn bài mới dựng lại màn và vị trí cuộn từ đầu.
- Store dùng useSyncExternalStore và cách lưu của cart-store (localStorage/SecureStore). Khôi phục không ghi đè lựa chọn mới; các lần ghi được xếp thứ tự. Thêm parser thuần `trip-plan-selection.ts`, export ở app-core và test dữ liệu lưu hỏng/không hợp lệ.
- Tab trips đổi thành book, nhãn Đặt và icon túi. Xoá route `app/(tabs)/trips.tsx`, thêm `app/my-trips.tsx`, đăng ký Stack và bật header quay lại của CommerceTripsScreen. Cập nhật toàn bộ link cũ trong account, booking, payment, vnpay và login returnTo sang `/my-trips`.
- Cập nhật i18n, bỏ chuỗi cũ không còn dùng sau khi tách sheet. Giữ nguyên thay đổi app-core/test đã có trước phiên.

### Kiểm tra cập nhật

- Ba lệnh `pnpm --filter @tripflix/app-core test`, `pnpm --filter @tripflix/mobile typecheck`, `pnpm --filter @tripflix/mobile lint`: PowerShell chặn pnpm.ps1; thử pnpm.cmd thì lỗi ERR_PNPM_STORE_DIR_OPEN_OPERATION_LOCK (Access denied). Không chạy install.
- Lệnh tương đương `packages/app-core/node_modules/.bin/vitest.cmd run` (cwd packages/app-core): **11 file, 113 test pass** (thêm 16 trường hợp kiểm tra khôi phục store).
- `node node_modules/typescript/bin/tsc --noEmit -p apps/mobile/tsconfig.json`: **pass**.
- `apps/mobile/node_modules/.bin/oxlint.cmd -c ../../.oxlintrc.json src` (cwd apps/mobile): **exit 0**, 6 cảnh báo đã có ở feed/reels; không có cảnh báo trong file mới/sửa của task.
- Prettier chạy bằng `node node_modules/prettier/bin/prettier.cjs --check` trên toàn bộ file thay đổi; kết quả được báo trong phiên.
- `git diff --check`: **pass**. Tìm `/(tabs)/trips`, `mobile.tabs.trips` và tab name trips trong apps/mobile/src: không còn kết quả.
- Codex CLI được giao phần route/tab nhưng không trả kết quả, không sửa file sau hơn 5 phút; đã dừng tiến trình và agent chính tự triển khai, review toàn bộ phần đó.
- ADB có sẵn tại Android SDK; `adb devices` trả danh sách trống. **Chưa chạy app và chưa có ảnh Android**, cần kiểm tra trên thiết bị kết nối.

### Kiểm lại luồng mới trên Android

1. Từ Reels mở Xem lộ trình: chỉ có lịch từng ngày, nhãn tự túc, thẻ Tripflix đặt được; không giá/bộ chọn. Với lộ trình không có dịch vụ bán được chỉ còn nút nhờ Tripi.
2. Bấm Đặt lộ trình này: sheet đóng, tab Đặt hiện đúng tiêu đề/tác giả/lộ trình. Đổi ngày/nhóm khách, điểm bay, chỗ ở; kiểm tra reset lựa chọn và giá.
3. Chọn/bỏ từng dịch vụ, mở các giá vé/phòng; kiểm tra tổng, hết chỗ/lỗi từng mục và không đặt khi đang tra giá. Kiểm tra giới hạn trẻ em/em bé và checkout đúng mục đã chọn.
4. Khi chưa đăng nhập, Đặt ngay tới login với returnTo tab Đặt. Đăng nhập xong tiếp tục đặt và tới checkout.
5. Chọn bài nổi bật khác: màn cuộn về đầu và bỏ bộ lọc/giá của bài cũ. Xoá lựa chọn, kiểm tra gợi ý khi danh sách đang tải/trống. Đóng/mở app kiểm tra khôi phục bài đã chọn.
6. Từ Tôi → Chuyến đi của tôi, sau thanh toán/huỷ/VNPay: mở `/my-trips`, có nút quay lại; thanh tab có Đặt thay Chuyến đi.

Không sửa apps/web, apps/admin, backend; không commit/push/PR/Notion.

## Cập nhật — Chọn vé và phòng bằng màn chi tiết (2026-11-13)

- Thẻ vé/phòng ở tab Đặt mở màn có sẵn với tham số pick=trip, pickId, pickKey và mã giá hiện tại; bỏ danh sách chip giá nội tuyến, giữ checkbox và bộ đổi sân bay/khách sạn. Thêm chevron và nhãn Xem chi tiết & đổi, rút gọn mô tả.
- Màn vé giữ tuyến/ngày/nhóm khách cố định; chọn cabin/gói giá, xem hành lý và hoàn vé, đánh dấu giá hiện tại. Nút Chọn chuyến này lưu store rồi quay lại, không đăng nhập/checkout.
- Màn phòng cố định kỳ ở/khách, ẩn CartLink và SelectionBar. RoomCard/RateRow dùng props tùy chọn onPick và pickedRatePlanCode để thay bộ đếm bằng Chọn/Đang chọn. Giữ luồng đặt riêng khi không có pick=trip.
- Store giữ picks trong bộ nhớ theo selectionKey. Hàm thuần resolveTripPlanOffer trong app-core dùng giá mới của mã còn bán, bỏ key cũ hoặc mã hết bán, về giá rẻ nhất; thêm 5 test. Chuỗi mới nằm trong i18n/mobile.ts.
- Kiểm tra: app-core node_modules/.bin/vitest.cmd run: 12 file, 118 test pass. Mobile ../../node_modules/.bin/tsc.cmd --noEmit: pass. Mobile node_modules/.bin/oxlint.cmd -c ../../.oxlintrc.json src: exit 0, 6 cảnh báo cũ ở feed/reels. Prettier --check và quét BOM được chạy trên các file thay đổi.
- Codex CLI được giao hai file hotel-rooms-screen.tsx/hotel-parts.tsx nhưng không trả kết quả hay sửa file sau khoảng 5 phút; đã dừng đúng tiến trình con. Agent chính tự triển khai, review và kiểm tra toàn bộ.
- adb devices: danh sách trống. Chưa chạy app/chụp ảnh Android; còn kiểm thử thủ công trên thiết bị.
- Kiểm lại: từ tab Đặt mở từng chặng, chọn cabin/giá rồi quay lại; mở phòng chọn gói khác; kiểm tra mô tả/tổng tiền. Đổi bộ lọc phải về giá rẻ nhất. Thử chưa đăng nhập vẫn chọn được; nút Đặt ngay giữ luồng login/checkout. Mở flights/hotel-rooms bình thường phải giữ luồng checkout/giỏ hàng cũ.
- Tiếp nối toàn bộ thay đổi chưa commit; không sửa web/admin/backend, không install/commit/push/PR/Notion.

## Cập nhật — Hero lộ trình và chọn khách sạn (2026-11-13)

- Thay phần đầu tab Đặt bằng hero gọn: ảnh bìa hoặc biểu tượng bản đồ nền xanh, tiêu đề hai dòng, điểm đến/số ngày đêm, tác giả và nút Đổi lộ trình. Tiêu đề màn hình là Đặt lộ trình; giảm khoảng cách và padding của phần tổng quan trước ngày đầu.
- TripPlanSelection có coverUrl tùy chọn, parser vẫn đọc dữ liệu cũ và từ chối ảnh sai kiểu. Truyền poster w540 (dự phòng w360/w720) từ reel qua sheet; thẻ nổi bật cũng lưu poster.
- Đổi chỗ ở mở /search với pick=trip, pickId=hotelProperty, pickKey gắn bài đang đặt, điểm đến hoặc thành phố khách sạn hiện tại và kỳ ở/số người lớn từ lộ trình. Dùng lại HotelSearchResults, hiện thẻ dọc có ảnh, sao, đánh giá, giá và Chọn khách sạn này; hỗ trợ tải trang tiếp, đang tải, lỗi/thử lại và danh sách trống. Tìm theo tên cũng lấy báo giá thật trước khi cho chọn.
- Chọn khách sạn lưu store rồi quay lại; không mở chi tiết hay thêm giỏ hàng. applyTripPlanChoices nhận khách sạn mới và bỏ giá đã chọn để tra phòng rẻ nhất. Bỏ HotelChooser nội tuyến. Tìm kiếm khách sạn thông thường vẫn mở chi tiết như trước.
- Kiểm tra cuối: app-core `node_modules/.bin/vitest.cmd run` 12 file, 125 test pass; mobile `../../node_modules/.bin/tsc.cmd --noEmit` pass; mobile `node_modules/.bin/oxlint.cmd -c ../../.oxlintrc.json src` exit 0, còn 6 cảnh báo cũ ở feed/reels. Prettier --check cho các file sửa trong lượt này, git diff --check và kiểm tra UTF-8 không BOM.
- Đã giao Codex CLI phần cơ học coverUrl/parser/props. CLI bị chặn kết nối mạng (socket permission 10013), không sửa file; đã dừng tiến trình. Agent chính tự triển khai, review và chạy kiểm tra toàn bộ.
- `adb devices`: không có thiết bị kết nối. Chưa chạy/chụp ảnh Android; còn xác minh trực quan ở 360–430px và kiểm thử điều hướng trên thiết bị.
- Kiểm lại thủ công: chọn lộ trình từ Reels và từ thẻ nổi bật, đóng/mở app kiểm tra ảnh lưu và dữ liệu cũ không ảnh; nhấn Đổi lộ trình; chọn khách sạn theo điểm đến và tên, quay lại không chọn, đổi khách sạn nhiều lần và đổi ngày/khách; kiểm tra phòng rẻ nhất/tổng tiền. Mở /search không có pick phải giữ luồng xem chi tiết bình thường.
- Tiếp nối thay đổi chưa commit; không sửa web/admin/backend, không install/commit/push/PR/Notion. Mobile thuộc Trang; phạm vi đã được người dùng cho phép trực tiếp.
