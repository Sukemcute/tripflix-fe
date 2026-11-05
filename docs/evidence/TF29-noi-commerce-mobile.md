# TF29 — Nối commerce thật trên mobile

- Nhánh: `trang/TF29-noi-commerce-api`, từ `origin/develop` tại `96f1c97`.
- Người làm: Trang, có dùng AI. Ngày: 2026-11-05.
- Phạm vi: yêu cầu trong chat và tài liệu `Commerce — Database và API cho Frontend.md`; liên quan TF10, TF29, TF30, TF37. Bổ sung kiểm tra hiển thị gợi ý địa điểm Web theo yêu cầu tiếp theo của người dùng.
- Chưa được cung cấp link Notion. Người dùng đã yêu cầu commit, push và merge vào nhánh tích hợp; đưa qua PR vào `develop` theo quy trình repo.

## Đã làm

- Chạy `pnpm gen:api` từ hợp đồng backend local; sinh thêm endpoint danh sách checkout và các DTO của TF37.
- Route `hotel/[id]` nhận mã khách sạn, ngày nhận/trả phòng và số khách; trang tìm kiếm mobile mở được khách sạn từ kết quả API.
- Giá, số phòng cần đặt, số phòng thực còn lại và lý do không đặt được lấy từ API. Không tạo thông báo khan hiếm giả.
- Giỏ dùng productId/ratePlanCode/qty của offer đã chọn; tạo checkout sau khi đăng nhập, rồi nhập liên hệ/hành khách và lưu qua PUT guests.
- Thanh toán thẻ lấy danh sách thẻ và token từ mock gateway. UUID và paymentToken được giữ cho retry cùng thao tác; thao tác đổi thẻ, đổi tổng tiền hoặc trả lại sau OTP thất bại dùng key mới. Các thao tác sống trong phiên app và được tách theo tài khoản.
- Xử lý paid, requires_action/OTP và 202 pending. Khi pending, khoá thanh toán và polling GET checkout mỗi 3 giây lúc màn hình có focus. Mất phản hồi cho phép thử lại chính request cũ sau khi kiểm tra trạng thái.
- Đếm ngược bằng `holdCountdown(holdExpiresAt)` của app-core; hiển thị mã xác nhận và tổng tiền từ đơn thật.
- VNPay mở paymentUrl trong trình duyệt, có nút mở lại và tạo lần thanh toán mới cho lần bỏ ngang. Route `/payments/vnpay/return` chuyển các tham số `vnp_*` về backend; chỉ hiển thị thành công khi `isSuccess === true` và đơn đã paid.
- Tab Chuyến đi có chuyến đã đặt, bài đã lưu, bài đã đăng; có phân trang, kéo để tải lại, refetch khi focus/quay lại app. Danh sách dùng FlatList; mở một chuyến gọi GET checkout theo ID.
- Web: tách `name` và `subtitle` thành hai dòng. Tên truy cập của nút là tên địa điểm, dòng phụ là mô tả. Chọn Hội An vẫn gửi riêng `placeId=hoi-an`.
- Bổ sung theo phản hồi người dùng: màn thanh toán thành công có dấu xác nhận, mã đặt chỗ, số tiền đã thanh toán, loại phòng/ngày ở và nút xem chuyến đi/chi tiết/tiếp tục khám phá. Dùng chung cho thanh toán thẻ và VNPay. Route VNPay gọi API kiểm tra chữ ký/kết quả rồi đọc trạng thái đơn; chỉ hiện màn thành công khi isSuccess=true và đơn paid. Phiên hết hạn cho đăng nhập rồi quay lại đúng kết quả; thiếu tham số, lỗi mạng và đang xử lý có trạng thái riêng.

## Đối chiếu yêu cầu

| Yêu cầu | Kết quả | Bằng chứng |
|---|---|---|
| Khách sạn có bộ lọc và tồn kho thật | Đạt với API local | Unit test bộ lọc/remaining; E2E hotel |
| Giữ chỗ → thông tin khách → token → pay/3DS | Đạt với API local | E2E giữ chỗ, nhập sai OTP, trả lại và OTP đúng; xác nhận status paid từ server |
| Retry giữ đúng UUID/body/token | Đạt | Unit test; E2E ngắt request pay rồi retry cùng body và key |
| Không trả lại khi nhận 202 | Đạt với response 202 được tiêm trong test | E2E khoá nút và polling tới paid, chỉ một request pay |
| VNPay không suy thành công từ chữ ký hoặc quay về browser | Đạt cả sandbox đầu cuối trên Expo web | NCB + OTP thật trên sandbox → callback ký đúng/isSuccess=true → đơn paid; replay callback giữ nguyên mã xác nhận; route kết quả app và TF37 hiển thị đúng. Test isSuccess=false không báo thành công |
| Chuyến đặt ngoài app xuất hiện khi mở lại tab | Đạt với API TF37 thật sau khi khởi động lại backend | E2E tạo đơn ngoài app, quay lại tab và thấy đơn mới; không còn fixture danh sách |
| Ba mục trips và mở chi tiết | Đạt với API local thật | E2E gọi danh sách, bookmarks, posts và chi tiết; phân trang cursor trả đơn kế tiếp không trùng |
| Hội An và Đà Nẵng không bị trình bày như tên ghép | Đạt | Web E2E 390px và 1280px; request tìm kiếm gửi placeId=hoi-an |

## Kết quả kiểm tra

- `pnpm gen:api`: pass.
- `pnpm turbo run lint typecheck test --affected`: pass, 20 tác vụ; 64 unit test (api-client 30, app-core 31, i18n 2, tokens 1). Có 11 test commerce mới. Lint phần thay đổi không có cảnh báo.
- Trước khi push: đã ghép `origin/develop` mới nhất (`7d0e5b1`) trong checkout riêng và chạy `pnpm turbo run lint typecheck test build --affected`: 22 tác vụ pass, 73 unit test (api-client 36, app-core 34, i18n 2, tokens 1), build Web/Admin pass; kiểm tra ranh giới module pass. Chỉ đưa commerce và sửa nhãn địa điểm vào PR; các thay đổi thiết kế OTA/ảnh thương hiệu đang làm trong workspace chính được giữ ngoài commit.
- `node tools/check-boundaries.mjs`: pass.
- `git diff --check`: pass.
- `node tests/e2e/commerce/checkout.cjs`: lần kiểm lại có 8 kiểm tra pass, không có pageerror. Dùng Chromium 390×844, API/Postgres/Redis local và tài khoản test riêng. GET danh sách TF37, phân trang và đồng bộ đơn ngoài app đều dùng API thật; test dừng nếu endpoint không trả 200. Chỉ lỗi mạng, response 202 và response VNPay âm được tiêm để kiểm tra xử lý giao diện.
- `node tests/e2e/discovery/suggestions.cjs`: 2 kiểm tra Web pass, 390px/1280px; dùng API gợi ý/tìm kiếm thật.
- `node tests/e2e/commerce/vnpay-sandbox.cjs`: lần kiểm cuối có 4 kiểm tra pass, không có pageerror. Đi qua app và cổng `sandbox.vnpayment.vn` thật, thẻ NCB test + OTP; VNPay tự quay về frontend cổng 8081, frontend gọi API cổng 8080 kiểm chữ ký/isSuccess và đọc đơn, sau đó tự hiển thị màn thành công. Đơn paid với mã `TF-FUFRBG`, replay giữ nguyên mã; danh sách TF37 chứa đúng chuyến. Không điều hướng thủ công sang màn thành công, không callback giả hoặc relay.
- Sau khi thêm màn kết quả: `node tests/e2e/commerce/payment-return.cjs`: 6 kiểm tra pass với tài khoản/đơn thật, trạng thái phản hồi gateway được tiêm cho kiểm thử UI. Kiểm tra loading, callback âm dù đơn paid, API 503, callback dương nhưng đơn paying, mã thật/nút Chuyến đi, đăng nhập lại giữ route và thiếu tham số.
- Chạy lại `checkout.cjs` sau khi đổi màn thành công: 8 kiểm tra pass, kết quả ở `%TEMP%/tripflix-commerce-success-screen/`. `pnpm turbo run lint typecheck test --affected`: 20 tác vụ pass, lint 0 cảnh báo/0 lỗi ở mobile.
- `pnpm exec expo export --platform android --output-dir <thư-mục-tạm>`: pass. Đây là kiểm tra bundle Android, chưa phải kiểm thử trên thiết bị.

## Các điểm cần phối hợp / giới hạn

1. Đã xử lý vướng 404 của TF37: tiến trình Node cũ nạp code trước khi TF37 được cập nhật. Đã chạy `pnpm --filter @tripflix/core-api build` và khởi động lại backend local ở cổng 8080. GET danh sách nay hoạt động, test đồng bộ và cursor đều pass. Đã bỏ hoàn toàn nhánh fixture danh sách khỏi script E2E; không đổi source backend.
2. Hợp đồng hiện tại trùng schema `StayDto` giữa hotel detail và search; thiếu kiểu test-cards và query cursor/VNPay. `packages/api-client/src/commerce.ts` kiểm tra response và bọc URL sinh tự động cho những chỗ này. Không sửa backend hay sửa tay client sinh ra.
3. Đã chuẩn bị Android platform-tools riêng ngoài repo; ADB không có thiết bị Android. Thiết bị người dùng kết nối là iPhone; sau đó người dùng cho biết điện thoại không vào được mạng và yêu cầu chuyển sang mô phỏng Expo web. EAS Simulator chưa được bật cho tài khoản nhóm. Đã kiểm tra riêng `http://localhost:8081/hotel/P-h-dn-01?...` ở 390×844 với touch/mobile emulation: khách sạn và các gói phòng tải từ API, không có pageerror. Chưa công nhận browser/deep link, SecureStore hay thao tác native trên điện thoại là pass.
4. Người dùng đã đổi `VNPAY_RETURN_URL` về frontend `http://192.168.2.147:8081/payments/vnpay/return` và backend đã được khởi động lại. Test sandbox đã xác nhận browser tự hiện màn kết quả, frontend chuyển tham số về API cổng 8080 xác minh và chỉ hiện thành công khi isSuccess=true cùng trạng thái paid. Không còn JSON kỹ thuật ở cuối luồng người dùng. Tự mở app native bằng deep link còn cần redirect/app-link phía triển khai; chưa kiểm thử trên điện thoại.
5. Preview mobile đang gọi backend qua địa chỉ LAN. Test phải mở preview cùng hostname LAN để cookie web SameSite hoạt động; mở `localhost` trong khi backend là IP LAN làm mất phiên sau reload. Native dùng SecureStore theo cấu hình sẵn có.
6. Các đơn thanh toán test nằm trong database local, dưới tài khoản email `commerce-…@example.test`. Không chạy test ghi dữ liệu lên staging/production; script giới hạn hostname thuộc máy hiện tại.

## Cách kiểm lại

1. Đặt các repo FE/BE/AI cạnh nhau, chạy backend và Expo preview từ nhánh này. Cần TF37 trong cả hợp đồng và runtime.
2. Chạy `pnpm gen:api`, rồi các lệnh kiểm tra ở trên.
3. Với Playwright đã cài ngoài repo, thiết lập `PLAYWRIGHT_PACKAGE`, `PLAYWRIGHT_CHROMIUM_PATH` nếu cần, `MOBILE_PREVIEW_URL` cùng hostname với API mà preview dùng, và `API_PREVIEW_URL` trỏ backend local.
4. Chạy `node tests/e2e/commerce/checkout.cjs`. Script yêu cầu GET danh sách TF37 trả 200; không có fallback fixture. Có thể đặt `COMMERCE_EVIDENCE_DIR` để tách từng lần chạy.
5. Chạy web local và `node tests/e2e/discovery/suggestions.cjs`; `WEB_PREVIEW_URL` mặc định là `http://localhost:3100`.
6. Với merchant sandbox đã cấu hình trong backend local, chạy `node tests/e2e/commerce/vnpay-sandbox.cjs`. Script kiểm gateway phải là sandbox và return URL phải trỏ route `/payments/vnpay/return` trên đúng origin của mobile preview; không ghi khóa merchant hoặc URL thanh toán đã ký vào output. Chỉ dùng thẻ NCB kiểm thử. Để kiểm các trạng thái lỗi và phiên hết hạn, chạy thêm `node tests/e2e/commerce/payment-return.cjs`.
7. Trên Android/Expo Go, tìm khách sạn → chọn gói phòng → giữ chỗ → nhập khách → thẻ/OTP hoặc VNPay. Đặt thêm trên Web rồi mở lại tab Chuyến đi và kéo xuống để kiểm tra.

## Ảnh / kết quả

Không commit ảnh. Kết quả kiểm lại dùng backend TF37 thật nằm trong `%TEMP%/tripflix-commerce-real/`:

- `results.json`: 8 kiểm tra commerce pass, `errors: []`, `notes: []`.
- `01-hotel.png`, `02-otp.png`, `03-paid.png`, `04-trips-refreshed.png`, `05-vnpay-not-success.png`.
- `07-localhost-mobile.png`: kiểm tra trang khách sạn trên localhost:8081, mobile/touch emulation 390×844.
- Ảnh Web `06-web-place-390.png`, `06-web-place-1280.png` nằm trong `%TEMP%/tripflix-commerce/`.
- VNPay sandbox trực tiếp: `%TEMP%/tripflix-vnpay-direct/results.json` và các ảnh `01-gateway.png`, `02-ncb-otp.png`, `03-direct-callback.png`, `04-app-paid.png`, `05-trip.png`. Kết quả cuối: 4 kiểm tra pass, `errors: []`, `usedRelay: false`.
- Màn kết quả mới: `%TEMP%/tripflix-payment-return/01-success-mobile.png`, `results.json` (6 kiểm tra pass).
- Luồng VNPay tự về màn thành công: `%TEMP%/tripflix-vnpay-auto-success/results.json` (4 kiểm tra pass, `errors: []`, `usedRelay: false`), `03-automatic-success.png`, `04-app-paid.png`, `05-trip.png`.

## Ảnh hưởng tới phần của người khác

- Mobile thuộc Trang. Thay route sang màn API thật; giữ các màn demo hiện có.
- api-client/i18n: bổ sung adapter, kiểu và chuỗi; auth/shared HTTP không đổi chữ ký hay hành vi.
- Web thuộc Thành: chỉ sửa hiển thị gợi ý ở `live-search-screen.tsx`, theo yêu cầu kiểm tra của người dùng. Giữ nguyên `choosePlace(place)` và logic `place.refId` của discovery do Duy cung cấp.
- Không đổi source backend, database schema, cấu hình chung, lockfile hay thêm thư viện.
