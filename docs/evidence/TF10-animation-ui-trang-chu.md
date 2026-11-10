# TF10 — Nâng cấp Animation & Chuyển động UI Trang chủ

- Notion: N/A · Nhánh: `thanh/TF10-animation-ui-trang-chu` · Người làm: Thành (dùng AI: có) · Ngày: 2026-11-11

## Đã làm
- Nâng cấp Hero section thành multi-scene showcase (4 danh thắng nổi tiếng: Vịnh Hạ Long, Phố cổ Hội An, Đảo Ngọc Phú Quốc, Tràng An Ninh Bình) với hiệu ứng zoom chậm Ken Burns, huy hiệu nổi xu hướng glassmorphism, thẻ danh thắng chi tiết, đường nét đứt chuyển động lộ trình di chuyển (marching dashes + radar pulse).
- Tái cấu trúc khu vực Hero và Thanh tìm kiếm chuẩn Above-The-Fold:
  - Linh vật Tripi được tái thiết kế thành "Huy hiệu đồng hành du lịch" (Travel Companion Badge) tích hợp avatar bo tròn, beacon phát sáng và thông điệp chào đón, tiết kiệm hơn 90px chiều cao.
  - Tinh chỉnh typography tiêu đề H1 gọn gàng, tăng cường gradient shimmer hoàng hôn.
  - Tinh chỉnh khung ảnh danh thắng tỷ lệ 16:9 điện ảnh (`height: clamp(210px, 18.5vw, 260px)`).
  - Tối ưu hóa kích thước thanh tìm kiếm (giảm padding thừa, căn chỉnh input và nút "Tìm phòng trống"), đưa toàn bộ thanh tìm kiếm lên trọn vẹn 100% trong màn hình đầu tiên (Above-the-fold) trên mọi laptop từ 1366x768 trở lên.
- Thêm gradient shimmer cho slogan dòng 2, hiệu ứng nhấc thẻ và đổ bóng mềm mại cho các nút hoạt động.
- Nâng cấp Gợi ý combo nổi bật: hiệu ứng chuyển cảnh mượt mà theo hướng (directional slide-up/down), tương tác 3D tilt và vệt sáng phản chiếu (specular glare) theo chuyển động chuột, thanh timeline mini tiến trình xoay tua combo tự động tạm dừng khi hover.
- Nâng cấp Khách sạn & Nơi lưu trú: hiệu ứng chia bài so le (staggered entrance) khi chuyển đổi chip điểm đến, zoom nhẹ ảnh phòng, con dấu đỏ Verified đóng dấu nhún nảy khi rê chuột.
- Nâng cấp Banner Tripi: bưu thiếp bồng bềnh lơ lửng, con dấu ngôi sao xoay chậm 360°, vệt nét đứt chạy liên tục.
- Thêm hiệu ứng thả tim nảy bật (heartPop) trên thẻ bài viết cộng đồng.
- Tương thích 100% với accessibility `prefers-reduced-motion: reduce`.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Trang chủ có animation mượt mà, bắt mắt | Đạt | Multi-scene Ken Burns, 3D tilt, floating glassmorphism |
| Chuyển động các card sống động | Đạt | 3D perspective tilt & specular glare, staggered deal entrance |
| Hiệu ứng chuyển cảnh các ảnh ấn tượng | Đạt | Multi-scene hero rotator & directional combo transitions |
| Lint, typecheck, test pass 100% | Đạt | `pnpm check` (9 packages, 0 error) |

## Kết quả kiểm tra
- `pnpm lint`: Pass (Luật FE: không có vi phạm)
- `pnpm typecheck`: Pass (9 packages, 0 error)
- `pnpm test`: Pass (6 test suites, 241 tests passed)
- Production build: Pass (`next build` thành công toàn bộ routes)

## Cách kiểm lại
1. Chạy `pnpm --filter @tripflix/web dev` hoặc mở `http://localhost:3100/`.
2. Kiểm tra phần Hero: xem 4 danh thắng tự động chuyển cảnh, Ken Burns zoom, thẻ nổi và đường nét đứt chuyển động.
3. Rê chuột vào các card gợi ý combo: kiểm tra hiệu ứng nghiêng 3D và vệt sáng quét theo chuột.
4. Bấm chuyển đổi chip điểm đến (Nha Trang, Hội An, Đà Nẵng): kiểm tra hiệu ứng các thẻ khách sạn trồi lên so le.
5. Cuộn xuống Banner Tripi và Bài viết: kiểm tra bưu thiếp bồng bềnh và icon tim nảy khi hover.

## Ảnh hưởng tới phần của người khác
- Không: Chỉ sửa đổi trong `apps/web` và `packages/i18n` do Thành phụ trách.

