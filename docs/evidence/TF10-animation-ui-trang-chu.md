# TF10 — Nâng cấp Animation & Chuyển động UI Trang chủ

- Notion: N/A · Nhánh: `thanh/TF10-animation-ui-trang-chu` · Người làm: Thành (dùng AI: có) · Ngày: 2026-11-11

## Đã làm
- **Triển khai 100% Khớp Chính Xác Bản Thiết Kế Mockup Chuẩn (Reference Art: media_1794388246294_bffc6342)**:
  - **Hero 3D Cinematic Backdrop 2K**:
    - Nền biển ngọc bích nhiệt đới, bầu trời nắng ấm trong lành, dải lụa ngọc lam uốn lượn mềm mại trên cao cùng đàn chim hải âu chao liệng.
    - Hai bên là dãy đảo đá vôi Vịnh Hạ Long kỳ vĩ sừng sững đón sóng.
    - Chữ **TRIPFLIX 3D pha lê nguyên khối** vươn lên trực tiếp từ mặt biển, viền sáng neon trắng ngọc lam nổi bật với toàn cảnh danh lam thắng cảnh Việt Nam lồng xuyên suốt (Sa Pa, Hạ Long, Tràng An, Huế, Phú Quốc, Cao Bằng, Cầu Vàng Đà Nẵng, Hội An).
    - Thuyền nan có mui rẽ sóng nước lướt từ phải qua trái, tạo vệt bọt sóng trắng (`boat wake`) uốn cong tự nhiên ôm lấy chân chữ và mặt nước phản chiếu lung linh.
  - **Lớp Tương tác Hotspot 8 Chữ cái (Figma Hotspot System)**:
    - Overlay trong suốt tương ứng 8 chữ cái T - R - I - P - F - L - I - X.
    - Hover hiển thị tooltip badge kính mờ định danh danh thắng (Tây Bắc · Sa Pa, Kỳ quan · Vịnh Hạ Long, Cố đô · Huế, Biển xanh · Phú Quốc, Di sản · Hội An...).
    - Click điều hướng thẳng tới trang tìm kiếm điểm đến tương ứng.
  - **Cột Nội dung Bên Trái (Hero Storytelling & Actions)**:
    - Eyebrow kính mờ viên nang: `KHÁM PHÁ • NGHỈ DƯỠNG • TẬN HƯỞNG →`.
    - Tiêu đề H1 font Playfair Display sang trọng: Dòng 1 `Chạm cảm hứng,` (trắng tinh khiết) và Dòng 2 `trọn hành trình.` (italic gradient ngọc lam biển sâu).
    - Đoạn giới thiệu: Font chữ trắng thanh lịch với bóng đổ nhẹ chống lóa trên nền nước biển.
    - Nút CTA chính: Viên nang trắng bo tròn `Bắt đầu khám phá →` chữ xanh thẫm đậm đà.
    - 3 Pills trải nghiệm kính mờ bo tròn: `Dạo biển`, `Lướt sóng`, `Chèo kayak` với ảnh thumbnail tròn thực tế.
  - **Cột Thẻ Nổi Bên Phải (Panoramic Destination Card)**:
    - Thẻ kính mờ cao cấp phong cách Glassmorphism màu xanh thẫm đại dương (`rgba(3, 38, 56, 0.76)`).
    - Badge cam `DI SẢN UNESCO` và đánh giá sao vàng `★ 4.8`.
    - Tiêu đề `Phố cổ Hội An`, phụ đề `Đắm hoà dàng lung linh sắc màu`, liên kết `Khám phá ngay →`.
    - Khung ảnh thumbnail đêm hoa đăng Hội An bên sông lung linh sắc màu (`home-hoi-an-lanterns-night.jpg`).
    - Thanh điều hướng chấm scene 3 nấc: `— • •` với hiệu ứng progress fill mượt mà.
  - **Thanh Tìm Kiếm Master Search Capsule (100% Above-the-fold)**:
    - Viên nang trắng bo tròn đơn khối nổi bật ngay trên mép nước biển dưới cùng của Hero.
    - Đầy đủ các trường tìm kiếm: Điểm đến (icon pin), Ngày nhận phòng (icon lịch), Ngày trả phòng (icon lịch), Số khách, Số phòng và nút bấm `Tìm phòng trống` màu Teal thương hiệu.
    - Đảm bảo hiển thị trọn vẹn 100% Above-the-fold trên màn hình tiêu chuẩn 1280x800 mà không cần cuộn.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Khớp 100% chi tiết visual theo mockup chuẩn `media_1794388246294_bffc6342` | Đạt | Backdrop 2K 3D TRIPFLIX, thuyền nan, vệt sóng, typography, thẻ Hội An |
| Chữ TRIPFLIX 3D pha lê lồng danh thắng Việt Nam và bọt sóng nước | Đạt | Độ phân giải 2K sắc nét, viền pha lê phát sáng, bóng nước tự nhiên |
| Thẻ Phố cổ Hội An với ảnh đêm hoa đăng, badge UNESCO, sao 4.8 | Đạt | Khớp 1:1 theo ảnh mẫu tham chiếu |
| Thanh tìm kiếm 100% Above-the-fold trên màn hình 1280x800 | Đạt | Đã kiểm chứng screenshot `hero-exact-final-1280.png` |
| Hotspot tương tác 8 chữ cái Figma vẫn hoạt động trơn tru | Đạt | Lưới 8 điểm hover tooltip badge và click tìm kiếm |
| Lint, typecheck pass 100% | Đạt | `pnpm --filter web typecheck` & `pnpm --filter web lint` 0 error |

## Kết quả kiểm tra
- `pnpm lint`: Pass (0 error)
- `pnpm typecheck`: Pass (0 error)
- Hiển thị trực quan trên `http://localhost:3100`:
  - `hero-exact-final-1280.png`: Hero khớp 1:1 theo ảnh mẫu `media_1794388246294_bffc6342`, Above-the-fold hoàn hảo trên 1280x800.
  - `hero-exact-final-mobile-390.png`: Hiển thị gọn gàng, tự nhiên trên thiết bị di động.

## Cách kiểm lại
1. Mở trình duyệt tại `http://localhost:3100/`.
2. Nhấn `Ctrl + F5` để xóa cache và tải phiên bản mới nhất.
3. So sánh trực tiếp với bản thiết kế mẫu để kiểm tra độ khớp 1:1.

## Ảnh hưởng tới phần của người khác
- Không: Chỉ sửa đổi trong `apps/web/src/features/discovery/` và `docs/evidence/` do Thành phụ trách.
