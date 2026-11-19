# SCRUM-145 — Trạng thái và hành động trên thẻ chuyến đi

- Jira: https://tripflix.atlassian.net/browse/SCRUM-145
- Nhánh: `trang/SCRUM-145-trip-status` · Người làm: Trang (dùng AI) · Ngày: 2026-11-19
- Base: develop `f1bfc62`, đã có PR #266 / SCRUM-143. Không khôi phục thay đổi SCRUM-131 đã bị revert.

## Đã làm

- Thiết kế hiện hành dùng UI/UX Pro Max từ [nguồn upstream](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), `style: vibrant playful` → Vibrant & Block-based, hướng consumer/youth; tra thêm stack React Native. Giữ font và palette Tripflix thay vì đổi sang palette/thư viện khác.
- Mở đầu bằng ảnh biển thương hiệu kết hợp mảng vàng nắng. Ảnh là minh họa trang trí cho màn Chuyến đi, không đại diện ảnh khách sạn/điểm đến trong đơn. Ảnh không mang thông tin độc lập và được ẩn khỏi cây truy cập.
- Bỏ các card trắng lồng nhau: pending nền san hô nhạt, paying nền vàng, paid/refunded nền biển nhạt; nhãn chữ vẫn phân biệt trạng thái. Countdown và deadline nằm trực tiếp trong thẻ, không thêm hộp nền riêng. Bộ lọc 4 mục trên một hàng, mục chọn san hô đậm; min-height 48.
- Đưa phần giới thiệu và bộ lọc vào đầu FlatList để cuộn cùng nội dung, tránh che hết vùng xem đơn ở màn ngang/chữ lớn. Giữ safe area của Screen.
- Chia thành Cần xử lý / Sắp đi / Đã đi / Đã hủy. Đơn pending không được trình bày như chuyến đã xác nhận; bỏ slogan cũ trên màn Chuyến đi.
- Thẻ ưu tiên tuyến bay đầu tiên hoặc tên nơi lưu trú, ngày đi/về, số dịch vụ và khách; không ghép mọi tên phòng/chuyến bay thành headline. Nhiều nơi lưu trú có số lượng bổ sung. Thiếu dữ liệu có nhãn dự phòng, không tự đoán điểm đến.
- Pending: đồng hồ từ `holdExpiresAt`, giờ hết giữ chỗ theo múi giờ Việt Nam, lời nhắc chỉ xác nhận sau thanh toán và CTA Tiếp tục thanh toán → checkout đúng orderId.
- Hết giờ: gỡ CTA trả tiền và đưa vào nhóm hủy/hết hạn. Paying vẫn là đang kiểm tra thanh toán, không suy thành expired theo đồng hồ giữ chỗ; mở chi tiết trước khi thử trả lại.
- Paid: ưu tiên mã xác nhận và thông tin đặt chỗ. Giữ nguyên quy tắc TF37: chỉ dùng `tripStatus` từ server để xác định Đã đi.
- Cancelled: không suy ra đã hoàn tiền. List DTO không có refund; chỉ các thẻ hủy có mã xác nhận đang được mount mới đọc `getCheckout`. Hiện processing / refunded / needs_review, số tiền hoàn thực tế hoặc thông báo tải/lỗi/chưa xác nhận. Làm mới danh sách và query chi tiết khi kéo làm mới/quay lại app.
- Dùng token màu/font hiện có, title 30/40, tuyến bay 32/42, headline nơi ở 20/30, nội dung 16/25, metadata 13/22; card radius 10, tab/nút radius 6; nút chính min-height 52 và chữ 15. Không gạch chân tab/chữ hay viền trang trí đầu card; không thêm dependency.

## Đối chiếu tiêu chí

| Tiêu chí | Kết quả / bằng chứng |
|---|---|
| Pending / expired / paid / cancelled / refunded có hành động phù hợp | Browser fixtures, điều hướng đúng orderId; không gửi thao tác ghi đơn/thanh toán |
| Nhiều đơn, countdown chạy và hết hạn | 10 đơn với nhiều trạng thái, đếm ngược, hết hạn và phân trang cursor |
| Trước/sau, kết quả và phân biệt native | PNG trước/sau đính kèm Jira; QA JSON cùng nhánh; native chưa chạy |
| Giữ phong cách onboarding/Khám phá | Ảnh 375/390/430 px, radius 6–10, type scale rõ, không underline / top border |

## Kiểm tra

- `pnpm turbo run lint typecheck test --affected`: 22/22 tác vụ đạt. Repo còn cảnh báo cũ ngoài phạm vi; lint riêng mobile sau chỉnh cuối không có cảnh báo tại file đã sửa.
- `node tools/check-boundaries.mjs`, `git diff --check`: đạt.
- `tools/verify-mobile-trip-status.cjs`: app thật trên browser, API fixtures; kích thước 375/390/430 × 844. Chi tiết kết quả: `SCRUM-145-trip-status-qa.json`.
- Kiểm tra trạng thái, countdown, điều hướng pending/paid/paying/refunded, phân trang, dữ liệu thiếu, chỉ phòng/chỉ bay/nhiều nơi ở; rỗng/lỗi và lỗi refund. Không tạo đơn, không thanh toán hay hoàn tiền thật.
- Chữ 140% là mô phỏng browser tại 390 px; không tương đương font hệ thống hoặc TalkBack.
- Bổ sung kiểm tra màu nền thẻ khác trắng, card bo 10 không có viền trên, 4 tab cùng hàng và vùng chạm >=48; 844×390 cuộn tới CTA đầy đủ; 768×1024 với reduced-motion và dark system preference không tràn ngang (màn vẫn theo theme sáng hiện có).
- 8 cặp màu token chữ/nền đo từ 5.72:1 đến 16.75:1. Tiêu đề navy/vàng 10.59:1; chữ trắng/CTA san hô 5.78:1. Đây là kiểm tra cặp màu phẳng, không phải kết quả audit native hoặc kiểm tra mọi pixel ảnh.

## Cách kiểm lại

1. Chạy mobile preview cổng 8083 từ nhánh này.
2. Đặt `PLAYWRIGHT_PACKAGE` tới Playwright đã cài, `MOBILE_EVIDENCE_DIR` tới thư mục output; chạy `node tools/verify-mobile-trip-status.cjs` (Edge).
3. Với dữ liệu thật: Tôi → Chuyến đi. Kiểm tra cả 4 tab, pending tiếp tục đúng checkout, paid hiện mã, cancelled mở đúng chi tiết hoàn tiền. Kéo làm mới và chuyển app/quay lại.

## Ảnh / giới hạn

- Jira: `SCRUM-145-visual-v2-before-after.png` (bản trắng trước / thiết kế hiện tại), `SCRUM-145-visual-v2-paid.png`. Các ảnh trước đó giữ lại để đối chiếu lịch sử.
- Browser preview đã xác nhận; chưa kiểm tra Android/iOS thật, safe area, font hệ thống, TalkBack, thao tác kéo native hay cổng thanh toán thật. Máy chưa có ADB/thiết bị kết nối.
- TripDto chưa có tên thành phố/điểm đến chuẩn hóa. UI dùng tuyến sân bay/tên nơi ở từ snapshot thay vì tự suy tên địa danh. Muốn headline theo thành phố cần bổ sung contract; không sửa generated client.
- Nội dung hồ sơ/shortcut/tab bar hệ thống chưa sửa trong nhánh này: thuộc SCRUM-156/SCRUM-137. Giữ In Review để xác nhận phạm vi UI-10 và kiểm tra native, chưa đánh dấu Done.

## Ảnh hưởng

- Sửa `apps/mobile/src/features/booking/trips-screen.tsx` (Trang), bổ sung nhãn trong `packages/i18n/src/commerce.ts`; giữ thay đổi TF37 của Thắng.
- Không đổi API, schema, backend, checkout, payment operation hoặc component dùng chung. Các request bổ sung chỉ đọc chi tiết đơn hủy đã thanh toán để lấy refund mà list còn thiếu.
