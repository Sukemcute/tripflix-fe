# TF10 — Nâng cấp Animation & Chuyển động UI Trang chủ

- Notion: N/A · Nhánh: `thanh/TF10-animation-ui-trang-chu` · Người làm: Thành (dùng AI: có) · Ngày: 2026-11-11

## Đã làm
- **Khôi phục Dáng chữ TRIPFLIX Nghiêng 3D Isometric Thể thao Phiêu lưu**:
  - Dáng chữ quay trở lại góc nghiêng năng động (`transform: scaleX(1.08) skewX(-7deg)` kết hợp `font-style: italic`), tạo cảm giác lướt sóng, tốc độ, tràn đầy cảm hứng du lịch trải nghiệm.
  - Khối nổi 3D Extrusion đa tầng nghiêng chéo góc isometric chân thực (`#012638` $\rightarrow$ `#03486a` $\rightarrow$ `#0284c7`).
  - Toàn cảnh danh lam thắng cảnh Việt Nam (`vietnam-panorama-tripflix.jpg`) lồng trọn vẹn, sắc nét, không bị cắn lẹm ở viền nhờ kỹ thuật tách lớp viền kính pha lê trắng tinh khiết (`stroke-width: 2px`).
  - Lưới 8 Hotspots tương tác nghiêng đồng bộ, hiển thị Tooltip Badge định danh danh thắng (Mù Cang Chải, Hạ Long, Tràng An, Huế, Phú Quốc, Bản Giốc, Bà Nà Hills, Hội An) khi hover.

- **Thiết kế Liền mạch Toàn bộ Landing Page: Vertical Environmental Journey (Phong cách Laracon VIII)**:
  - **Tầng 1 (Đỉnh — Bầu trời & Nắng sớm)**: Bầu trời xanh thiên thanh ấm áp, vệt nắng hoàng hôn/bình minh vàng dịu (`sunRays`), chim hải âu bay lượn, chữ TRIPFLIX 3D nghiêng tỏa sáng.
  - **Tầng 2 (Giữa — Mặt đất & Kỳ quan Non nước)**: Dãy núi đá vôi Vịnh Hạ Long kỳ vĩ (`karstSvg`), bờ cát ven biển, slogan `Chạm cảm hứng, trọn hành trình.` và nút CTA `Bắt đầu khám phá →`.
  - **Tầng 3 (Chuyển tiếp — Mặt cắt Sóng biển Waterline)**: Đường cong thấu kính nước cuộn sóng trong veo (Waterline Cross-Section Curve) với bọt sóng sủi tăm li ti. Thanh tìm kiếm Master Search Capsule nổi nhẹ nhàng 100% Above-the-fold ngay trên ranh giới mặt nước.
  - **Tầng 4 (Đáy — Lòng Đại dương Sâu thẳm Deep Ocean Abyss)**:
    - Toàn bộ background kéo dài liền mạch từ dưới Hero xuống chân trang bằng dải gradient đại dương bất tận (`#0284c7` $\rightarrow$ `#0369a1` $\rightarrow$ `#075985` $\rightarrow$ `#083344` $\rightarrow$ `#042838` $\rightarrow$ `#021e2b` $\rightarrow$ `#01151f` $\rightarrow$ `#010e16`).
    - **Tia nắng rọi xuyên nước (`sunbeams`)**: Chùm tia sáng mặt trời chiếu rọi từ trên mặt nước xuống lòng biển với hiệu ứng shimmer lấp lánh nhẹ nhàng.
    - **Bóng cá voi đại dương khổng lồ (`whaleSilhouetteWrapper`)**: Vector cá voi uốn lượn bơi chậm rãi ngang qua làn nước xanh thẳm như trong tranh Laracon VIII.
    - **Đàn cá nhỏ & Bong bóng nước li ti (`schoolOfFish` & `bubble`)**: Nổi bập bềnh sinh động.
    - **Rạn san hô & Rong biển hai bên viền (`coralLeft`, `coralRight`)**: Tạo chiều sâu không gian thủy cung.
    - **Thẻ nội dung Deep Sea Glassmorphism**: Thẻ "Có phòng cho chuyến đi sắp tới" chuyển thành Vé du hành đại dương kính mờ sang trọng, loại bỏ mép xé trắng; các thẻ điểm đến, khách sạn, câu chuyện hành trình nổi bật với chữ trắng tuyết và điểm xuyết cam san hô Coral rực rỡ.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Chữ TRIPFLIX dáng nghiêng 3D Isometric chuẩn thương hiệu | Đạt | `transform: scaleX(1.08) skewX(-7deg)` + italic + SVG Panorama Masking |
| Toàn bộ trang Landing Page liền mạch Bầu trời -> Mặt đất -> Mặt cắt nước -> Đại dương | Đạt | Gradient biển sâu bất tận + Waterline Cross-Section + Tia nắng + Cá voi |
| Xóa bỏ dải mép xé trắng, đồng bộ Deep Sea Glassmorphism | Đạt | `.stayBand` kính mờ bo tròn 32px, ẩn `.stayEdgeTop/Bottom` |
| Thanh tìm kiếm 100% Above-the-fold trên màn hình 1280x800 | Đạt | Đã kiểm chứng screenshot Chrome headless `ocean-hero-desktop-1280-v2.png` |
| Toàn cảnh trang mượt mà không đứt đoạn | Đạt | Đã kiểm chứng screenshot Chrome headless `ocean-seamless-v3.png` |
| Lint, typecheck, test pass 100% | Đạt | `pnpm check` (Turbo 6 tasks, 0 error) |

## Kết quả kiểm tra
- `pnpm lint`: Pass (0 error, 0 warning)
- `pnpm typecheck`: Pass (9 packages, 0 error)
- `pnpm test`: Pass (6 test suites, 241 tests passed)
- Hiển thị trực quan trên `http://localhost:3100`:
  - `ocean-hero-desktop-1280-v2.png`: Hero trên màn hình 1280x800 chuẩn 100% Above-the-fold.
  - `ocean-seamless-v3.png`: Toàn cảnh cuộn trang dọc liền mạch Bầu trời $\rightarrow$ Mặt đất $\rightarrow$ Đại dương sâu thẳm.

## Cách kiểm lại
1. Chạy `pnpm --filter @tripflix/web dev` hoặc mở trình duyệt tại `http://localhost:3100/`.
2. Kiểm tra chữ **TRIPFLIX**: Dáng nghiêng 3D thể thao lướt sóng, lồng trọn vẹn toàn cảnh Việt Nam sắc nét không cắn lẹm ảnh.
3. Cuộn trang từ trên xuống dưới:
   - Thưởng thức hành trình chuyển tiếp không gian: Bầu trời ban mai $\rightarrow$ Dãy núi Vịnh Hạ Long $\rightarrow$ Mặt cắt sóng biển trong veo $\rightarrow$ Lòng đại dương sâu thẳm với tia nắng rọi, bóng cá voi khổng lồ bơi lội, bong bóng nước và các rạn san hô hai bên.
   - Thẻ vé du lịch "Có phòng cho chuyến đi sắp tới" và các section bên dưới hòa quyện tự nhiên trên nền kính mờ đại dương sang trọng.
4. Kiểm tra thanh tìm kiếm: Nổi bồng bềnh 100% Above-the-fold trên màn hình 1280x800.

## Ảnh hưởng tới phần của người khác
- Không: Chỉ sửa đổi trong `apps/web/src/features/discovery/` và `docs/evidence/` do Thành phụ trách.
