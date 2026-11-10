# TF29 — Tìm và đặt chuyến bay trên web và mobile

Ngày thực hiện 2026-11-06. Nhánh làm việc hiện tại là trang/TF10-hoa-tiet-trang-chu, đã fast-forward tới develop 6eebd33. Các thay đổi đang nằm trong working tree cùng phần giao diện có sẵn của người dùng.

## Phạm vi hoàn thành

- Trang /flights trên web và mobile dùng API TF29 từ tripflix-be develop 96e34f2, đã chứa PR #71.
- Sinh lại API client bằng pnpm gen:api. Kết quả khớp client đã được merge trên develop.
- Dựng lựa chọn sân bay từ GET /api/flights/routes, gộp bản ghi trùng cặp fromAirport–toAirport và giữ các tên điểm đến.
- Tìm theo from, to, date, passengers. Gom các hạng ghế theo flightKey, giữ thứ tự backend.
- Chọn hạng ghế và gói giá, hiển thị giá VND, số ghế và điều kiện hoàn vé.
- Giữ chỗ bằng createCheckoutOperation, gửi adults cùng productId, checkIn, ratePlanCode. Request vé máy bay bỏ checkOut và qty.
- Giữ lựa chọn hạng ghế và gói qua đăng nhập, chuyển sang checkout hiện có với form họ tên và ngày sinh từng hành khách.
- Hiển thị SOLD_OUT, STOP_SELL, NOT_ON_SALE và vô hiệu hoá nút đặt.
- Thông báo tải, lỗi kèm thử lại và kết quả rỗng. Chuỗi hiển thị nằm trong packages/i18n.
- Mobile thêm đường vào Vé máy bay từ màn khám phá/tìm kiếm và hiển thị ngày bay trong tóm tắt đơn, kết quả thanh toán.

## Kết quả kiểm tra

- pnpm turbo run lint typecheck test --affected hoàn tất 20/20 tác vụ.
- Các suite gồm api-client 77 test, app-core 34 test, i18n 2 test và tokens 1 test. Tổng 114 test qua, gồm 8 test mới cho gộp tuyến, gom hạng ghế, xác thực form và payload checkout.
- node tools/check-boundaries.mjs qua.
- git diff --check qua.
- Playwright kiểm tra Next web 1440 px và Expo Web 390 px, dùng Chromium headless.
- HAN → CXR xuất hiện đúng một lựa chọn dù backend trả hai tên Khánh Hòa và Nha Trang.
- HAN → DAD lấy dữ liệu API thật, chọn hạng Phổ thông đặc biệt và FLEX, giữ lựa chọn qua đăng nhập, gửi đúng payload, nhận đơn giữ chỗ thật và hiển thị form hai hành khách. Đã huỷ các đơn kiểm thử thành công để trả ghế.
- Ngày ngoài lịch bán hiển thị chưa mở bán và chặn đặt.
- Lỗi tải rồi thử lại, kết quả rỗng và ba trạng thái không thể đặt được kiểm tra bằng response fixture trên cả hai giao diện.
- SGN → CXR được kiểm tra với dữ liệu đọc từ API thật.

## Môi trường và giới hạn kiểm chứng

- Gateway local http://localhost:8080 vẫn phục vụ core-api cũ, trả 404 cho flights. Kiểm thử đã chạy bản build backend hiện tại trong container tạm tại 127.0.0.1:3010 và chuyển tiếp request chuyến bay của trình duyệt tới đó.
- Với Expo Web tại cổng 8084, proxy kiểm thử cũng chuyển tiếp auth qua origin web đang được backend cho phép. Cấu hình CORS và URL môi trường thật cần khớp môi trường chạy.
- Backend source và OpenAPI có working tree sạch sau cập nhật develop.
- Chưa kiểm thử Android/iOS native. adb không thấy thiết bị Android kết nối. Mobile được kiểm tra bằng Expo Web.
- Trường ngày mobile dùng Field hiện có, định dạng YYYY-MM-DD. Chọn sân bay và số khách dùng Sheet hiện có của ứng dụng.

## Ảnh và log local

- C:/Users/ADMIN/AppData/Local/Temp/tripflix-TF29-flights/web.png
- C:/Users/ADMIN/AppData/Local/Temp/tripflix-TF29-flights/mobile.png
- C:/Users/ADMIN/AppData/Local/Temp/tripflix-TF29-fe-final.log

## Cách kiểm lại

1. Chạy backend có TF29 và cấu hình URL API cho web/mobile.
2. Chạy pnpm --filter @tripflix/web dev hoặc pnpm --filter @tripflix/mobile start.
3. Mở /flights hoặc mở Vé máy bay từ màn khám phá trên mobile.
4. Chọn HAN → DAD hoặc SGN → CXR, ngày trong lịch mở bán, hai hành khách.
5. Chọn hạng ghế, FLEX, đăng nhập, bấm Chọn chuyến. Kiểm tra trang thanh toán và hai form hành khách.
6. Thử ngày ngoài lịch mở bán để kiểm tra lý do và nút bị vô hiệu hoá.

## Các phần liên quan

Web thuộc Thành. Mobile thuộc Trang. Logic tra cứu và dựng request dùng chung nằm trong packages/api-client. Các chỉnh sửa giao diện khác đã có trong working tree được giữ lại.

## Kiểm tra runtime local sau phản hồi không tải được sân bay

- Ngày 2026-11-06 đã rebuild và khởi động lại core-api local từ develop.
- Gateway thật http://localhost:8080/api/flights/routes trả 200 với 135 bản ghi tuyến.
- Playwright gọi trực tiếp gateway 8080, chọn SGN → CXR, ngày 2026-11-07, hai hành khách. API trả 7 hạng ghế và giao diện hiển thị 3 chuyến.
- Ảnh kiểm chứng tại C:/Users/ADMIN/AppData/Local/Temp/tripflix-flights-live-gateway.png.
- Lần chạy migration chung gặp lỗi bảng commerce.reviews đã tồn tại. Đã khởi động API với schema hiện có. Cần đối chiếu migration ledger của commerce trước lần migrate chung tiếp theo.
- Cấu hình khởi động local được đặt trong file tạm C:/Users/ADMIN/AppData/Local/Temp/tripflix-flights-runtime.override.yaml. Source backend có working tree sạch.
