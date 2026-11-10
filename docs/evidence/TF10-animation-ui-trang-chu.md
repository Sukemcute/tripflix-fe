# TF10 — Nâng cấp Animation & Chuyển động UI Trang chủ

- Notion: N/A · Nhánh: `thanh/TF10-animation-ui-trang-chu` · Người làm: Thành (dùng AI: có) · Ngày: 2026-11-11

## Đã làm
- Nâng cấp Hero section thành multi-scene showcase (4 danh thắng nổi tiếng: Vịnh Hạ Long, Phố cổ Hội An, Đảo Ngọc Phú Quốc, Tràng An Ninh Bình) với hiệu ứng zoom chậm Ken Burns, huy hiệu nổi xu hướng glassmorphism, thẻ danh thắng chi tiết, đường nét đứt chuyển động lộ trình di chuyển (marching dashes + radar pulse).
- Tái thiết kế Hero & Thanh tìm kiếm toàn diện theo chuẩn UI/UX Pro Max & Travorra:
  - Áp dụng triệt để nguyên lý Editorial Luxury Travel & Aurora UI:
    - Nền trang trắng sáng tinh khôi (#ffffff), loại bỏ hoàn toàn các khung hộp màu xanh mint tù túng, tạo không gian mở khoáng đạt (airy whitespace).
    - Tiêu đề H1 sử dụng font Serif biên tập cao cấp `Playfair Display`, dòng 1 đen tuyền đậm nét, dòng 2 in nghiêng nghệ thuật cùng gradient shimmer ngọc bích sang coral.
    - Nút CTA Primary viên nang `Bắt đầu khám phá →` màu xanh ngọc bích rực rỡ với hiệu ứng trượt mũi tên khi hover, đặt cạnh các pill hoạt động du lịch Dạo biển, Lướt sóng, Chèo kayak.
  - Khung ảnh danh thắng dạng Vòm Sóng Hữu Cơ (Organic Fluid Wave Horizon) bất đối xứng mềm mại (`border-radius: 170px 36px 36px 110px / 230px 36px 36px 110px`), bung tỏa bao la sang nửa phải màn hình.
  - Thẻ nổi Tripi Mascot Đồng Hành 3D (`floatingMascotCard`) đặt trang trọng ở góc trên ảnh với avatar tròn nổi bật, badge tick xanh chứng nhận và "50,000+ du khách tin chọn" tương tự thẻ Happy Travelers của Travorra.
  - Huy hiệu Xu hướng du lịch 2026 và thẻ danh thắng chi tiết 4.9★ kính mờ căn chỉnh vị trí an toàn, không bị cắt góc bởi đường cong vòm sóng.
  - Thanh tìm kiếm nâng cấp thành Viên Nang Nổi Độc Lập (Single Floating Master Search Capsule):
    - Loại bỏ hoàn toàn hộp bao ngoài thô cứng hai lớp (box-inside-box).
    - Form trở thành 1 viên nang nổi bồng bềnh `border-radius: 999px` nền trắng tinh khiết, shadow đa tầng siêu mịn, vạch ngăn cách mảnh giữa các trường.
    - Tab dịch vụ "Khách sạn" và nút "Bộ lọc thêm" nằm nhẹ nhàng trên đỉnh viên nang.
    - Nút "Tìm phòng trống" viên nang bo tròn rực rỡ ở góc phải.
    - Hiển thị 100% Above-the-fold trên desktop và tự động co giãn thông minh trên mobile.
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

