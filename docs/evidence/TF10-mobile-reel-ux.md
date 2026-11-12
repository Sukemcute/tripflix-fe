# TF10 — Sửa UI/UX reel trên mobile

- Notion: (chưa có link) · Nhánh: `bao/TF10-mobile-reel-ux` (FE, phụ thuộc nhánh `bao/TF44-ai-summary-chi-reel` đã merge vào) · BE: nhánh cùng tên trong `tripflix-be` (API tìm người dùng) · Người làm: Bảo (dùng AI: có) · Ngày: 2026-11-12

## Đã làm

1. **Vào thẳng reel:** bỏ route gốc trỏ trang chào, neo stack vào `(tabs)`. Trang chào vẫn ở `/onboarding`. Link `/?reel=<id>` giữ được tham số.
2. **Thanh tab thấp hơn:** cao 44pt (trước 50 + đệm), icon 21, nút tạo 32, chữ 9.
3. **Tripi trên nút tim:**
   - Đầu cột hành động của reel có một ô trống. Bubble Tripi đứng đúng ô đó và to bằng nút tim.
   - Vẫn kéo đi được. Kéo rồi thì Tripi ở yên chỗ mới.
   - Khi màn hình đổi cỡ thì đo lại vị trí.
4. **Tỉ lệ video và responsive** (không có số chính thức của TikTok; dựa trên các khoảng ước lượng từ công cụ safe-zone, cột phải ~13–15% bề ngang):
   - Video dọc phủ kín khung reel, cắt trên dưới tối đa 15% khi khung thấp hơn 9:16 (máy 16:9, khung trình duyệt). Chỉ máy tính bảng mới giữ toàn khung kèm nền mờ.
   - Icon và ô cột hành động co giãn theo `getReelScale(width)`, lấy 390pt làm chuẩn, chặn trong 0.85–1.15.
5. **Search thả xuống:**
   - Nút search trên reel và thanh search ở Khám phá mở khung thả xuống cao 2/3 màn hình, không chuyển trang.
   - 3 tab: Người dùng (API mới; bấm vào xem video của người đó), Video (lưới ảnh bìa), Lộ trình (số ngày, giá mỗi người).
6. **Bình luận:**
   - Sheet cao 70% màn hình.
   - Mở bình luận thì video giữ nguyên cỡ, đẩy lên vùng còn thấy, nên không còn khung đen.
   - Tóm tắt AI tự tải và luôn hiện, bỏ nút "Tóm tắt". Bài chưa có tóm tắt thì ẩn hẳn khối AI.
7. **Lộ trình:**
   - Khi đăng bài có công tắc "Chia sẻ lộ trình": soạn theo ngày gồm hoạt động, phương tiện (máy bay chọn sân bay có tuyến thật), và một khách sạn cho cả chuyến.
   - Reel chỉ hiện nút "Xem lộ trình" khi bài có lộ trình.
   - Sheet lộ trình hiện lịch từng ngày và giá phòng thật theo ngày khởi hành, số người lớn.
   - "Đặt ngay" giữ phòng (kèm `sourcePostId`) rồi sang `/checkout`. "Nhờ Tripi đổi giúp" mở trợ lý với câu soạn sẵn.

Không làm (theo quyết định của Bảo trong phiên BE): trường phương tiện, sân bay có cấu trúc trong `trip_attachment`. Phương tiện chỉ lưu dạng chữ trong lịch từng ngày, nên **chưa đặt kèm vé bay**. Logic ghép vé bay vào đơn đã có sẵn trong `buildTripPlanCheckout`, chờ core có trường.

## Đối chiếu yêu cầu

| Yêu cầu | Đạt | Bằng chứng |
|---|---|---|
| Mở web/app là vào thẳng reel | Có | `/` mở tab Reels (kiểm trên Expo web) |
| Thanh nav thấp, icon nhỏ | Có | `floating-tab-bar.tsx`; ảnh trình duyệt 375×812 |
| Tripi trên nút tim, to bằng tim, kéo được | Có | Đo DOM: bubble (323,387,43) trên tim (321,444,46) ở 375 px; (355,467,48) trên (353,529,51) ở 412 px; kéo sang (35,237) |
| Video không còn dư blur hai bên, responsive | Có | Test `reels.test.ts` (360×756, 375×623, 390×800, 430×888, 536×873 → cover; 768×980 → contain); DOM: video 375×768 và 430×874 `object-fit: cover` |
| Search thả xuống 2/3, 3 tab | Có | Trình duyệt: "nha trang" ra 2 video, 1 lộ trình "4 ngày · từ 3.500.000đ/người"; "thanh" ra "Thành viên mẫu" |
| Sheet bình luận đúng tỉ lệ, không khung đen | Có | Ảnh sheet 70% với video phía trên |
| Tóm tắt luôn hiện, bài không có thì ẩn | Một phần | Bài không có tóm tắt: không hiện khối AI (đã kiểm). Bài có tóm tắt: chưa kiểm trên giao diện vì `?reel=` không mở được reel `…001` (lỗi có sẵn) |
| Xem lộ trình → đặt | Có (phòng) | Sheet: "Vinpearl Beach Nha Trang · 1 đêm", tổng 960.000đ; chưa bấm "Đặt ngay" để tránh tạo đơn giữ chỗ |

## Kết quả kiểm tra

`pnpm turbo run lint typecheck test --filter=@tripflix/mobile --filter=@tripflix/app-core --filter=@tripflix/api-client --filter=@tripflix/i18n --filter=@tripflix/web --filter=@tripflix/admin --continue`: 16/16 task đạt.

- app-core: 81 test đạt.
- api-client: 150 test đạt.
- i18n: 2 test đạt.
- web: 10 test đạt.
- Lint không lỗi. Mobile còn 1 cảnh báo có sẵn ở `reels-screen.tsx`.

## Cách kiểm lại

1. Chạy BE (`pnpm stack:be` trong `tripflix-be`) và mobile web (`pnpm exec expo start --web` trong `apps/mobile`).
2. Mở app: vào thẳng reel; Tripi đứng trên nút tim; bấm search, gõ "nha trang", đổi giữa 3 tab.
3. Mở bình luận: sheet 70%, không khung đen; bài chưa có tóm tắt không có khối AI.
4. Reel có lộ trình: bấm "Xem lộ trình", đổi ngày khởi hành hoặc số người, xem giá đổi theo.
5. Đăng bài: bật "Chia sẻ lộ trình", thêm ngày, hoạt động, phương tiện, khách sạn rồi đăng.

## Ảnh / video

- Ảnh chụp trên Expo web (trình duyệt) trong phiên làm việc. Ảnh Android thật cần chụp bổ sung, vì máy làm việc không có emulator.

## Ảnh hưởng tới phần của người khác

- Có:
  - `apps/mobile` (Trang): reel, tab bar, trợ lý, đăng bài, Khám phá.
  - `packages/api-client`: thêm `autoLoad` cho `usePostSummary` (mặc định giữ hành vi cũ, web không đổi) và `useUserSearch`; sinh lại client từ contracts core mới nhất.
  - BE `access` (Dũng): API tìm người dùng công khai.
- Chỉ thêm, không đổi chữ ký có sẵn. Cần Trang và Dũng duyệt PR.
