# TF10 — Ảnh khách sạn trong kết quả OTA

- Task do người dùng giao trong phiên làm việc, chưa có URL Notion.
- Nhánh `trang/TF10-anh-khach-san-ota`, người làm Trang (dùng AI), ngày 2026-11-05.

## Đã làm

- Hiển thị `thumbnail` từ `/api/stays` trên thẻ khách sạn. Chấp nhận URL HTTP/HTTPS và ẩn ảnh khi tải lỗi.
- Dùng URL do API trả về, không ghi cố định domain CDN vào giao diện.
- Sinh lại API client từ contracts BE cho checkout, cổng thanh toán giả lập và VNPay. Các màn thanh toán chưa nối các API này.

## Kết quả kiểm tra

- `pnpm check` thành công, gồm lint, typecheck và test của repo.
- Playwright chạy web thật, chọn điểm đến và tìm phòng. `/api/stays` trả 200 và ảnh CloudFront tải thành công, có kích thước ảnh thực tế lớn hơn 0.
- `git diff --check` thành công.

## Cách kiểm lại

1. Khởi động BE ở cổng 8080, đặt `MEDIA_CDN_URL` theo cấu hình môi trường và seed catalog với tiền tố ảnh đã upload.
2. Chạy `pnpm dev` trong FE, mở `http://localhost:3100`.
3. Nhập Đà Nẵng, chọn gợi ý, tìm phòng và kiểm tra ảnh trên thẻ kết quả.

## Ảnh

- Ảnh kiểm tra local `C:/Users/ADMIN/.codex/visualizations/2026/11/05/01a1a9aa-8b59-7d62-b98e-78403bb40fde/ota-hotel-cdn.png`. Không commit ảnh vào repo theo RULES.md.

## Giới hạn dữ liệu

- Catalog seed có ảnh không khớp khách sạn, ví dụ Nhà cổ Cẩm Thanh trỏ tới `h443.jpg`, nội dung là một buổi phát biểu.
- Một số khách sạn khác nhau dùng chung ảnh mẫu. Cần chủ catalog kiểm lại ánh xạ ảnh trước demo dữ liệu thực.

## Ảnh hưởng

- `apps/web/src/features/discovery` thuộc Thành, đã được người dùng duyệt trong phạm vi nối API.
- `packages/api-client/src/generated` được sinh bằng `pnpm gen:api`, không sửa tay.
- Các file `.env` local được Git bỏ qua.
