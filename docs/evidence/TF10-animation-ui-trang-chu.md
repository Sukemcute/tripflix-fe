# TF10 — Nâng cấp Animation & Chuyển động UI Trang chủ

- Notion: N/A · Nhánh: `thanh/TF10-animation-ui-trang-chu` · Người làm: Thành (dùng AI: có) · Ngày: 2026-11-11

## Đã làm
- Nâng cấp Hero section thành multi-scene showcase (4 danh thắng nổi tiếng: Vịnh Hạ Long, Phố cổ Hội An, Đảo Ngọc Phú Quốc, Tràng An Ninh Bình) với hiệu ứng zoom chậm Ken Burns, huy hiệu nổi xu hướng glassmorphism, thẻ danh thắng chi tiết, đường nét đứt chuyển động lộ trình di chuyển (marching dashes + radar pulse).
- Đột phá kiến trúc Hero với Frame Cách Điệu Đa Dải Viên Nang Nghiêng (Diagonal Pill Slits Window) & Waterline Typography:
  - Xóa bỏ hoàn toàn bố cục "1 góc hình bên phải" truyền thống:
    - Sử dụng hệ thống 3 dải viên nang nghiêng song song `-40°` (lấy cảm hứng từ mẫu *Travel The World*): vươn dài từ trung tâm sang toàn bộ mép phải, lồng một bức ảnh danh thắng trải dài LIÊN TỤC và LIỀN MẠCH qua cả 3 dải (Seamless Multi-Pill Panorama).
    - Viền kính phát sáng đa tầng (glow & dash borders) tạo chiều sâu 3D kiến trúc ấn tượng.
    - Chuyển cảnh 4 danh thắng (Vịnh Hạ Long, Phố cổ Hội An, Đảo Ngọc Phú Quốc, Tràng An Ninh Bình) mượt mà với hiệu ứng crossfade opacity 900ms trên thẻ `<image>`.
  - Typography Lồng Mặt Nước Biển (Waterline Ocean Surface Text Mask - lấy cảm hứng từ *SeaGuard Cleanup*):
    - Dòng 1: `Chạm cảm hứng,` — Chữ trắng tinh khôi nổi bật trên nền đại dương sâu thẳm.
    - Dòng 2: `trọn hành trình.` — Font *Serif Italic* nghệ thuật với gradient cắt mặt nước biển: nửa trên màu trắng bạc ánh dương, nửa dưới màu ngọc bích đại dương lấp lánh shimmer.
  - Nền Hero Deep Oceanic Emerald:
    - Tone màu xanh ngọc bích đại dương sâu thẳm (`#022421 → #043e38 → #085850`) kết hợp hiệu ứng ánh sáng nước biển tỏa nhẹ.
    - Nút CTA Primary viên nang trắng tinh khôi nổi bật (`#ffffff`, chữ xanh đậm) cùng các pill hoạt động du lịch kính mờ.
  - Thanh tìm kiếm Master Floating Search Capsule:
    - Viên nang nổi độc lập bo tròn `999px` trắng tinh khiết nổi bật như chiếc du thuyền trên mặt biển, 100% Above-the-fold trên mọi độ phân giải.
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

