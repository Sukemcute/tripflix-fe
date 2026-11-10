# TF10 — Nâng cấp Animation & Chuyển động UI Trang chủ

- Notion: N/A · Nhánh: `thanh/TF10-animation-ui-trang-chu` · Người làm: Thành (dùng AI: có) · Ngày: 2026-11-11

## Đã làm
- Nâng cấp Hero section thành multi-scene showcase (4 danh thắng nổi tiếng: Vịnh Hạ Long, Phố cổ Hội An, Đảo Ngọc Phú Quốc, Tràng An Ninh Bình) với hiệu ứng zoom chậm Ken Burns, huy hiệu nổi xu hướng glassmorphism, thẻ danh thắng chi tiết, đường nét đứt chuyển động lộ trình di chuyển (marching dashes + radar pulse).
- Tái thiết kế Hero & Thanh tìm kiếm theo phong cách Organic Wave Horizon & Floating Master Capsule (lấy cảm hứng từ Travorra):
  - Khung ảnh danh thắng dạng vòm sóng hữu cơ mềm mại bất đối xứng (`border-radius: 140px 36px 36px 80px / 180px 36px 36px 80px`), chiều cao khoáng đạt `clamp(340px, 32vw, 450px)` giúp ảnh bung tỏa bao la, không còn bị gò bó hay dẹt ảnh.
  - Thẻ linh vật Tripi đồng hành nổi 3D (`floatingMascotCard`) đặt trang trọng trên góc ảnh với animation bồng bềnh, avatar tròn phát sáng và thông điệp chào đón kèm rating uy tín.
  - Eyebrow du lịch phong cách quốc tế `KHÁM PHÁ · NGHỈ DƯỠNG · TẬN HƯỞNG ✈` với icon máy bay chuyển động lơ lửng.
  - Thanh tìm kiếm nâng cấp thành Floating Search Capsule: bo tròn viên nang `999px`, nền trắng tinh khôi viền mỏng và bóng đổ đa tầng mịn màng, các trường ngăn cách bởi vạch phân cách thanh lịch, nút "Tìm phòng trống" nổi bật với gradient biển và shadow loang màu.
  - Bố cục 100% Above-the-fold hoàn hảo trên desktop và tự động co giãn thông minh trên mobile.
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

