# TF100 (FE) — Nhãn Admin cho luật dụ chuyển khoản ngoài app

- Jira: [SCRUM-124](https://tripflix.atlassian.net/browse/SCRUM-124) · Nhánh: `trang/TF100-nhan-admin-du-chuyen-khoan` · Người làm: Trang (dùng AI: có) · Ngày: 2026-11-17
- BE đi kèm: tripflix-be PR #216 (luật `OFF_PLATFORM_PAYMENT`). PR này chỉ là nhãn hiển thị, merge trước hay sau BE đều được: chưa có hồ sơ mang mã mới thì nhãn không xuất hiện.

## Đã làm
- `apps/admin/src/features/moderation/risk-level.ts`: hồ sơ có luật `OFF_PLATFORM_PAYMENT` hiện nhãn **"Nghi dụ chuyển tiền ngoài app"** (tông `high`) thay cho nhãn chung "Bộ lọc phát hiện dấu hiệu". Thứ tự ưu tiên giữ nguyên: có `SCAM_PATTERN` (kèm số tài khoản) thì vẫn là "Dấu hiệu lừa đảo".
- `tools/verify-moderation-off-platform-ui.cjs`: script kiểm trên Admin thật. Admin giữ phiên ở máy chủ (`3639d7a`), nên không giả lập API trong trình duyệt được nữa; script đăng nhập bằng tài khoản seed local, mật khẩu qua `MODERATION_LIVE_PASSWORD`.
- Đã merge `develop` mới vào nhánh (có thay đổi đăng nhập Admin của #186).

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Admin hiện nhãn riêng cho mã luật mới | ✅ | Gọi trực tiếp `getContentWarning`: `PHONE_VN + CONTACT_INVITE + OFF_PLATFORM_PAYMENT` → "Nghi dụ chuyển tiền ngoài app"/`high`; `OFF_PLATFORM_PAYMENT + SCAM_PATTERN` → "Dấu hiệu lừa đảo"/`critical`; chỉ `PHONE_VN` → nhãn chung như cũ |
| Lint, typecheck | ✅ | `pnpm turbo run lint typecheck --filter=@tripflix/admin`: 2/2, 0 lỗi |
| Ảnh hàng chờ | ⏳ | Chưa chụp: core-api chỉ nhận đăng nhập từ origin 3100/3200, mà Admin 3200 trên máy đang chạy nhánh khác. Chụp bằng script sau khi chạy Admin từ nhánh này ở 3200 |

## Cách kiểm lại
1. Chạy Admin của nhánh này ở `localhost:3200`, stack BE local đang chạy.
2. Có một hồ sơ có luật `OFF_PLATFORM_PAYMENT` (sau khi #216 merge: bình luận "ib zalo 0912 345 678 chuyển khoản cọc giữ phòng nha").
3. `cd tools && MODERATION_LIVE_PASSWORD=<mật khẩu seed> MODERATION_QA_TEXT="<một đoạn nội dung>" node verify-moderation-off-platform-ui.cjs`

## Ảnh hưởng tới phần của người khác
- Có: `apps/admin` (chủ Thành), thêm một nhánh `if` trong hàm nhãn, không đổi hàm hay props. Thành duyệt.
