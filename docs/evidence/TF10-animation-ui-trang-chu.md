# TF10 — Nâng cấp Animation & Chuyển động UI Trang chủ

- Notion: N/A · Nhánh: `thanh/TF10-animation-ui-trang-chu` · Người làm: Thành (dùng AI: có) · Ngày: 2026-11-11

## Đã làm
- **Nâng cấp Kiến trúc SVG Upright Typography Masking (Chữ đứng thẳng lồng toàn cảnh Việt Nam)**:
  - **Chữ TRIPFLIX đứng thẳng 90 độ (Upright)**: Loại bỏ hoàn toàn `skewX(-7deg)` và `font-style: italic` (nằm nghiêng), chuyển sang thế đứng thẳng vững chãi, hiện đại, khỏe khoắn như logo kiến trúc danh lam thắng cảnh, tiết kiệm không gian chiều cao và diện tích chiều ngang.
  - **Ảnh fix chuẩn, không bị cắt khúc hay cắn lẹm ở viền**: Sử dụng công nghệ SVG `<clipPath id="uprightTripflixMask">` chứa `<text>` toàn từ khóa `TRIPFLIX`, lồng trọn vẹn bức tranh panorama danh thắng Việt Nam liên tục (`/brand/vietnam-panorama-tripflix.jpg`).
  - **Đường viền kính pha lê trắng tinh khiết**: Layer `<text fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="2">` tách biệt trên cùng, ôm khít nét chữ mà không ăn lẹm hay cắt vào ảnh bên trong.
  - **Khối nổi 3D Extrusion đa tầng**: 3 lớp độ sâu đứng thẳng (`#012638`, `#03486a`, `#0284c7`) kết hợp bóng đổ drop shadow chân thực.
  - **Lưới tương tác 8 Hotspots (T - R - I - P - F - L - I - X)**: Phủ 8 điểm tương tác nhạy bén, rê chuột hiển thị Tooltip Badge mờ sang trọng định danh 8 danh thắng từ Bắc chí Nam (Mù Cang Chải, Vịnh Hạ Long, Tràng An, Cố đô Huế, Phú Quốc, Thác Bản Giốc, Bà Nà Hills, Phố cổ Hội An), bấm vào chữ cái chuyển ngay đến trang tìm kiếm địa phương.
  - **Phản chiếu mặt nước biển tự nhiên**: `-webkit-box-reflect: below -20px linear-gradient(...)` phản chiếu bóng chữ xuống làn nước trong veo.
- **Bổ sung Lớp gợn sóng nước & Ánh sáng khúc xạ (Water Ripples & Caustics)**:
  - Tạo lớp SVG gợn sóng nước uốn lượn đa tầng (`.waterRippleLayer` & `.waterWavesSvg`) với các đường cong Bezier mềm mại.
  - Vệt nắng caustics khúc xạ mặt trời chiếu xuống nước biển (`causticGlow`), làm cho mặt biển ở giữa sống động, có chiều sâu 3 chiều tự nhiên, loại bỏ hoàn toàn cảm giác trống trải.
- **Loại bỏ con thuyền gỗ theo góp ý người dùng**:
  - Dỡ bỏ con thuyền gỗ và vệt bọt thuyền, giúp toàn bộ khung cảnh mặt nước biển thoáng đãng, sang trọng, đẳng cấp và thanh thoát.
- **Phân bố lại bố cục 2 cột cân xứng**:
  - Cột trái: Eyebrow capsule mờ, tiêu đề H1 `Chạm cảm hứng, trọn hành trình.` với gradient mint-cyan sang trọng, mô tả xúc tích, nút CTA `Bắt đầu khám phá →` và 3 pill hoạt động (Dạo biển, Lướt sóng, Chèo kayak).
  - Cột phải: Thẻ danh thắng kính mờ dáng ngang xoay tua 4 địa danh (Hạ Long, Hội An, Phú Quốc, Ninh Bình) với thumbnail bo góc và thanh tiến trình 4 chấm.
  - Khoảng cách giữa chữ TRIPFLIX và 2 cột nội dung bên dưới được thu gọn tối ưu (~16px), tạo bố cục chặt chẽ.
- **Thanh tìm kiếm Master Search Capsule 100% Above-the-fold**:
  - Nằm trọn vẹn 100% trong màn hình đầu tiên (1280x800) không bị trôi hay che khuất xuống dưới fold.
  - Co giãn tự nhiên, sắc nét trên màn hình di động (390x844).
- Tương thích 100% với accessibility `prefers-reduced-motion: reduce`.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Chữ TRIPFLIX đứng thẳng, ảnh lồng chuẩn không bị cắt khúc viền | Đạt | SVG ClipPath Masking + Panorama Việt Nam liên tục không cắn lẹm ảnh |
| Mặt nước biển có gợn sóng tự nhiên, loại bỏ con thuyền gỗ | Đạt | SVG Water Waves đa tầng + caustics glow, đã bỏ heroBoat |
| Thanh tìm kiếm 100% Above-the-fold trên màn hình 1280x800 | Đạt | Đã kiểm chứng screenshot Chrome headless `upright-hero-desktop-3105.png` |
| Responsive tối ưu trên thiết bị di động (390x844) | Đạt | Đã kiểm chứng screenshot Chrome headless `upright-hero-mobile-390-v2.png` |
| Lint, typecheck, test pass 100% | Đạt | `pnpm check` (Turbo 6 tasks, 0 error) |

## Kết quả kiểm tra
- `pnpm lint`: Pass (0 error, 0 warning)
- `pnpm typecheck`: Pass (9 packages, 0 error)
- `pnpm test`: Pass (6 test suites, 241 tests passed)
- Hiển thị trực quan: Đã kiểm tra thực tế bằng Chrome headless:
  - Desktop 1280x800: `upright-hero-desktop-3105.png` (Search Capsule 100% Above-the-fold).
  - Mobile 390x844: `upright-hero-mobile-390-v2.png` (Co giãn mượt mà, layout cân đối sắc nét).

## Cách kiểm lại
1. Chạy `pnpm --filter @tripflix/web dev` hoặc mở trình duyệt tại `http://localhost:3100/`.
2. Kiểm tra phần Hero:
   - Chữ **TRIPFLIX** đứng thẳng vững chãi, không bị nằm nghiêng; ảnh toàn cảnh danh thắng Việt Nam lồng mượt mà, không bị cắt khúc ở viền.
   - Rê chuột vào từng chữ cái trong từ **TRIPFLIX**: xuất hiện Tooltip Badge định danh danh lam thắng cảnh (Mù Cang Chải, Vịnh Hạ Long, Tràng An, Huế, Phú Quốc, Bản Giốc, Bà Nà Hills, Hội An); click để tìm kiếm địa phương tương ứng.
   - Quan sát các dải sóng nước gợn sóng uốn lượn lăn tăn với vệt nắng caustics khúc xạ trên mặt biển ngọc bích.
   - Con thuyền gỗ đã được loại bỏ hoàn toàn, không gian mặt biển sang trọng, thoáng đãng.
3. Kiểm tra thanh tìm kiếm Master Search Capsule: Nằm trọn vẹn 100% Above-the-fold trên màn hình đầu tiên mà không phải cuộn chuột.

## Ảnh hưởng tới phần của người khác
- Không: Chỉ sửa đổi trong `apps/web/src/features/discovery/ota-hero.*`, `apps/web/public/brand/vietnam-panorama-tripflix.jpg` và `docs/evidence/` do Thành phụ trách.
