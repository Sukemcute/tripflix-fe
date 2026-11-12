# Tripi · Thư viện mascot

Nguồn: character guide người dùng cung cấp ngày 04/11/2026. Bộ này gồm **26 PNG riêng** và **6 vòng animation 2D**. 24 PNG đại diện cho 25 vị trí trong guide, cộng hai biểu cảm Quá tải và Đình công.

Mở `mascot-library.html` ở thư mục prototype để lọc nhóm, đổi nền xem alpha, phóng to và tải từng file. `tripi-asset-library.zip` chứa trọn bộ và source chuyển động.

## Các nhóm PNG

| Nhóm | Số hình | Tệp |
| --- | --- | --- |
| Biểu cảm | 10 | `expr-happy`, `expr-excited`, `expr-curious`, `expr-confident`, `expr-relaxed`, `expr-surprised`, `expr-overload`, `expr-strike`, `expr-effort`, `expr-cheer` |
| Góc nhìn | 4 | `turn-front`, `turn-left`, `turn-back`, `turn-right` |
| Hoạt động | 7 | `action-explore`, `action-vlog`, `action-depart`, `action-vacation`, `action-plan`, `action-book`, `action-share` |
| Nhận diện | 3 | `hero-welcome`, `portrait-profile`, `icon-fox` |
| Trạng thái UI | 2 | `ui-searching`, `ui-success` |

Các tên trong bảng có đuôi `.png`. Hình đầu tò mò ở thẻ “Chưa biết đi đâu?” là bản dùng lại của `expr-curious.png`, không xuất thành PNG thứ 25. Các phụ kiện gắn liền tư thế như bản đồ, máy quay, vali, ghế, ô, dừa, laptop, vé, điện thoại, loa được giữ lại. Chữ, panel, nền ảnh, dấu hỏi, trái tim bay và các tia trang trí được bỏ để dễ tái sử dụng trong UI.

## Animation

| ID | Vai trò | Định dạng |
| --- | --- | --- |
| `greeting` | Tripi chào bạn | `.webp`, `.webm` |
| `curious` | Tò mò, lắng nghe | `.webp`, `.webm` |
| `excited` | Phấn khích | `.webp`, `.webm` |
| `searching` | Đang tìm chuyến | `.webp`, `.webm` |
| `departure` | Chuẩn bị lên đường | `.webp`, `.webm` |
| `success` | Hoàn tất / đặt thành công | `.webp`, `.webm` |

File trong `animations/`, mỗi vòng **512 × 512 px, 3 giây, 24 fps**, không âm thanh. WebP có timestamp 41–42 ms, tổng chính xác 3000 ms. Dùng animated WebP trong thẻ `img` để lặp tự động; dùng WebM trong `video muted loop playsinline` nếu cần điều khiển thời gian. WebM cần browser có hỗ trợ VP9 alpha. Chọn PNG tĩnh tương ứng khi `prefers-reduced-motion: reduce`.

Chuyển động được dựng bằng HyperFrames từ PNG, sử dụng transform trên toàn nhân vật và các chi tiết phản hồi theo timeline 2D: nghiêng, nhún, bật lên, lắc nhẹ và các chấm chờ. Đây là chuyển động raster 2D; không có khớp tay/chân độc lập. Không phải file rig 3D, mô hình nhân vật, motion capture hay source After Effects.

Các file WebP và WebM đã được kiểm tra có nhiều frame khác nhau, nền alpha thực, thời lượng 3 giây; cả sáu WebM đã kiểm tra giải mã alpha trong Chromium. Gallery có công tắc phát/tạm dừng bằng ảnh tĩnh và tự chọn ảnh tĩnh khi bật tùy chọn giảm chuyển động của hệ điều hành.

## Cách sử dụng

```html
<img src="assets/tripi-library/expr-curious.png"
     alt="Tripi tò mò" width="120" height="120">

<img src="assets/tripi-library/animations/greeting.webp"
     alt="Tripi chào bạn" width="220" height="220">
```

Giữ tỷ lệ; không kéo dãn, recolor hoặc lật góc nhìn khi đặc điểm phụ kiện sẽ bị sai. Dùng khoảng trống quanh nhân vật. Không để Tripi che giá, thông báo lỗi hoặc CTA thanh toán. Hình `icon-fox.png` là phong cách phẳng 2D theo icon nhỏ trong guide, không phải một tạo hình 3D khác của Tripi.

## Nguồn và tính chính xác

- Ảnh nguồn được giữ nguyên ở `../tripi-character-guide.png`.
- PNG nền trong suốt được **tách và phục dựng bằng built-in image_gen**, tham chiếu trực tiếp hình gốc. Một số chi tiết nhỏ, logo trên phụ kiện và viền lông có thể được mô hình tái dựng; đây không phải trích xuất layer nguyên gốc, SVG hoặc source 3D.
- Bốn asset đã có trước được tái sử dụng, giữ nguyên tài sản đang chạy trong UI. Hai mươi asset mới được xử lý riêng; icon phẳng có thêm một lượt bỏ halo.
- `generation-manifest.json` lưu prompt và vị trí nguồn cho 20 asset mới. Bộ prompt của bốn asset trước ở `../TRIPI-PROMPTS.md`.
- `catalog.json` và `catalog.js` ánh xạ ID, nhãn tiếng Việt, nhóm, tên file và gợi ý sử dụng.
- Nguồn timeline chỉnh sửa và báo cáo animation ở `videos/tripi-stickers/` của prototype, được đóng kèm ZIP dưới `source/`.

Ảnh guide là một bảng raster có nhiều hình nhỏ; khi có file gốc độ phân giải cao từ đội brand, nên thay asset dẫn xuất bằng source tương ứng đã duyệt.
