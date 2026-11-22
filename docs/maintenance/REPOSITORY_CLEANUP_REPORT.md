# Báo cáo dọn dẹp kho mã frontend Tripflix

Thực hiện ngày 22/11/2026 trên nhánh `chore/repository-deep-cleanup` trong worktree `tripflix-fe-deep-cleanup`. Mốc đối chiếu là `ffab348ce5306d38061001603b250320b42e2986` của `origin/develop`.

## Kết quả

| Hạng mục | Tệp đã xóa | Byte đã xóa |
| --- | ---: | ---: |
| Minh chứng trong `docs/evidence` | 107 | 5.086.398 |
| Mô-đun frontend không còn nơi sử dụng | 10 | 76.961 |
| **Tổng** | **117** | **5.163.359** |

Mốc xóa là hết ngày 15/11/2026 theo giờ UTC+7, tính bằng ngày tác giả của commit không phải commit merge sửa tệp lần cuối. Đã giữ đủ 155 tệp cập nhật từ 16–22/11 và 10 tệp cũ về bảo mật, quyền riêng tư và quy trình kiểm tra kiểm duyệt.

Các thư mục minh chứng hết tệp Git theo dõi sau khi dọn gồm `hero-left-card-20261112`, `layered-hero-20261111`, `layered-hero-logo-20261111`, `layered-hero-rive-search-20261112`, `layered-hero-slogan-mascot-20261112`, `layered-hero-slogan-unclipped-20261112`, `layered-hero-soft-scrim-20261112`, `layered-hero-soft-water-20261111`, `mobile-reel-overlay`, `mobile-reel-startup`, `ota-search-redesign`, `reels-iphone-feedback`. Các ảnh này còn truy cập được từ commit đối chiếu. README của layered hero và API client đã được đổi sang liên kết tới bản lưu tại commit đó.

Đã thêm quy tắc `/test-results/ai-summary-flow/` vào `.gitignore` cho ảnh QA tự sinh. Giữ nguyên tên và phiên bản phụ thuộc, lockfile, cấu hình triển khai, tuyến ứng dụng và tài nguyên thương hiệu.

## Đo dung lượng

| Chỉ số | Trước | Sau |
| --- | ---: | ---: |
| Đường dẫn tại mốc ban đầu còn trong bản làm việc | 2.332 | 2.215 |
| Byte của các tệp tại mốc ban đầu còn trong bản làm việc | 355.546.136 | 350.383.435 |
| Đối tượng Git đã đóng gói | 510.491 KiB | 510.491 KiB |
| Đối tượng Git rời | 269 KiB | 269 KiB |
| Dung lượng gói Expo Android | 57.353.985 byte | 57.353.985 byte |

Dung lượng của các tệp được Git theo dõi từ mốc đối chiếu giảm ròng **5.162.701 byte** sau khi tính 658 byte tăng thêm từ hai README và `.gitignore`. Hai tài liệu bảo trì mới chưa được Git theo dõi nên được để ngoài phép tính này. Lịch sử Git còn nguyên. Đã cài 718 gói với lockfile cố định và dùng chung lượt cài đó cho hai lần kiểm tra. Kích thước đầu ra Next.js không dùng để tính số byte dọn khỏi kho mã.

## Xác minh

- `pnpm install --frozen-lockfile` thành công. pnpm ghi nhận script cài đặt của esbuild bị bỏ qua theo cấu hình hiện tại. Các bước lint, kiểm tra kiểu, kiểm thử và build vẫn thành công.
- `pnpm turbo run lint typecheck test build` đạt 28/28 tác vụ ở cả hai lần. Lần sau dùng `--force` và thực sự chạy lại cả 28 tác vụ. `node tools/check-boundaries.mjs` đạt ở cả hai lần.
- Next.js giữ nguyên manifest với 31 mục web và 21 mục admin. Tất cả 100 đường dẫn nguồn trong ba cây thư mục định tuyến được giữ nguyên. Chạy thử 9 URL cục bộ trên bản build Next.js đều trả HTTP 200, gồm trang chủ, đăng nhập, tìm kiếm, giỏ hàng, chính sách quyền riêng tư, trạng thái admin và logo công khai.
- `expo export --platform android` thành công ở cả hai lần với 2.707 mô-đun và 76 tài nguyên. Hai gói có cùng danh sách tệp, metadata và nội dung tài nguyên. Mã Hermes trùng nhau sau khi chuẩn hóa tên tệp tạm do Expo sinh và đối chiếu mã kiểm tra SHA-1 ở cuối tệp.
- `git diff --check`, quy tắc `git check-ignore`, danh sách tệp được phép xóa và đích của các liên kết minh chứng đều được xác minh. Chưa chạy luồng nghiệp vụ đầu cuối với backend hoặc kiểm thử trên thiết bị Android/iOS.

## Minh chứng cũ được giữ

| Tệp trong `docs/evidence` | Lý do |
| --- | --- |
| `TF056-ma-hoa-mat-khau.md` | Xác minh xử lý mật khẩu trước khi gửi |
| `TF056-rang-buoc-refresh.md` | Xác minh ràng buộc phiên làm mới |
| `TF056-thong-bao-va-tai-truoc-dang-nhap.md` | Kiểm tra lỗi phiên đăng nhập |
| `TF059-chinh-sach-bao-mat.md` | Minh chứng về chính sách quyền riêng tư |
| `TF05D-xac-thuc-email.md` | Kiểm tra xác thực email |
| `TF05G-chan-chua-dang-nhap-gio-hang.md` | Kiểm tra chặn truy cập chưa đăng nhập |
| `TF05G-ma-xac-thuc-dang-nhap.md` | Kiểm tra mã xác thực đăng nhập |
| `TF06E-dashboard-theo-vai-tro.md` | Kiểm tra quyền truy cập theo vai trò |
| `TF14-canh-bao-an-toan.md` | Kiểm tra cảnh báo an toàn |
| `TF32-hang-cho-kiem-duyet.md` | Quy trình tái lập kiểm tra hàng chờ kiểm duyệt trên Docker |

Các tài liệu thiết kế và hồ sơ có giá trị tham chiếu vẫn có thể đánh giá tiếp theo kế hoạch. Đợt này chỉ thực hiện ở frontend.

## Danh sách đã xóa

<details>
<summary>107 tệp minh chứng</summary>

| Tệp | Ngày cập nhật cuối | Byte |
| --- | --- | ---: |
| `docs/evidence/TF06A-web-dang-nhap.md` | 05/11/2026 | 6.329 |
| `docs/evidence/TF06D-trang-tai-khoan.md` | 05/11/2026 | 4.394 |
| `docs/evidence/TF06F-tai-khoan-chua-dang-nhap.md` | 06/11/2026 | 4.531 |
| `docs/evidence/TF06G-thu-gon-thiet-bi.md` | 06/11/2026 | 3.598 |
| `docs/evidence/TF06H-header-tai-khoan.md` | 06/11/2026 | 5.395 |
| `docs/evidence/TF06J-trang-bai-viet.md` | 06/11/2026 | 7.510 |
| `docs/evidence/TF06K-thanh-tim-kiem.md` | 06/11/2026 | 5.850 |
| `docs/evidence/TF06L-tong-mau-xanh.md` | 06/11/2026 | 3.382 |
| `docs/evidence/TF06M-ho-so-ca-nhan.md` | 06/11/2026 | 8.313 |
| `docs/evidence/TF06N-admin-chi-tiet-bai.md` | 06/11/2026 | 6.513 |
| `docs/evidence/TF06O-trang-dang-nhap-dang-ky.md` | 09/11/2026 | 6.033 |
| `docs/evidence/TF08-reels-iphone-feedback.md` | 05/11/2026 | 4.762 |
| `docs/evidence/TF08-trinh-phat-reels.md` | 05/11/2026 | 11.381 |
| `docs/evidence/TF10-anh-khach-san-ota.md` | 05/11/2026 | 2.040 |
| `docs/evidence/TF10-animation-ui-trang-chu.md` | 11/11/2026 | 5.306 |
| `docs/evidence/TF10-lo-trinh-dat-ngay.md` | 12/11/2026 | 2.937 |
| `docs/evidence/TF10-mobile-reel-ux.md` | 12/11/2026 | 5.987 |
| `docs/evidence/TF10-reel-ti-le-tiktok.md` | 12/11/2026 | 2.809 |
| `docs/evidence/TF10-sua-giat-dai-phong.md` | 10/11/2026 | 2.934 |
| `docs/evidence/TF10-web-hotel-detail.md` | 06/11/2026 | 7.313 |
| `docs/evidence/TF11-giao-dien-trang-tim-kiem.md` | 06/11/2026 | 6.451 |
| `docs/evidence/TF11-hero-va-the-phong.md` | 06/11/2026 | 3.590 |
| `docs/evidence/TF11-o-chon-va-lich-mem.md` | 06/11/2026 | 3.628 |
| `docs/evidence/TF11-the-mem-va-kinh.md` | 09/11/2026 | 2.935 |
| `docs/evidence/TF11-tinh-chinh-giao-dien-web.md` | 06/11/2026 | 4.570 |
| `docs/evidence/TF11-web-tim-bai-qua-discovery.md` | 11/11/2026 | 3.810 |
| `docs/evidence/TF11-web-tim-kham-pha.md` | 06/11/2026 | 3.286 |
| `docs/evidence/TF12-anh-goi-y-trang-chu.md` | 09/11/2026 | 2.359 |
| `docs/evidence/TF12-web-goi-y-trang-chu.md` | 08/11/2026 | 3.117 |
| `docs/evidence/TF14-giao-dien-tom-tat-ai.md` | 06/11/2026 | 4.622 |
| `docs/evidence/TF22-reels-tabs.md` | 10/11/2026 | 3.848 |
| `docs/evidence/TF24-dang-video-mobile.md` | 10/11/2026 | 3.975 |
| `docs/evidence/TF25-cam-hung-tran-duoi.md` | 13/11/2026 | 2.723 |
| `docs/evidence/TF25-chia-se-bai-reels.md` | 13/11/2026 | 5.038 |
| `docs/evidence/TF25-giao-dien-feed-cam-hung.md` | 10/11/2026 | 5.356 |
| `docs/evidence/TF25-hoan-thien-tab-cam-hung.md` | 09/11/2026 | 2.586 |
| `docs/evidence/TF25-mo-bai-tu-trang-chu.md` | 13/11/2026 | 5.954 |
| `docs/evidence/TF25-mo-reels-tu-tim-kiem.md` | 13/11/2026 | 6.046 |
| `docs/evidence/TF25-reels-web-giam-lag.md` | 12/11/2026 | 4.321 |
| `docs/evidence/TF25-reels-web-khung-rong.md` | 12/11/2026 | 5.247 |
| `docs/evidence/TF25-tach-reels-va-bai-viet.md` | 12/11/2026 | 3.602 |
| `docs/evidence/TF25-ten-tac-gia-bai-viet-web-mobile.md` | 09/11/2026 | 3.130 |
| `docs/evidence/TF25-ten-tac-gia-binh-luan.md` | 09/11/2026 | 1.711 |
| `docs/evidence/TF25-tim-kiem-grid-web.md` | 12/11/2026 | 5.170 |
| `docs/evidence/TF25-toi-uu-trai-nghiem-feed-cam-hung.md` | 12/11/2026 | 5.127 |
| `docs/evidence/TF27-tim-bai-dang-mobile.md` | 09/11/2026 | 4.432 |
| `docs/evidence/TF28-cam-hung-goi-y-bai.md` | 13/11/2026 | 4.921 |
| `docs/evidence/TF29-dat-theo-lo-trinh-linh-hoat.md` | 13/11/2026 | 14.965 |
| `docs/evidence/TF29-giao-dien-tim-chuyen-bay.md` | 06/11/2026 | 5.588 |
| `docs/evidence/TF29-kiem-tra-dong-bo-nhanh.md` | 05/11/2026 | 3.956 |
| `docs/evidence/TF29-logo-hang-va-ve-rang-cua.md` | 07/11/2026 | 2.499 |
| `docs/evidence/TF29-noi-commerce-mobile.md` | 05/11/2026 | 13.152 |
| `docs/evidence/TF29-tre-em-em-be.md` | 08/11/2026 | 4.398 |
| `docs/evidence/TF29-ve-khu-hoi.md` | 08/11/2026 | 4.603 |
| `docs/evidence/TF31-chat-tripi-mobile.md` | 10/11/2026 | 9.377 |
| `docs/evidence/TF31-mascot-rive.md` | 10/11/2026 | 2.761 |
| `docs/evidence/TF31-noi-chat-tripi-mobile.md` | 10/11/2026 | 3.023 |
| `docs/evidence/TF33-web-post-404-cache.md` | 09/11/2026 | 2.688 |
| `docs/evidence/TF44-ai-summary-chi-reel.md` | 12/11/2026 | 3.769 |
| `docs/evidence/TF44-tom-tat-ai-binh-luan-reels-web.md` | 12/11/2026 | 3.349 |
| `docs/evidence/TF46-nut-theo-doi.md` | 13/11/2026 | 1.121 |
| `docs/evidence/TF46D-lien-ket-binh-luan.md` | 12/11/2026 | 1.486 |
| `docs/evidence/TF46D-tra-loi-trong-luong.md` | 13/11/2026 | 1.120 |
| `docs/evidence/TF68-sua-ci-cd.md` | 08/11/2026 | 2.203 |
| `docs/evidence/TF69-checkout-loi-tung-o.md` | 08/11/2026 | 3.759 |
| `docs/evidence/TF72-tat-prefetch-link.md` | 10/11/2026 | 2.320 |
| `docs/evidence/TF73-search-khong-goi-rsc.md` | 10/11/2026 | 6.487 |
| `docs/evidence/TF84-dung-xoay-bo-refetch.md` | 11/11/2026 | 4.344 |
| `docs/evidence/TF86-toi-uu-tai-trang-chu.md` | 13/11/2026 | 6.052 |
| `docs/evidence/TF89-kpi-kiem-duyet-admin.md` | 14/11/2026 | 4.175 |
| `docs/evidence/api-integration.md` | 05/11/2026 | 9.587 |
| `docs/evidence/floating-navigation.md` | 06/11/2026 | 5.152 |
| `docs/evidence/hero-left-card-20261112/desktop.png` | 12/11/2026 | 133.896 |
| `docs/evidence/hero-left-card-20261112/mobile.png` | 12/11/2026 | 47.851 |
| `docs/evidence/layered-hero-20261111/desktop-1440.png` | 11/11/2026 | 211.947 |
| `docs/evidence/layered-hero-20261111/mobile-390.png` | 11/11/2026 | 49.910 |
| `docs/evidence/layered-hero-logo-20261111/desktop-1440.png` | 12/11/2026 | 198.987 |
| `docs/evidence/layered-hero-logo-20261111/mobile-390.png` | 12/11/2026 | 47.082 |
| `docs/evidence/layered-hero-rive-search-20261112/desktop-1440.png` | 12/11/2026 | 166.474 |
| `docs/evidence/layered-hero-rive-search-20261112/mobile-390.png` | 12/11/2026 | 50.076 |
| `docs/evidence/layered-hero-rive-search-20261112/tablet-768.png` | 12/11/2026 | 102.885 |
| `docs/evidence/layered-hero-slogan-mascot-20261112/desktop-1440.png` | 12/11/2026 | 173.818 |
| `docs/evidence/layered-hero-slogan-mascot-20261112/mobile-320.png` | 12/11/2026 | 46.437 |
| `docs/evidence/layered-hero-slogan-mascot-20261112/mobile-390.png` | 12/11/2026 | 53.958 |
| `docs/evidence/layered-hero-slogan-mascot-20261112/tablet-768.png` | 12/11/2026 | 99.444 |
| `docs/evidence/layered-hero-slogan-unclipped-20261112/desktop-1920.png` | 12/11/2026 | 213.319 |
| `docs/evidence/layered-hero-slogan-unclipped-20261112/mobile-390.png` | 12/11/2026 | 50.085 |
| `docs/evidence/layered-hero-soft-scrim-20261112/mobile-390.png` | 12/11/2026 | 49.976 |
| `docs/evidence/layered-hero-soft-scrim-20261112/wide-1920.png` | 12/11/2026 | 206.128 |
| `docs/evidence/layered-hero-soft-water-20261111/desktop-1440.png` | 12/11/2026 | 207.263 |
| `docs/evidence/layered-hero-soft-water-20261111/mobile-390.png` | 12/11/2026 | 48.926 |
| `docs/evidence/mentor-demo-ui.md` | 05/11/2026 | 10.584 |
| `docs/evidence/mobile-reel-overlay/reel-390.jpg` | 12/11/2026 | 80.028 |
| `docs/evidence/mobile-reel-startup/tripflix-launch.png` | 12/11/2026 | 9.419 |
| `docs/evidence/mobile-ui-parity.md` | 06/11/2026 | 2.057 |
| `docs/evidence/mobile-ui-review.md` | 05/11/2026 | 7.660 |
| `docs/evidence/ota-search-redesign/filters-1280.png` | 05/11/2026 | 736.434 |
| `docs/evidence/ota-search-redesign/filters-390.png` | 05/11/2026 | 122.283 |
| `docs/evidence/ota-search-redesign/homepage-1440.png` | 05/11/2026 | 781.031 |
| `docs/evidence/ota-search-redesign/homepage-390.png` | 05/11/2026 | 696.896 |
| `docs/evidence/ota-search-redesign/verification.json` | 05/11/2026 | 2.610 |
| `docs/evidence/reels-iphone-feedback.md` | 05/11/2026 | 3.935 |
| `docs/evidence/reels-iphone-feedback/01-collapsed.png` | 05/11/2026 | 34.083 |
| `docs/evidence/reels-iphone-feedback/02-expanded.png` | 05/11/2026 | 51.241 |
| `docs/evidence/reels-iphone-feedback/03-comments.png` | 05/11/2026 | 39.177 |
| `docs/evidence/reels-iphone-feedback/verification.json` | 05/11/2026 | 584 |
| `docs/evidence/search-monitoring-20261111.md` | 11/11/2026 | 9.108 |

</details>

| Mô-đun frontend không còn nơi sử dụng | Byte |
| --- | ---: |
| `apps/admin/src/features/auth/login-screen.tsx` | 1.495 |
| `apps/mobile/src/components/placeholder-screen.tsx` | 1.056 |
| `apps/mobile/src/features/account/account-screens.tsx` | 10.716 |
| `apps/mobile/src/features/booking/booking-screens.tsx` | 16.498 |
| `apps/mobile/src/features/booking/detail-screens.tsx` | 10.527 |
| `apps/mobile/src/features/discovery/discovery-screens.tsx` | 11.217 |
| `apps/mobile/src/features/discovery/feed-trip-detail-screen.tsx` | 3.233 |
| `apps/mobile/src/features/feed/feed-screen.tsx` | 8.783 |
| `apps/mobile/src/features/post/create-screen.tsx` | 9.878 |
| `apps/web/src/features/discovery/trip-detail-screen.tsx` | 3.558 |
