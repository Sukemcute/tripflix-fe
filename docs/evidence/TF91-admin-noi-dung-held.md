# TF91 — Admin xử lý nội dung held

- Jira: [SCRUM-119](https://tripflix.atlassian.net/browse/SCRUM-119)
- Trang, dùng AI: có; ngày 2026-11-16; nhánh `trang/TF91-admin-noi-dung-held`.

## Đã làm
- Chi tiết bài nhận held và cho phép restore/hide/remove. Restore held ghi rõ "Cho hiển thị"; bộ lọc và nhãn dùng "Đang kiểm tra" từ i18n.
- Hàng chờ có nhãn held và thao tác dismiss/restore/hide/remove. Dismiss held được mô tả là "Cho hiển thị".
- Cập nhật API client bằng pnpm gen:api từ hợp đồng BE mới. Có cả thay đổi hợp đồng develop chưa được client sinh trước đây (recommendation); không sửa tay file sinh.

## Kiểm tra
- Lượt trước kiểm cuối: `pnpm turbo run lint typecheck test --affected` 21/21 task pass; api-client 209 test pass.
- Playwright `tests/e2e/admin/held-moderation.cjs`: chạy Admin Next thật với API giả lập; kiểm nhãn held, nút chờ lý do, gửi restore ở chi tiết bài và dismiss ở hàng chờ. PASS.
- Ảnh local (không commit ảnh): `outputs/moderation-tf91/held-post-1440.png`, `held-queue-1440.png` trong workspace VSF.
- Đây là UI test với API giả lập; luồng DB do integration test BE và CI xác minh.

## Kiểm lại
1. Chạy Admin ở localhost:3201.
2. `PLAYWRIGHT_PACKAGE=<runtime-playwright> node tests/e2e/admin/held-moderation.cjs` (PowerShell dùng `$env:PLAYWRIGHT_PACKAGE`).

## Ảnh hưởng
- Admin thuộc Thành, Trang làm theo review TF90 và kế hoạch P1, Thành duyệt.
- BE TF91 phải được triển khai trước khi dùng nút nhả held. FE không tự công khai nội dung; chỉ gọi API kiểm duyệt hiện có.
