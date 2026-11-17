# TF48 — Trang chủ mobile đồng bộ với web

- Notion: (chưa có) · Nhánh: `dung/TF48-trang-chu-mobile-theo-web` · Người làm: Dũng (dùng AI: có) · Ngày: 2026-11-17

## Đã làm
- Tab Khám phá (trang chủ mobile) mở đầu bằng hero ảnh biển, khẩu hiệu "Thấy là thích, nhích là đi" như web
  (dòng hai màu kem) và linh vật cáo, thay cho ô tìm kiếm và dải "Vé máy bay" phẳng.
- Ô tìm kiếm nằm trong thẻ trắng nổi đè lên mép dưới hero, giống ô tìm phòng trên web; "Vé máy bay" thành nút
  viên thuốc trong thẻ đó, kèm nút "Khách sạn" mở trang tìm (gõ điểm đến ra khách sạn). Bấm ô tìm vẫn mở bảng
  tìm như trước.
- Ô tìm kiếm làm lại kiểu web: viên thuốc, icon tròn xanh bên trái, nhãn "TÌM KIẾM" chữ in hoa trên dòng gợi ý,
  nút mũi tên cam bên phải.
- Tiêu đề mục theo kiểu web: "Đi đâu tiếp đây?" và "Gợi ý dành cho bạn" chữ to kèm dòng phụ; "Xem tất cả" thành
  nút bo tròn.
- Sửa chữ gợi ý trong ô tìm bị lệch lên trên.
- Chỉ dùng ảnh, chữ (`vi.api.authHero*`, `vi.ota.recommendation*`) và màu có sẵn; không thêm thư viện.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Trang chủ mobile cùng phong cách trang chủ web | Có | Xem trên Expo web; ảnh Android bổ sung trong PR |
| Không đổi chức năng tìm kiếm, vé máy bay, gợi ý | Có | Bấm ô tìm mở bảng tìm, nút Vé máy bay mở `/flights` (đã thử trên Expo web) |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`: 22/22 task pass.

## Cách kiểm lại
1. `pnpm --filter @tripflix/mobile start -c`, mở tab Khám phá.

## Ảnh / video
- Ảnh Android: bổ sung trong PR.

## Ảnh hưởng tới phần của người khác
- Có: `apps/mobile/src/features/discovery/live-discovery-screens.tsx` (chủ Trang). Cần báo Trang.
