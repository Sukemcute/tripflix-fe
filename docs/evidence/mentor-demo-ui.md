# Mentor demo — Mobile, Web OTA và Admin UI

- Ngày: 2026-11-05. Người thực hiện: Trang (có dùng AI).
- Nhánh: `trang/thiet-ke-giao-dien-tripflix`, tiếp nối `trang/mobile-ui` tại `d754604`.
- Chưa có mã TF được cung cấp; không tự tạo mã task.
- Phạm vi chốt: hoàn thiện UI bằng dữ liệu mẫu trước, người dùng merge vào `develop` rồi mới kết nối endpoint của team.
- Người dùng đã yêu cầu commit toàn bộ thay đổi, push nhánh và mở PR vào `develop`.

## Đối chiếu mục tiêu demo

| Phần    | Mục tiêu          | Triển khai UI                                                                                                                                                            |
| ------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mobile  | Bảng tin xu hướng | 3 bài; tab Thịnh hành có thứ tự riêng (Hội An trước Nha Trang); nút trước/sau và vuốt dọc; thích/lưu theo từng chuyến; giữ tab/bài khi đi qua đăng nhập mẫu.             |
| Mobile  | Chi tiết sản phẩm | Giữ lộ trình và khách sạn Nha Trang cũ; bổ sung trang riêng cho Hội An/Đà Nẵng, mở đúng bài, có lịch trình, lưu trú và giá minh họa.                                     |
| Web OTA | Tìm bằng lời      | Form nhập câu tiếng Việt; nhận diện điểm đến, số khách và ngân sách bằng parser cục bộ. Không phải AI/LLM hay tìm bằng giọng nói.                                        |
| Web OTA | Gợi ý             | Gợi ý nhanh, danh mục 4 chuyến, lọc loại chuyến, sắp xếp giá, trạng thái không có kết quả và khôi phục tìm kiếm.                                                         |
| Web OTA | Chi tiết sản phẩm | 4 URL chi tiết riêng, ảnh cục bộ, lịch trình, lưu trú, giá; URL không tồn tại trả 404. Nút chọn chuyến chỉ xác nhận lựa chọn UI, không đặt dịch vụ.                      |
| Admin   | Đăng nhập         | Email hợp lệ + mã công khai `DEMO`; trạng thái lỗi/đang xử lý; cookie HttpOnly ánh xạ phiên trong bộ nhớ server; giới hạn 8 giờ; đăng xuất và giữ đường dẫn đích hợp lệ. |
| Admin   | Setup các tab     | 5 tab: Kiểm duyệt, Số liệu, Lịch trống & giá, Đơn hàng, Nhân sự; active navigation; bảng mẫu, tìm/lọc, mở/đóng chi tiết và empty state.                                  |

## Chạy và review

Tại repo root:

```powershell
pnpm install
pnpm dev
```

- Web OTA: `http://localhost:3100`.
- Admin: `http://localhost:3200/login`.
- Admin mẫu: email `mentor@example.com`, mã `DEMO` (đây là mã công khai hiển thị trên form, không phải mật khẩu tài khoản thật).
- Mở `/orders` hoặc `/staff` khi chưa đăng nhập để xem chuyển về login; đăng nhập xong về đúng tab vừa yêu cầu.
- Phiên Admin mất hiệu lực khi server khởi động lại; không dùng cơ chế này để bảo vệ dữ liệu thật.
- Login mẫu mặc định chỉ bật ở development. Muốn review bản production build local, đặt `ADMIN_ENABLE_DEMO_LOGIN=true` cho tiến trình `next start`; không tự bật trên môi trường triển khai.

Mobile trong terminal riêng:

```powershell
$env:BROWSER = 'none'
pnpm --filter @tripflix/mobile exec expo start --web
```

- Để xem bản web trong Antigravity, dùng `Simple Browser: Show` hoặc panel Browser và mở `http://localhost:8081`. `BROWSER=none` tránh mở trình duyệt ngoài.
- Chạy `pnpm --filter @tripflix/mobile exec expo start --go --lan` để quét QR trong Expo Go. Máy và điện thoại cùng mạng; Expo Go cần phiên bản tương thích SDK 58.
- Trạng thái Mobile giữ trong phiên React context; tải lại trang/khởi động lại app sẽ reset dữ liệu mẫu.

## Kịch bản trình bày

1. Mobile: Bắt đầu khám phá → Thịnh hành → Hội An → Xem chi tiết → Về bảng tin → bài tiếp theo. Thử lưu một bài qua đăng nhập mẫu; bài khác không bị đánh dấu lưu theo.
2. Web: nhập `Hội An 2 người dưới 3 triệu/người` → xem kết quả → chi tiết Hội An → xem lịch trình, lưu trú và giá. Thử `Nha Trang dưới 1 triệu` để thấy empty state; bấm xem tất cả để khôi phục.
3. Admin: vào `/orders` → nhập sai mã để thấy lỗi → email hợp lệ + `DEMO` → chuyển 5 tab → tìm trong danh sách, xem chi tiết → đăng xuất → thử mở lại `/orders`.

## Kết quả kiểm tra

- Kiểm tra lại trước PR ngày 2026-11-05: `pnpm check` qua (lint, typecheck, **37/37 test**); build Web/Admin qua; `tools/verify-mentor-demo.cjs` qua **7/7 nhóm**, **10 ảnh**, không có browser runtime error. Dùng Chromium có sẵn ngoài repo; ảnh và `verification.json` nằm trong thư mục `pre-pr/` dưới đường dẫn evidence bên dưới.
- CI lần đầu phát hiện `next build` và `next typegen` chạy song song, gây TS6053 vì file `.next/types` bị thay thế khi TypeScript đang đọc. Thêm `apps/web/turbo.json` và `apps/admin/turbo.json` để build phụ thuộc typecheck; kiểm tra đồ thị task xác nhận thứ tự này, không sửa workflow chung hay bỏ qua kiểm tra.
- Sau sửa thứ tự task: `pnpm turbo run lint typecheck test build --affected --force` qua **19/19 tác vụ**, không dùng cache.
- `node tools/verify-reel-comments.cjs`: **3/3 nhóm** qua, **3 ảnh**, không có browser runtime error; kiểm tra thích/trả lời/gửi bình luận, bản nháp riêng từng bài, bố cục 320/390/430px, chiều cao thu hẹp và đóng bằng Escape. Evidence tại `reel-comments-pre-pr/` dưới đường dẫn bên dưới; bàn phím và cử chỉ native cần review trên thiết bị.
- `pnpm check`: lint, typecheck và **37/37 unit test** trong 8 file; gồm 5 test mới cho parser/filter/sort, feed ordering, detail lookup và chống redirect ra URL ngoài khi đăng nhập.
- `node tools/verify-mentor-demo.cjs`: **7 nhóm kiểm tra**, **10 ảnh**, 9 tổ hợp route/viewport Web, 3 viewport Admin và 2 viewport chi tiết Mobile; không có browser runtime error.
- `node tools/verify-mobile-review.cjs`: **10 nhóm kiểm tra cũ**, **42 lượt route/viewport** (320/390/430), **22 ảnh**, không tràn ngang document và không có browser runtime error. Gồm luồng đặt chuyến, giữ ngữ cảnh đăng nhập, snapshot đơn, media picker và phục hồi checkout.
- Android export: `pnpm --filter @tripflix/mobile exec expo export --platform android --output-dir dist/mentor-review` qua, 41 assets và Hermes bundle. Đây không phải APK hay kiểm tra trên điện thoại Android.
- `pnpm --filter @tripflix/web --filter @tripflix/admin build`: **cả hai qua**. Các tab Admin được render động theo từng request để kiểm tra cookie, không prerender redirect lúc build.
- Chạy lại `tools/verify-mentor-demo.cjs` với Web/Admin từ production build và Expo web: **7/7 nhóm qua**, **10 ảnh**, không có browser runtime error. Admin được bật cờ preview rõ ràng cho tiến trình local; không đổi cấu hình mặc định của repo.

Ảnh và báo cáo lưu ngoài repo:

`C:/Users/ADMIN/.codex/visualizations/2026/11/04/01a1a6b2-bc84-7e00-b05d-e282325e65d6/mentor-demo/`

- `verification.json`, `01-web-home.png` đến `10-mobile-detail.png`.
- `mobile-regression/verification.json` và 22 ảnh hồi quy Mobile.
- `production/verification.json` và 10 ảnh kiểm tra trên production build Web/Admin.
- Playwright chạy từ runtime có sẵn ngoài repo; không thêm dependency.

## Ranh giới tích hợp và ảnh hưởng

## Cập nhật UI bình luận Reels — 2026-11-05

- Thay nội dung một bình luận trong sheet dùng chung bằng `features/feed/reel-comments.tsx`; không đổi component Sheet của các màn khác.
- Sheet từ dưới lên, cao khoảng 81% viewport (tối đa 720px), giữ lộ phần Reel phía sau; danh sách cuộn riêng và composer ghim ở đáy, có xử lý safe area/keyboard bằng React Native.
- Có tab Nổi bật/Mới nhất, avatar chữ, tên/thời gian, thích, mở/ẩn trả lời, nhãn tác giả đúng Reel, phản ứng nhanh, trả lời đúng người và gửi bình luận mẫu.
- Bình luận, lượt thích, bản nháp và số đếm giữ riêng theo Reel trong phiên component; tải lại app sẽ reset. Không gửi nội dung lên backend. Không cho thao tác vuốt feed đổi Reel trong lúc sheet mở.
- `node tools/verify-reel-comments.cjs`: 3 nhóm kiểm tra qua, 3 ảnh; kiểm tra 320/390/430px và viewport thấp 480px, gửi nội dung trống bị chặn, giữ draft, reply đúng người, không lẫn dữ liệu giữa các Reel, Escape và đóng bằng nút. Không có browser runtime error.
- `pnpm check`: lint/typecheck qua, 37/37 unit test. Android export qua, 41 assets; chưa kiểm tra keyboard/gesture trên Android hoặc iOS thật.
- Ảnh và `verification.json` lưu ngoài repo ở `C:/Users/ADMIN/.codex/visualizations/2026/11/04/01a1a6b2-bc84-7e00-b05d-e282325e65d6/reel-comments/`.

## Ranh giới tích hợp và ảnh hưởng (tiếp)

- `apps/web`, `apps/admin` thuộc Thành; `apps/mobile` thuộc Trang. Người dùng đã yêu cầu hoàn thiện cả ba phần cho demo; giữ các route, tab và chữ ký component cũ.
- UI được chia trong `features/discovery`, `features/auth`, `features/shell`; route chỉ lắp ghép. Token dùng hệ thống hiện có, copy mới trong `packages/i18n/src/demo.ts`.
- Nguồn mock tập trung trong `packages/app-core/src/demo-catalog.ts`; helper `searchDemoTrips` và adapter `apps/admin/src/features/auth/session.ts` là điểm thay thế khi nối API. Không đưa model mock thành API contract.
- Không đổi backend, hợp đồng API, cấu hình CI hay dependency. Các client đã sinh thử trong lúc khảo sát BE đã được gỡ khỏi phạm vi thay đổi.
- Chưa có evidence trên Android/iOS thật. Reels dùng ảnh bìa, chưa phát video hay xếp hạng từ server. Không trình bày dữ liệu fixture, mã DEMO hoặc parser cục bộ như chức năng backend/AI thật.
