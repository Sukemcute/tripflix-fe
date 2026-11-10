# TF10 — Nâng cấp Animation & Chuyển động UI Trang chủ

- Notion: N/A · Nhánh: `thanh/TF10-animation-ui-trang-chu` · Người làm: Thành (dùng AI: có) · Ngày: 2026-11-11

## Đã làm
- Nâng cấp Hero section thành tuyệt tác Typography 3D & Biển đảo danh thắng Việt Nam theo đúng concept art:
  - Chữ nổi 3D khổng lồ **TRIPFLIX** có viền phát sáng neon cyan rực rỡ phản chiếu mặt nước biển, bên trong các mặt chữ lồng ghép các danh lam thắng cảnh Việt Nam (ruộng bậc thang Mù Cang Chải, Vịnh Hạ Long, chùa cổ, bãi biển Phú Quốc, Cầu Vàng Bà Nà Hills).
  - Chiếc thuyền gỗ truyền thống lướt trên mặt biển rẽ sóng, tạo vệt nước loang bọt trắng xóa uốn lượn mềm mại qua chân chữ ("hiệu ứng chiếc thuyền đi qua rồi loang nước qua chữ").
  - Đôi chim hải âu trắng bay liệng trên bầu trời xanh trong vắt.
  - Typography nửa dưới mặt biển:
    - Dòng 1: `Chạm cảm hứng,` — Chữ trắng tinh khôi nổi bật trên nền đại dương sâu thẳm.
    - Dòng 2: `trọn hành trình.` — Font *Serif Italic* nghệ thuật với gradient cắt mặt nước biển lấp lánh ánh ngọc bích.
    - Nút CTA Primary viên nang trắng tinh khôi (`#ffffff`, chữ xanh đậm) cùng các pill hoạt động du lịch kính mờ (Dạo biển, Lướt sóng, Chèo kayak).
  - Thẻ danh lam thắng cảnh kính mờ dáng ngang (*Panoramic Glassmorphism Card*):
    - Đặt ở nửa dưới mặt biển bên phải, thiết kế dáng ngang hiện đại với badge loại hình di sản/kỳ quan, rating sao, tiêu đề, mô tả và nút "Khám phá ngay →".
    - Khung thumbnail bo góc tròn hiển thị ảnh chụp thực tế của 4 danh thắng Việt Nam (Vịnh Hạ Long, Phố cổ Hội An, Đảo Ngọc Phú Quốc, Tràng An Ninh Bình) tự động xoay tua mượt mà kèm thanh điều hướng chấm dot.
  - Thanh tìm kiếm Master Floating Search Capsule:
    - Viên nang nổi độc lập bo tròn `999px` trắng tinh khiết nổi bật bồng bềnh trên mặt nước biển, đảm bảo 100% Above-the-fold trên mọi độ phân giải màn hình (1280x800, 1440x900) mà không bị che khuất hay kéo dài xuống dưới.
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

