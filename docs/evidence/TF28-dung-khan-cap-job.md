# TF28 — Nút dừng khẩn cấp job discovery trên admin

- Notion: TF28 · Nhánh: `duy/TF28-dung-khan-cap-job` (phụ thuộc PR #374) · Người làm: Duy (dùng AI: có) · Ngày: 2026-11-27

## Đã làm

Trước đây, nếu một job discovery (tính đặc trưng gợi ý, dựng chỉ mục tìm) đang ghi dữ liệu sai, admin chỉ có thể chờ nó chạy xong, rồi 10 phút sau nó lại tự chạy. BE (tripflix-be PR #349) đã có API dừng khẩn cấp. PR này thêm nút trên trang **Job tìm kiếm** và **Job gợi ý**.

- Mỗi job có nút **Dừng khẩn cấp** (kiểu nguy hiểm) cạnh Chạy ngay, chỉ superadmin thấy. Bấm vào sẽ mở hộp xác nhận:
  - giải thích dừng làm gì: lượt đang chạy dừng trong vài giây, phần đã ghi trước đó giữ nguyên, job không tự chạy lại;
  - bắt nhập lý do (3–300 ký tự).
- Job đang tạm dừng thì:
  - đầu panel có dải đỏ "Đang tạm dừng", ghi dừng bởi ai (bạn, hoặc quản trị viên + mã), lúc nào, lý do;
  - có nút **Tiếp tục lịch**;
  - Chạy ngay bị khoá. Nếu vẫn gọi được thì hiện thông báo vì sao bị từ chối.
- Lịch sử chạy có kết quả mới **Đã dừng** (badge vàng). Lý do hiện ở cột Lỗi. Dải số liệu có thêm ô đếm "Đã dừng".
- `toStopReason()` (`stop.ts`) kiểm lý do giống BE: bỏ khoảng trắng hai đầu, 3–300 ký tự.
- Chữ đặt trong `packages/i18n/src/discovery-jobs.ts`. Hộp xác nhận dùng `ConfirmDialog` có sẵn.
- `pnpm gen:api`: chỉ commit phần `admin-discovery-jobs` và các model liên quan. Phần `auth`/`feed` đổi theo thay đổi BE khác nên để nguyên.

## Đối chiếu "Xong khi"

| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Superadmin dừng được job đang chạy từ trang admin, có lý do | ✅ | Ảnh 1 (hộp xác nhận khi job đang chạy) |
| Thấy job đang tạm dừng, ai dừng, vì sao; tiếp tục được | ✅ | Ảnh 2; bấm "Tiếp tục lịch" → API trả `pause: null` |
| Lượt bị dừng hiện rõ trong lịch sử | ✅ | Ảnh 2: dòng "Đã dừng" kèm "Dừng khẩn cấp: Điểm gợi ý ra sai sau lượt build" |
| Lý do sai bị chặn | ✅ | `stop.test.ts` |

## Kết quả kiểm tra

- `pnpm turbo run lint typecheck test --affected --concurrency=2`: 23/23 task pass.

## Cách kiểm lại

1. Chạy BE ở nhánh của PR #349, rồi chạy admin.
2. Đăng nhập superadmin, mở **Job gợi ý**. Bấm Chạy ngay ở "Tính đặc trưng gợi ý", rồi bấm Dừng khẩn cấp và nhập lý do.
3. Sau vài giây:
   - dòng mới nhất là "Đã dừng";
   - đầu panel có dải "Đang tạm dừng";
   - Chạy ngay bị khoá.
4. Bấm "Tiếp tục lịch".

## Ảnh / video

- Ảnh 1, 2: đính kèm trong PR, chụp trên máy local với 41k bài.

## Ảnh hưởng tới phần của người khác

- Có: `apps/admin/src/features/discovery-jobs/discovery-jobs.tsx` thuộc `apps/admin` của Thành.
  - Thêm hai component mới (`StopJobButton`, `PausedBanner`).
  - Sửa vài chỗ nhỏ: nút Chạy ngay khoá khi tạm dừng, thông báo khi chạy tay bị từ chối, màu badge cho kết quả mới, thêm một ô trong dải số liệu.
  - Duy đã đồng ý trong phiên; cần Thành duyệt.
