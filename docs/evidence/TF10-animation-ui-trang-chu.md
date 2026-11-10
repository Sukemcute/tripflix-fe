# TF10 — Nâng cấp Animation & Chuyển động UI Trang chủ

- Notion: N/A · Nhánh: `thanh/TF10-animation-ui-trang-chu` · Người làm: Thành (dùng AI: có) · Ngày: 2026-11-11

## Đã làm
- **Kiến trúc Modular 3D Typography chuẩn Figma Component System**:
  - Tách từ khóa **TRIPFLIX** thành **8 Frame/Vector độc lập** thay vì dùng một bức ảnh nền tĩnh ghép sẵn:
    - **T**: Sa Pa • Mù Cang Chải (`/brand/destinations/lao-cai-spotlight.jpg`)
    - **R**: Vịnh Hạ Long (`/brand/destinations/quang-ninh-spotlight.jpg`)
    - **I**: Non nước Tràng An • Ninh Bình (`/brand/destinations/ninh-binh-spotlight.jpg`)
    - **P**: Cố đô Huế (`/brand/destinations/hue-spotlight.jpg`)
    - **F**: Đảo Ngọc Phú Quốc (`/brand/destinations/phu-quoc-spotlight.jpg`)
    - **L**: Thác Bản Giốc • Cao Bằng (`/brand/destinations/cao-bang-spotlight.jpg`)
    - **I**: Cầu Vàng Bà Nà Hills • Đà Nẵng (`/brand/destinations/da-lat-spotlight.jpg`)
    - **X**: Phố cổ Hội An (`/brand/destinations/hoi-an-spotlight.jpg`)
  - Mỗi chữ cái sở hữu 3 lớp:
    1. Lớp khối nổi 3D Isometric Extrusion đa tầng với màu ngọc biển sâu (`letter3dExtrusion`).
    2. Lớp mặt chữ lồng ảnh thực tế danh thắng bằng kỹ thuật `-webkit-background-clip: text` kết hợp viền kính pha lê trắng sắc nét `-webkit-text-stroke: 2px rgba(255, 255, 255, 0.95)` và ánh sáng ngọc bích dịu mắt.
    3. Tooltip badge định danh địa danh (`.letterBadge`) nhấc bổng mượt mà khi hover, cho phép click dẫn trực tiếp đến trang tìm kiếm địa phương tương ứng.
  - Phản chiếu mặt nước biển mềm mại (`-webkit-box-reflect: below -28px linear-gradient(...)`) tạo cảm giác chữ cái đứng uy nghi giữa vịnh biển ngọc.
- **Tài nguyên Thuyền gỗ truyền thống & Bọt nước tự nhiên**:
  - Trích xuất và tạo con thuyền gỗ độc lập (`apps/web/public/brand/hero-boat.png`) với người chèo nón lá Việt Nam và mái nan tre.
  - Cụm bọt sóng ôm trọn chân mạn thuyền (`radialGradient`) và chuyển động bập bềnh đu đưa nhẹ nhàng trên mặt nước (`boatSway`).
- **Không gian vịnh biển nhiệt đới & Dãy núi đá vôi Vịnh Hạ Long**:
  - Nền gradient biển nhiệt đới ban ngày tươi sáng, ấm áp với vệt nắng vàng khúc xạ (`.sunRays`) và chim hải âu chao lượn.
  - Vector silhouette các đảo đá vôi Vịnh Hạ Long mờ ảo phía xa chân trời (`.karstSvg`), tạo chiều sâu không gian kỳ vĩ đậm bản sắc Việt Nam.
- **Bố cục 2 cột thanh lịch nửa dưới**:
  - Dòng tiêu đề H1 Playfair Display nghệ thuật: `Chạm cảm hứng, trọn hành trình.` với gradient mint-cyan lấp lánh.
  - Nút CTA Primary `Bắt đầu khám phá →` và 3 pill hoạt động du lịch (Dạo biển, Lướt sóng, Chèo kayak).
  - Thẻ danh lam thắng cảnh kính mờ dáng ngang (*Panoramic Destination Card*) tự động xoay tua 4 danh thắng (Hạ Long, Hội An, Phú Quốc, Ninh Bình) kèm thanh tiến trình 4 chấm dot.
- **Thanh tìm kiếm Master Search Capsule 100% Above-the-fold**:
  - Nằm gọn gàng hoàn toàn trên màn hình đầu tiên (1280x800) không bị tràn hoặc che khuất xuống dưới fold.
  - Responsive hoàn hảo từ màn hình di động (390px) đến 4K desktop.
- Tương thích 100% với accessibility `prefers-reduced-motion: reduce`.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Chữ TRIPFLIX dạng frame modular từng chữ lồng ảnh theo chuẩn Figma | Đạt | 8 letter components độc lập với image masking `-webkit-background-clip: text` |
| Thanh tìm kiếm 100% Above-the-fold trên màn hình 1280x800 | Đạt | Đã kiểm chứng screenshot Chrome headless `live-app-desktop-1280.png` |
| Hiệu ứng thuyền gỗ và sóng nước tự nhiên, không dùng ảnh nền phẳng tĩnh | Đạt | Thuyền PNG độc lập + bọt sóng SVG radial gradient |
| Lint, typecheck, test pass 100% | Đạt | `pnpm check` (Turbo 6 tasks, 0 error) |

## Kết quả kiểm tra
- `pnpm lint`: Pass (0 error, 0 warning)
- `pnpm typecheck`: Pass (9 packages, 0 error)
- `pnpm test`: Pass (6 test suites, 241 tests passed)
- Hiển thị trực quan: Đã kiểm tra thực tế bằng Chrome headless trên `http://localhost:3100`:
  - Desktop 1280x800: `live-app-desktop-1280.png` (Search Capsule 100% Above-the-fold).
  - Mobile 390x844: `live-app-mobile-390.png` (8 chữ cái co giãn vừa vặn, không vỡ layout).

## Cách kiểm lại
1. Chạy `pnpm --filter @tripflix/web dev` hoặc mở trình duyệt tại `http://localhost:3100/`.
2. Kiểm tra phần Hero:
   - Rê chuột vào từng chữ cái trong từ **TRIPFLIX**: chữ cái nổi lên 3D, sáng viền và hiển thị tooltip tên địa danh (Mù Cang Chải, Vịnh Hạ Long, Tràng An, Huế, Phú Quốc, Bản Giốc, Bà Nà, Hội An).
   - Bấm vào bất kỳ chữ cái nào để điều hướng sang trang kết quả tìm kiếm của điểm đến đó.
   - Quan sát con thuyền gỗ bập bềnh trên mặt nước biển ngọc bích và dãy núi đá vôi Vịnh Hạ Long hùng vĩ phía sau.
3. Kiểm tra thanh tìm kiếm Master Search Capsule: Nằm trọn vẹn 100% Above-the-fold trên màn hình đầu tiên mà không phải cuộn chuột.

## Ảnh hưởng tới phần của người khác
- Không: Chỉ sửa đổi trong `apps/web/src/features/discovery/ota-hero.*` và `docs/evidence/` do Thành phụ trách.
