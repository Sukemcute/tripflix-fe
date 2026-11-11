# TF10 — Nâng cấp Animation & Chuyển động UI Trang chủ

- Notion: N/A · Nhánh: `thanh/TF10-animation-ui-trang-chu` · Người làm: Thành (dùng AI: có) · Ngày: 2026-11-11

## Đã làm
- **Nâng cấp Toàn bộ Landing Page: Layered 2D Environmental Journey (Tone Sáng & Khớp Màu Thương hiệu)**:
  - **Bầu trời Ban mai Nắng ấm Tươi sáng (Loại bỏ hoàn toàn nền tối)**:
    - Bầu trời chuyển sang gam màu sáng ấm áp: `#FFF7F2` $\rightarrow$ `#FEF3C7` (vàng mật ong) $\rightarrow$ `#BAE6FD` (xanh thiên thanh) $\rightarrow$ `#00B2A3` (Teal thương hiệu).
    - Thêm các cụm mây trắng 2D vector bồng bềnh (`cloud1`, `cloud2`) và chim hải âu chao liệng đón gió biển.
    - Dãy núi đá vôi Vịnh Hạ Long 3 lớp 2D phối màu tươi mát, trong trẻo: Lam ngọc thanh khiết $\rightarrow$ Xanh ngọc bích $\rightarrow$ Xanh ngọc lục bảo.
  - **Khối Chữ TRIPFLIX 3D Nghiêng Thể thao Năng động**:
    - Giữ vững dáng nghiêng 3D Isometric: `transform: scaleX(1.08) skewX(-7deg)` kết hợp `font-style: italic`.
    - Lồng ảnh toàn cảnh danh lam thắng cảnh Việt Nam (`vietnam-panorama-tripflix.jpg`) liên tục, sắc nét, không bị cắn lẹm viền với đường nét viền kính pha lê trắng tinh khôi.
    - Khối 3D Extrusion đa tầng phối màu rực rỡ (`#0f766e` $\rightarrow$ `#0284c7` $\rightarrow$ `#00b2a3`).
    - Lưới 8 Hotspots tương tác tooltip badge định danh danh lam thắng cảnh phong cách Light Mode sang trọng.
  - **Các Dải Chuyển Cảnh 2D Xếp Lớp (Layered 2D Environmental Transitions)**:
    - **Transition 1**: Đáy Hero kết nối bằng **Đường sóng 2D uốn lượn kép (Dual Organic Wave Divider)** nối sang nền Sea Mist `#E7F7F4`.
    - **Transition 2**: Dãy **Đồi núi xanh 2D xếp tầng (Layered Highland Hills & Forest)** lấy cảm hứng trực tiếp từ tranh dã ngoại, chuyển tiếp êm dịu từ đồng bằng xanh ngọc sang sương ấm Warm Mist (`#FFF7F2`).
    - **Transition 3**: **Dải sóng cát bờ biển vàng ấm (Sunset Shoreline & Sand Dunes)** chuyển tiếp sang khu vực Cozy Stays và Banner Mascot Tripi.
  - **Khớp 100% Bộ nhận diện Thương hiệu Tripflix (Brand Guidelines & Tokens)**:
    - Nút CTA chính "Bắt đầu khám phá": Màu **Coral (`#FF5A3C`)** rực rỡ với chữ trắng và bóng đổ cam ấm áp.
    - Tiêu đề H1: "Chạm cảm hứng," màu Navy `#141B3D` đậm đà; "trọn hành trình." gradient từ Teal `#00B2A3` sang Coral `#FF5A3C`.
    - Thẻ Panoramic Destination Card: Kính mờ tuyết trắng sang trọng, badge Coral `#FF5A3C`, rating vàng Sun `#FFC531`, chữ Navy `#141B3D`.
    - Nền toàn trang: Dải cảnh quan sáng sủa, thanh thoát với Sea Mist (`#E7F7F4`), Warm Mist (`#FFF7F2`) và Trắng tuyết (`#FFFFFF`).
  - **Thanh tìm kiếm Master Search Capsule**:
    - Nổi 100% **Above-the-fold** trên màn hình 1280x800, viên nang trắng tinh khiết với các trường tìm kiếm rõ ràng.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Bầu trời sáng sủa, ấm áp, ngập tràn ánh nắng và mây 2D | Đạt | Gradient `#FFF7F2` $\rightarrow$ `#FEF3C7` $\rightarrow$ `#BAE6FD` + Mây 2D + Chim hải âu |
| Chữ TRIPFLIX 3D nghiêng thể thao lồng ảnh panorama Việt Nam | Đạt | `skewX(-7deg)` + italic + lồng ảnh liên tục không cắn lẹm |
| Các dải cảnh quan 2D xếp lớp chuyển cảnh mượt mà | Đạt | Sóng biển ngọc bích $\rightarrow$ Đồi núi cao nguyên $\rightarrow$ Bờ cát vàng ấm |
| Khớp 100% màu thương hiệu Coral #FF5A3C & Teal #00B2A3 | Đạt | Nút CTA Coral, Slogan Teal-Coral, Badge Coral & Sun, nền Sea Mist & Warm Mist |
| Thanh tìm kiếm 100% Above-the-fold trên 1280x800 | Đạt | Đã kiểm chứng screenshot `bright-hero-desktop-1280.png` |
| Toàn cảnh trang sáng sủa, thẩm mỹ du lịch cao cấp | Đạt | Đã kiểm chứng screenshot `bright-full-desktop-2800-v2.png` |
| Lint, typecheck pass 100% | Đạt | `pnpm --filter web typecheck` & `pnpm --filter web lint` 0 error |

## Kết quả kiểm tra
- `pnpm lint`: Pass (0 error)
- `pnpm typecheck`: Pass (0 error)
- Hiển thị trực quan trên `http://localhost:3100`:
  - `bright-hero-desktop-1280.png`: Hero bầu trời ban mai sáng sủa, thanh tìm kiếm Above-the-fold trên 1280x800.
  - `bright-full-desktop-2800-v2.png`: Toàn cảnh cuộn dọc với các dải chuyển cảnh 2D xếp lớp êm ái.
  - `bright-mobile-390.png`: Giao diện tương thích hoàn hảo trên điện thoại.

## Cách kiểm lại
1. Mở trình duyệt tại `http://localhost:3100/`.
2. Nhấn `Ctrl + F5` để tải bản cập nhật mới nhất.
3. Cuộn trang từ trên xuống dưới để trải nghiệm các dải chuyển cảnh 2D tự nhiên, sáng sủa, ấm áp và tươi mát.

## Ảnh hưởng tới phần của người khác
- Không: Chỉ sửa đổi trong `apps/web/src/features/discovery/` và `docs/evidence/` do Thành phụ trách.
