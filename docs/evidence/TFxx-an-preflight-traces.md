# TFxx — Bật xem lại preflight CORS thành công

- Task: yêu cầu trực tiếp trong Codex, chưa có link Notion.
- Nhánh: `trang/TFxx-an-preflight-traces`. Ngày: 2026-11-17. Người làm: Trang (dùng AI).

## Đã làm và nghiệm thu

- Checkbox “Hiện preflight CORS thành công” mặc định tắt; query và cache key cập nhật khi đổi lựa chọn.
- Client core-api sinh lại từ OpenAPI BE bằng Orval; không thay client AI.
- Không thay bộ lọc lỗi/độ trễ/service hoặc cách mở trace theo ID.

## Kết quả kiểm tra

- `pnpm turbo run lint typecheck test --affected`: 22 task thành công.
- `pnpm turbo run build --filter=@tripflix/admin...`: build production thành công.
- `tests/e2e/admin/preflight-traces.cjs`: pass trên Chrome, 1440/390 px, không page error hoặc tràn ngang trang.
- E2E kiểm tra mặc định ẩn, bật/tắt hiện lại, giữ OPTIONS lỗi/thông thường/cũ, phối hợp bộ lọc lỗi và độ trễ.
- E2E gọi ObservabilityService BE đã build với Tempo 2.9 thật có fixture cô lập; auth/BFF dùng adapter kiểm thử. Không phải kiểm chứng lưu lượng staging.

## Cách kiểm lại và ảnh

1. Build BE anh em tại `../tripflix-be`, chạy Tempo cô lập 3215/4319 và script BE `tools/verify-preflight-traces.mjs`.
2. Chạy admin cổng 3216. Đặt `PLAYWRIGHT_PACKAGE` nếu Playwright ở ngoài repo, chạy `node tests/e2e/admin/preflight-traces.cjs`.
3. Ảnh được lưu ngoài repo tại `../artifacts/preflight_default_hidden.png`, `preflight_show_all.png`, `preflight_mobile.png`. Có thể đổi bằng `PREFLIGHT_EVIDENCE_DIR`; không commit ảnh theo RULES.md.

## Phạm vi và giới hạn

- Admin (Thành), API client và i18n. Không sửa mobile/web hoặc deploy.
- Phụ thuộc PR BE cùng nhánh cho query mới và phân loại request mới. Trace cũ chưa phân loại vẫn hiện; chưa deploy staging.
