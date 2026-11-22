# Kế hoạch dọn dẹp kho mã frontend Tripflix

> Kế hoạch dưới đây ghi lại kết quả kiểm kê trước khi dọn. Ngày 22/11/2026, người dùng duyệt thực hiện phần frontend và xóa minh chứng cũ đến hết 15/11. Xem danh sách đã xóa, các ngoại lệ và kết quả kiểm tra trong [Báo cáo thực hiện](REPOSITORY_CLEANUP_REPORT.md).

## Mốc đối chiếu và kiểm kê

Nhánh `chore/repository-deep-cleanup` bắt đầu tại `ffab348ce5306d38061001603b250320b42e2986` sau khi đồng bộ bằng chế độ fast-forward với `origin/develop`. Nhánh này nằm trong worktree riêng `tripflix-fe-deep-cleanup`. Bản làm việc frontend ban đầu vẫn giữ nhánh và các tệp chưa được Git theo dõi.

- `apps/web` và `apps/admin` là hai ứng dụng Next.js có ảnh Docker, thư mục tài nguyên công khai và hệ thống định tuyến theo tệp riêng. `apps/mobile` dùng Expo Router, đóng gói tài nguyên cho ứng dụng di động và có cấu hình build EAS.
- `packages` chứa API client, phần lõi dùng chung, cấu hình, bản dịch, token thiết kế, giao diện web và tiện ích. Các mô-đun API client do Orval sinh ra được lưu trong Git.
- Workspace dùng pnpm 10.32.1, danh mục phiên bản phụ thuộc chung và Turbo. CI cài phụ thuộc theo lockfile cố định rồi chạy lint, kiểm tra kiểu, kiểm thử, build và kiểm tra ranh giới mô-đun. Workflow phát hành và triển khai build và đưa lên môi trường chạy hai ảnh web/admin. EAS loại tài liệu và cả hai thư mục tài nguyên công khai của web/admin khỏi gói mobile.
- `tests/e2e` chứa các kịch bản kiểm thử trình duyệt và dữ liệu kiểm thử. `tools` chứa các script xác minh thủ công và công cụ dựng tài nguyên ảnh hero nhiều lớp và Rive. `docs/evidence` lưu minh chứng theo đầu việc và PR theo `RULES.md`. `design/tripi-rive`, `docs/design/layered-hero/source` và `docs/mascot` chứa tác phẩm gốc và đầu vào dùng để tạo tài nguyên.
- Mốc ban đầu gồm **2.332 đường dẫn và 355.546.136 byte** được Git theo dõi. Đây là tổng kích thước tệp trong bản làm việc, cũng bằng tổng kích thước blob tính theo từng đường dẫn tại commit đã đồng bộ. Worktree dùng chung kho đối tượng Git với bản làm việc chính. Kết quả `git count-objects -v` ghi nhận 510.491 KiB đối tượng đã đóng gói và 269 KiB đối tượng rời.

## Có thể xóa sau khi được phê duyệt

Các mô-đun bên dưới nằm ngoài thư mục định tuyến theo tệp. Đã rà soát mã nguồn, bài kiểm thử, công cụ và cấu hình được Git theo dõi theo tên tệp chính xác, tên được import, bí danh đường dẫn và tham chiếu động. Các tên export chỉ xuất hiện ở nơi khai báo hoặc ở thành phần trùng tên có triển khai độc lập. Các tuyến vẫn nạp thành phần đang dùng. Độ tin cậy cao đối với phạm vi trong kho mã. Tuyến và bản build cần được kiểm tra trước khi hoàn tất.

| Đường dẫn | Byte | Hạng mục | Lý do và bằng chứng | Rủi ro có thể phát sinh |
| --- | ---: | --- | --- | --- |
| `apps/admin/src/features/auth/login-screen.tsx` | 1,495 | Thành phần không còn dùng | Không có tham chiếu trỏ đến mô-đun. Trang đăng nhập quản trị xuất lại thành phần từ `live-login-screen`. | Tuyến đăng nhập quản trị có thể gặp lỗi nếu còn điểm truy cập chưa được rà soát. |
| `apps/mobile/src/components/placeholder-screen.tsx` | 1,056 | Thành phần không còn dùng | Không có nơi gọi `PlaceholderScreen` hoặc import mô-đun theo đường dẫn. | Bản xem thử chạy thủ công có thể import trực tiếp thành phần. |
| `apps/mobile/src/features/account/account-screens.tsx` | 10,716 | Thành phần không còn dùng | Không có nơi gọi bốn export. Mục đã lưu dùng `live-feed-screen`, còn hộp thư và thông báo dùng các mô-đun hiện hành. | Cần kiểm tra nhanh các tuyến tài khoản. |
| `apps/mobile/src/features/booking/booking-screens.tsx` | 16,498 | Thành phần không còn dùng | Giỏ hàng dùng `cart-ui`. Thanh toán và màn hình thành công dùng `live-booking-screens`. Không có import theo đường dẫn hoặc nơi gọi các export của mô-đun này. | Cần kiểm tra đặt chỗ và thanh toán bằng dữ liệu kiểm thử. |
| `apps/mobile/src/features/booking/detail-screens.tsx` | 10,527 | Thành phần không còn dùng | Các màn hình hành trình và khách sạn trong mô-đun không có tham chiếu trỏ đến. Thành phần khách sạn trùng tên trên web được import từ mô-đun riêng. | Cần kiểm tra liên kết sâu đến khách sạn và hành trình. |
| `apps/mobile/src/features/discovery/discovery-screens.tsx` | 11,217 | Thành phần không còn dùng | Tìm kiếm trên mobile dùng `live-discovery-screens`, trợ lý dùng `assistant-chat`. Không có nơi gọi ba export của mô-đun này. | Cần kiểm tra các tuyến khám phá, tìm kiếm và trợ lý. |
| `apps/mobile/src/features/discovery/feed-trip-detail-screen.tsx` | 3,233 | Thành phần không còn dùng | Không có tham chiếu đến `FeedTripDetailScreen` hoặc đường dẫn mô-đun. | Cần kiểm tra điều hướng từ bảng tin đến hành trình. |
| `apps/mobile/src/features/feed/feed-screen.tsx` | 8,783 | Thành phần không còn dùng | Màn hình khám phá hiện tại import `LiveFeedScreen` từ `live-feed-screen`. Không có nơi import `FeedScreen`. | Cần kiểm tra thẻ bảng tin và nội dung đã lưu. |
| `apps/mobile/src/features/post/create-screen.tsx` | 9,878 | Thành phần không còn dùng | Tuyến tạo bài xuất lại `LiveCreateScreen` từ `live-create-screen`. Không có nơi gọi mô-đun cũ. | Cần kiểm tra tạo bài và khôi phục bản nháp bằng dữ liệu kiểm thử. |
| `apps/web/src/features/discovery/trip-detail-screen.tsx` | 3,558 | Thành phần không còn dùng | Không có tham chiếu đến mô-đun hoặc tên export. Tệp nằm ngoài cây định tuyến Next.js. | Cần kiểm tra liên kết và các tuyến chi tiết chuyến đi trên web. |

Đề xuất xóa **10 tệp với tổng cộng 76.961 byte Git đang theo dõi**, tương đương 0,022% dung lượng ban đầu. Ước tính còn 355.469.175 byte trước khi tính tài liệu bảo trì và dòng bỏ qua được đề xuất. Lịch sử Git, phụ thuộc đã cài và đầu ra build được đo riêng.

Theo mặc định, `tools/verify-ai-summary.cjs` lưu ảnh kiểm tra cục bộ vào `test-results/ai-summary-flow`. Git hiện không theo dõi tệp nào trong đó và CI không dùng thư mục này. Sau khi được phê duyệt, thêm quy tắc `/test-results/ai-summary-flow/` vào `.gitignore` ở gốc kho mã. Dùng `git check-ignore` để thử quy tắc và xác nhận `docs/evidence` cùng dữ liệu kiểm thử vẫn hiển thị với Git.

## Cần xem xét

| Đường dẫn | Byte | Hạng mục | Bằng chứng và lý do giữ lại để xem xét | Rủi ro có thể phát sinh | Độ tin cậy khi xóa |
| --- | ---: | --- | --- | --- | --- |
| `docs/admin-ui-redesign-plan.md` | 60,268 | Kế hoạch đã triển khai | Có nhật ký thực hiện P1–P6. Cả `docs/evidence/TF117-admin-ui-redesign.md` và `docs/evidence/admin-ui-redesign.md` đều dẫn tới tệp. Cần hỏi người phụ trách xem bản tóm lược có giữ đủ thông tin mà hai báo cáo cần hay không. | Gãy liên kết tới quyết định thiết kế hoặc mất lịch sử nghiệm thu. | Thấp |
| `docs/evidence/hero-left-card-20261112/desktop.png` | 133,896 | Ảnh minh chứng | Thêm tại `1f8e446a`. Không thấy tham chiếu văn bản đến thư mục trong phần được Git theo dõi của cả ba kho mã. | PR hoặc đầu việc ngoài cây mã nguồn có thể dẫn đến ảnh. | Trung bình |
| `docs/evidence/hero-left-card-20261112/mobile.png` | 47,851 | Ảnh minh chứng | Cùng bộ ảnh, kết quả tìm kiếm tương tự. | Mất ảnh mobile của lần chỉnh sửa đó. | Trung bình |
| `docs/evidence/layered-hero-rive-search-20261112/desktop-1440.png` | 166,474 | Ảnh minh chứng | Cùng commit. Không thấy tham chiếu văn bản đến bộ ảnh này trong cây được Git theo dõi. | Liên kết nghiệm thu bên ngoài có thể trỏ đến ảnh desktop. | Trung bình |
| `docs/evidence/layered-hero-rive-search-20261112/mobile-390.png` | 50,076 | Ảnh minh chứng | Cùng bộ ảnh, kết quả tìm kiếm tương tự. | Có thể có liên kết nghiệm thu mobile bên ngoài. | Trung bình |
| `docs/evidence/layered-hero-rive-search-20261112/tablet-768.png` | 102,885 | Ảnh minh chứng | Cùng bộ ảnh, kết quả tìm kiếm tương tự. | Mất ảnh so sánh ở kích thước tablet. | Trung bình |
| `docs/evidence/layered-hero-slogan-unclipped-20261112/desktop-1920.png` | 213,319 | Ảnh minh chứng | Cùng commit. Không thấy tham chiếu văn bản đến bộ ảnh này trong cây được Git theo dõi. | Có thể có liên kết nghiệm thu bên ngoài. | Trung bình |
| `docs/evidence/layered-hero-slogan-unclipped-20261112/mobile-390.png` | 50,085 | Ảnh minh chứng | Cùng bộ ảnh, kết quả tìm kiếm tương tự. | Mất ảnh so sánh bố cục mobile sau khi xử lý phần bị cắt. | Trung bình |
| `docs/evidence/layered-hero-soft-scrim-20261112/mobile-390.png` | 49,976 | Ảnh minh chứng | Cùng commit. Không thấy tham chiếu văn bản đến bộ ảnh này trong cây được Git theo dõi. | Có thể có liên kết nghiệm thu bên ngoài. | Trung bình |
| `docs/evidence/layered-hero-soft-scrim-20261112/wide-1920.png` | 206,128 | Ảnh minh chứng | Cùng bộ ảnh, kết quả tìm kiếm tương tự. | Mất ảnh so sánh lớp phủ trên màn hình rộng. | Trung bình |

Giữ các ảnh trên cho đến khi đối chiếu PR và hồ sơ đầu việc liên quan. README của bộ ảnh đã dẫn trực tiếp đến các bản gốc, logo, hiệu ứng mặt nước và bố cục khẩu hiệu cùng linh vật. Quy trình lưu minh chứng áp dụng cho những ghi chú và báo cáo đầu việc khác, đặc biệt là hồ sơ kiểm duyệt, truy cập, bảo mật, triển khai và phát hành.

## Phải giữ và kết quả rà soát phụ thuộc

- 376 đường dẫn ảnh, phông chữ và tệp đa phương tiện đã kiểm kê chiếm 339.450.849 byte. Mã băm nội dung cho thấy có 128 bản sao sau khi giữ một bản trong mỗi nhóm, tổng cộng 167.016.851 byte. Phần lớn là tài nguyên linh vật có mặt trong nhiều ứng dụng. Admin và web phục vụ URL công khai riêng, còn Expo đóng gói tài nguyên riêng. Các bản sao logo hãng bay cho web và mobile cũng dùng đường dẫn tra cứu và cách đóng gói riêng. Giữ tài nguyên thương hiệu chính thức, nguồn thiết kế, tài nguyên công khai và đầu ra dùng trong ứng dụng.
- Giữ định tuyến theo tệp và tài nguyên metadata của Next.js, tuyến Expo và bảng tra tài nguyên lúc chạy, đầu ra Orval đã đưa vào Git, danh mục workspace và phiên bản Node/pnpm cố định, dữ liệu kiểm thử, cấu hình Docker/EAS và toàn bộ workflow. Hai tệp `AGENTS.md` do Next.js sinh cần có trong thư mục của từng ứng dụng.
- Đã đối chiếu tên phụ thuộc trong manifest với mã nguồn và công cụ, có tính đến lệnh thực thi, plugin của framework, cấu hình và import được sinh tự động. Chưa có đủ bằng chứng để bỏ phụ thuộc trực tiếp hoặc script. Giữ các manifest và lockfile.
- Không thấy tệp được Git theo dõi trong các thư mục phụ thuộc, build, bộ nhớ đệm, độ bao phủ kiểm thử hoặc báo cáo kiểm thử phổ biến đã rà soát. Tệp cục bộ chưa được theo dõi hoặc đã bị bỏ qua nằm ngoài phạm vi dọn dẹp.

## Xác minh sau khi được phê duyệt

1. Cài phụ thuộc với lockfile cố định rồi chạy `pnpm check` và `pnpm build` để lấy mốc. Chạy lại sau khi xóa nhóm mã đề xuất và so sánh lỗi với mốc ban đầu.
2. So sánh danh sách tuyến trước và sau. Chạy thử đăng nhập quản trị, khám phá và chi tiết chuyến đi trên web, cùng các luồng tài khoản, mục đã lưu, hộp thư, khám phá, chi tiết khách sạn và hành trình, trợ lý, thanh toán, bảng tin và tạo bản nháp trên mobile. Dùng môi trường cục bộ với dữ liệu kiểm thử. Chạy Expo export hoặc kiểm tra gói tương đương để xác minh nhận diện tuyến và tài nguyên được đóng gói.
3. Chạy các script xác minh trình duyệt và mobile hiện có phù hợp với dữ liệu kiểm thử. Đối chiếu đường dẫn tài nguyên công khai và tài nguyên được đóng gói, xác nhận các tệp thương hiệu còn nguyên, kiểm tra quy tắc bỏ qua mới và rà soát Git diff.
4. Ghi số byte thực tế đã xóa và tổng dung lượng còn được Git theo dõi trong `docs/maintenance/REPOSITORY_CLEANUP_REPORT.md`. Ghi riêng dung lượng đối tượng Git, phụ thuộc đã cài và đầu ra build.

**Chờ phê duyệt.** Kế hoạch này là thay đổi duy nhất trong bản làm việc. Việc dọn dẹp, kiểm thử và build sẽ thực hiện sau khi được phê duyệt.

## Kiểm kê tài liệu và minh chứng

Kiểm kê 382 đường dẫn được Git theo dõi tại mốc đối chiếu, gồm các tệp trong `docs/` và tệp Markdown ở những thư mục khác. Minh chứng đầu việc được giữ theo quy định của kho mã. Các dòng cần xem xét phải được người phụ trách xác nhận hoặc có quyết định về lưu trữ trước khi xóa.

<details>
<summary>Phân loại từng tệp</summary>

| Đường dẫn | Byte | Phân loại | Căn cứ |
| --- | ---: | --- | --- |
| `.github/pull_request_template.md` | 341 | PHẢI GIỮ | Hướng dẫn cài đặt, quy định kho mã hoặc tài liệu tham chiếu triển khai |
| `ARCHITECTURE.md` | 2,207 | PHẢI GIỮ | Hướng dẫn cài đặt, quy định kho mã hoặc tài liệu tham chiếu triển khai |
| `CLAUDE.md` | 10 | PHẢI GIỮ | Hướng dẫn cài đặt, quy định kho mã hoặc tài liệu tham chiếu triển khai |
| `README.md` | 4,727 | PHẢI GIỮ | Hướng dẫn cài đặt, quy định kho mã hoặc tài liệu tham chiếu triển khai |
| `RULES.md` | 16,777 | PHẢI GIỮ | Hướng dẫn cài đặt, quy định kho mã hoặc tài liệu tham chiếu triển khai |
| `apps/admin/AGENTS.md` | 679 | PHẢI GIỮ | Hướng dẫn cài đặt, quy định kho mã hoặc tài liệu tham chiếu triển khai |
| `apps/admin/public/brand/README.md` | 449 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `apps/admin/public/brand/tripi-library/README.md` | 4,958 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `apps/admin/src/features/README.md` | 638 | PHẢI GIỮ | Hướng dẫn cài đặt, quy định kho mã hoặc tài liệu tham chiếu triển khai |
| `apps/mobile/README.md` | 5,007 | PHẢI GIỮ | Hướng dẫn cài đặt, quy định kho mã hoặc tài liệu tham chiếu triển khai |
| `apps/mobile/assets/brand/README.md` | 1,317 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `apps/mobile/assets/brand/tripi-library/README.md` | 4,958 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `apps/mobile/src/features/README.md` | 675 | PHẢI GIỮ | Hướng dẫn cài đặt, quy định kho mã hoặc tài liệu tham chiếu triển khai |
| `apps/mobile/src/lib/README.md` | 397 | PHẢI GIỮ | Hướng dẫn cài đặt, quy định kho mã hoặc tài liệu tham chiếu triển khai |
| `apps/web/AGENTS.md` | 679 | PHẢI GIỮ | Hướng dẫn cài đặt, quy định kho mã hoặc tài liệu tham chiếu triển khai |
| `apps/web/public/brand/README.md` | 1,258 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `apps/web/public/brand/tripi-library/README.md` | 4,958 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `apps/web/src/features/README.md` | 563 | PHẢI GIỮ | Hướng dẫn cài đặt, quy định kho mã hoặc tài liệu tham chiếu triển khai |
| `design/tripi-rive/README.md` | 956 | PHẢI GIỮ | Hướng dẫn cài đặt, quy định kho mã hoặc tài liệu tham chiếu triển khai |
| `docs/admin-ui-redesign-plan.md` | 60,268 | CẦN XEM XÉT | Xem phần đánh giá từng tệp ở trên |
| `docs/architecture/06-kien-truc-lop.drawio` | 33,556 | PHẢI GIỮ | Kiến trúc hoặc lịch sử thiết kế |
| `docs/architecture/06-kien-truc-lop.png` | 521,413 | PHẢI GIỮ | Kiến trúc hoặc lịch sử thiết kế |
| `docs/architecture/06-kien-truc-tong-quan.drawio` | 39,570 | PHẢI GIỮ | Kiến trúc hoặc lịch sử thiết kế |
| `docs/architecture/06-kien-truc-tong-quan.png` | 549,765 | PHẢI GIỮ | Kiến trúc hoặc lịch sử thiết kế |
| `docs/architecture/10-de-xuat-kien-truc-va-repo.md` | 44,206 | PHẢI GIỮ | Kiến trúc hoặc lịch sử thiết kế |
| `docs/architecture/11-de-xuat-cau-truc-repo.md` | 45,977 | PHẢI GIỮ | Kiến trúc hoặc lịch sử thiết kế |
| `docs/architecture/README.md` | 875 | PHẢI GIỮ | Kiến trúc hoặc lịch sử thiết kế |
| `docs/design/layered-hero/README.md` | 5,731 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/design/layered-hero/source/boat-wake.png` | 1,102,037 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/design/layered-hero/source/destinations-atlas.png` | 3,418,458 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/design/layered-hero/source/ha-long-clean.png` | 1,976,020 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/design/layered-hero/source/letter-contact-foam.png` | 766,941 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/evidence/2026-11-18-held-creator-controls.md` | 4,375 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/2026-11-18-post-options-menu.md` | 2,592 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/2026-11-19-be09-video-desktop.png` | 206,445 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/2026-11-19-be09-video-frames.md` | 1,281 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/2026-11-19-be09-video-mobile.png` | 80,071 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-128-tripi-booking-context-qa.json` | 2,469 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-128-tripi-booking-context.md` | 7,264 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-129-protect-post-draft-qa.json` | 872 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-129-protect-post-draft.md` | 8,358 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-131-trip-cards-qa.json` | 714 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-131-trip-cards.md` | 5,337 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-142-gallery-states-qa.json` | 814 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-142-gallery-states.md` | 5,524 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-143-checkout-ui-qa.json` | 816 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-143-checkout-ui.md` | 6,758 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-143-checkout-visual-qa.json` | 815 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-143-checkout-visual.md` | 3,962 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-144-checkout-guests-qa.json` | 983 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-144-checkout-guests.md` | 5,268 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-145-trip-status-qa.json` | 1,522 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-145-trip-status.md` | 7,032 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-156-profile-ui-qa.json` | 1,385 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-156-profile-ui.md` | 6,303 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-159-account-qa.json` | 987 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-159-onboarding-regression.json` | 716 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-159-onboarding-sau-dang-ky.md` | 3,223 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-159-onboarding-theo-ho-so.md` | 3,436 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-159-signup-qa.json` | 594 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-160-onboarding-web.md` | 8,227 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-167-thiet-ke-lai-chat-tripi.md` | 4,512 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-168-account-regression-qa.json` | 988 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-168-auth-ui-qa.json` | 1,096 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-168-auth-ui.md` | 7,552 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-169-hotel-hero-qa.json` | 732 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-169-hotel-hero.md` | 5,717 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-170-rooms-cart-qa.json` | 659 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-170-rooms-cart.md` | 5,907 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-177-179-hanh-vi-nguoi-dung-va-chi-phi-ai.md` | 4,514 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/SCRUM-181-tong-quan-va-ho-so-nguoi-dung.md` | 5,906 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF-anh-bia-reels-tim-kiem.md` | 1,214 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF-binh-luan-co-dinh.md` | 6,183 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF-binh-luan-go-muot.md` | 6,052 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF-lich-trinh-co-dinh.md` | 7,741 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF-lich-trinh-trong.md` | 3,630 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF-nut-tab-dong-bo.md` | 9,259 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF-reels-khung-cho.md` | 2,918 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF-session-giu-cache.md` | 6,339 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF-sheet-tren-thanh-day.md` | 1,362 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF-tag-nguoi-dung-debounce.md` | 6,175 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF-tooltip-tripi.md` | 1,536 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF-tripi-chat-gon.md` | 2,630 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF-xem-anh-zoom-toan-man.md` | 3,684 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF056-ma-hoa-mat-khau.md` | 3,662 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF056-rang-buoc-refresh.md` | 859 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF056-thong-bao-va-tai-truoc-dang-nhap.md` | 1,441 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF059-chinh-sach-bao-mat.md` | 2,455 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF05D-xac-thuc-email.md` | 6,771 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF05G-chan-chua-dang-nhap-gio-hang.md` | 1,987 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF05G-ma-xac-thuc-dang-nhap.md` | 1,922 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF05H-dang-nhap-google-mobile.md` | 3,117 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF05I-admin-dung-chung-phien-web.md` | 4,228 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF06A-web-dang-nhap.md` | 6,329 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF06D-trang-tai-khoan.md` | 4,394 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF06E-dashboard-theo-vai-tro.md` | 7,853 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF06F-tai-khoan-chua-dang-nhap.md` | 4,531 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF06G-thu-gon-thiet-bi.md` | 3,598 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF06H-header-tai-khoan.md` | 5,395 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF06J-trang-bai-viet.md` | 7,510 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF06K-thanh-tim-kiem.md` | 5,850 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF06L-tong-mau-xanh.md` | 3,382 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF06M-ho-so-ca-nhan.md` | 8,313 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF06N-admin-chi-tiet-bai.md` | 6,513 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF06O-trang-dang-nhap-dang-ky.md` | 6,033 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF08-reels-iphone-feedback.md` | 4,762 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF08-trinh-phat-reels.md` | 11,381 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF10-anh-khach-san-ota.md` | 2,040 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF10-animation-ui-trang-chu.md` | 5,306 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF10-lo-trinh-dat-ngay.md` | 2,937 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF10-mobile-reel-ux.md` | 5,987 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF10-reel-ti-le-tiktok.md` | 2,809 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF10-sua-giat-dai-phong.md` | 2,934 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF10-web-hotel-detail.md` | 7,313 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF100-admin-redesign.md` | 7,197 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF100-nhan-admin-du-chuyen-khoan.md` | 2,550 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF101-giam-tai-binh-luan-realtime.md` | 4,186 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF101-mobile-binh-luan-realtime.md` | 3,513 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF101-web-binh-luan-realtime.md` | 3,355 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF103-fe-admin-job-chu-ky-va-tu-vung.md` | 3,423 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF104-bo-sung-admin.md` | 3,874 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF105-lo-trinh-khi-dang-bai.md` | 4,350 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF106-so-thich-du-lich-ho-so.md` | 4,497 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF108-reels-bo-trung-bai-va-lam-moi-goi-y.md` | 2,793 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF109-anh-dai-dien.md` | 2,361 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF109-cai-tien-avatar-sticker.md` | 4,384 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF11-giao-dien-trang-tim-kiem.md` | 6,451 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF11-hero-va-the-phong.md` | 3,590 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF11-o-chon-va-lich-mem.md` | 3,628 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF11-tab-tim-kiem-web.md` | 3,630 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF11-the-mem-va-kinh.md` | 2,935 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF11-tim-nguoi-dung-web.md` | 3,918 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF11-tinh-chinh-giao-dien-web.md` | 4,570 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF11-web-tim-bai-qua-discovery.md` | 3,810 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF11-web-tim-kham-pha.md` | 3,286 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF110-giao-dien-kiem-duyet.md` | 2,707 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF112-seo-web.md` | 9,933 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF113-ho-so-prefetch.md` | 3,841 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF113-lo-trinh-prefetch.md` | 4,248 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF117-admin-ui-redesign.md` | 2,037 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF12-anh-goi-y-trang-chu.md` | 2,359 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF12-web-goi-y-trang-chu.md` | 3,117 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF14-canh-bao-an-toan.md` | 1,726 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF14-giao-dien-tom-tat-ai.md` | 4,622 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF22-reels-tabs.md` | 3,848 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF23-reels-chong-lap.md` | 5,133 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF23-su-kien-xem-reels.md` | 3,355 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF24-dang-video-mobile.md` | 3,975 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-anh-bai-viet.md` | 5,024 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-cam-hung-tran-duoi.md` | 2,723 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-chia-se-bai-reels.md` | 5,038 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-dong-bo-reels-tu-tim-kiem.md` | 1,756 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-giao-dien-feed-cam-hung.md` | 5,356 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-giu-trang-thai-tim-feed-goi-y.md` | 2,040 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-hoan-thien-tab-cam-hung.md` | 2,586 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-lam-gon-ui-cam-hung.md` | 7,973 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-mo-bai-tu-trang-chu.md` | 5,954 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-mo-reels-tu-tim-kiem.md` | 6,046 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-mobile-reply-quote-review.md` | 1,994 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-noindex-ho-so-trong.md` | 3,072 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-nut-dang-bai-giua-dock.md` | 1,916 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-reels-bat-tieng-khong-tua.md` | 1,937 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-reels-chong-spam-react.md` | 6,087 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-reels-giam-ve-lai.md` | 5,986 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-reels-giu-2-bai-phia-sau.md` | 2,850 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-reels-sua-bai-san-sang.md` | 3,246 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-reels-tai-truoc-n-2-va-720p.md` | 5,278 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-reels-tua-video.md` | 2,981 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-reels-web-giam-lag.md` | 4,321 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-reels-web-khung-rong.md` | 5,247 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-reels-xin-lai-cookie.md` | 2,177 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-seo-ho-so-reels.md` | 2,515 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-sua-tran-trich-dan.md` | 2,955 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-tach-reels-va-bai-viet.md` | 3,602 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-tag-nguoi-dung-web.md` | 9,837 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-ten-tac-gia-bai-viet-web-mobile.md` | 3,130 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-ten-tac-gia-binh-luan.md` | 1,711 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-thoi-gian-tuong-doi.md` | 5,435 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-tim-kiem-grid-web.md` | 5,170 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-toi-uu-trai-nghiem-feed-cam-hung.md` | 5,127 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-tra-loi-trich-dan-web.md` | 4,217 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-trang-chi-tiet-lo-trinh.md` | 6,533 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-vien-the-bai-viet.md` | 7,372 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF25-xem-anh-tren-header.md` | 4,422 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF27-tim-bai-dang-mobile.md` | 4,432 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF28-cam-hung-goi-y-bai.md` | 4,921 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF29-dat-theo-lo-trinh-linh-hoat.md` | 14,965 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF29-giao-dien-tim-chuyen-bay.md` | 5,588 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF29-kiem-tra-dong-bo-nhanh.md` | 3,956 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF29-logo-hang-va-ve-rang-cua.md` | 2,499 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF29-noi-commerce-mobile.md` | 13,152 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF29-tre-em-em-be.md` | 4,398 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF29-ve-khu-hoi.md` | 4,603 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF31-cam-hung-tripi-header.md` | 4,714 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF31-chat-tripi-mobile.md` | 9,377 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF31-giu-the-khi-mo-lai.md` | 3,297 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF31-hien-tung-tu-tripi-web.md` | 1,577 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF31-mascot-rive.md` | 2,761 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF31-ngu-canh-rong.md` | 1,802 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF31-noi-chat-tripi-mobile.md` | 3,023 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF31-nut-dat-cho.md` | 5,717 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF31-the-chuyen-bay.md` | 2,241 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF31-the-giai-doan-b.md` | 4,191 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF31-thu-gon-the-tripi-web.md` | 1,599 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF31-tom-tat-204.md` | 1,526 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF31-tripi-v3-mobile-fix.md` | 3,622 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF31-tripi-v3-mobile.md` | 4,842 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF32-be09-dot1-20261119.md` | 2,159 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF32-be10-admin-phan-cong-sla.md` | 6,287 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF32-creator-controls-fe.md` | 1,314 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF32-hang-cho-kiem-duyet.md` | 6,069 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF33-web-post-404-cache.md` | 2,688 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF43-man-don-hang-admin.md` | 2,197 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF44-ai-summary-chi-reel.md` | 3,769 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF44-tom-tat-ai-binh-luan-reels-web.md` | 3,349 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF46-nut-theo-doi.md` | 1,121 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF46-thong-bao-web-va-tab.md` | 12,873 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF46D-lien-ket-binh-luan.md` | 1,486 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF46D-tra-loi-trong-luong.md` | 1,120 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF46E-thong-bao-binh-luan-mobile.md` | 3,434 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF46F-huy-hieu-va-trang-thong-bao.md` | 3,086 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF46G-giao-dien-bang-thong-bao.md` | 2,697 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF47-trang-ca-nhan-cong-khai.md` | 3,193 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF47-wall-trang-ca-nhan.md` | 3,463 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF47B-tab-toi-la-trang-ca-nhan.md` | 2,112 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF48-trang-chu-mobile-theo-web.md` | 2,451 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF64-hls-js.md` | 4,054 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF64-security-headers-robots.md` | 2,858 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF68-sua-ci-cd.md` | 2,203 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF69-checkout-loi-tung-o.md` | 3,759 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF72-tat-prefetch-link.md` | 2,320 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF73-search-khong-goi-rsc.md` | 6,487 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF82-app-xin-lai-cookie.md` | 2,584 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF82-cookie-video.md` | 4,327 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF84-dung-xoay-bo-refetch.md` | 4,344 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF86-toi-uu-tai-trang-chu.md` | 6,052 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF89-kpi-kiem-duyet-admin.md` | 4,175 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF91-admin-noi-dung-held.md` | 1,722 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF92-duyet-binh-luan-fe.md` | 4,708 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF95-admin-chi-phi-ai.md` | 4,264 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF98-responsive-desktop.md` | 6,792 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF98-web-mobile-header.md` | 5,815 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF98-web-mobile-tab-bar.md` | 7,855 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TF99-web-cache-binh-luan.md` | 4,812 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TFxx-an-preflight-traces.md` | 1,971 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TFxx-bo-trang-bai-cu.md` | 3,105 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TFxx-menu-trang-ca-nhan.md` | 2,339 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TFxx-nen-tinh-trang-cam-hung.md` | 2,300 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/TFxx-sap-xep-menu-cai-dat.md` | 1,725 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/admin-ui-redesign.md` | 6,947 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/analytics-observability.md` | 4,397 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/api-integration.md` | 9,587 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/floating-navigation.md` | 5,152 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/hero-left-card-20261112/desktop.png` | 133,896 | CẦN XEM XÉT | Xem phần đánh giá từng tệp ở trên |
| `docs/evidence/hero-left-card-20261112/mobile.png` | 47,851 | CẦN XEM XÉT | Xem phần đánh giá từng tệp ở trên |
| `docs/evidence/layered-hero-20261111/desktop-1440.png` | 211,947 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/layered-hero-20261111/mobile-390.png` | 49,910 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/layered-hero-logo-20261111/desktop-1440.png` | 198,987 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/layered-hero-logo-20261111/mobile-390.png` | 47,082 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/layered-hero-rive-search-20261112/desktop-1440.png` | 166,474 | CẦN XEM XÉT | Xem phần đánh giá từng tệp ở trên |
| `docs/evidence/layered-hero-rive-search-20261112/mobile-390.png` | 50,076 | CẦN XEM XÉT | Xem phần đánh giá từng tệp ở trên |
| `docs/evidence/layered-hero-rive-search-20261112/tablet-768.png` | 102,885 | CẦN XEM XÉT | Xem phần đánh giá từng tệp ở trên |
| `docs/evidence/layered-hero-slogan-mascot-20261112/desktop-1440.png` | 173,818 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/layered-hero-slogan-mascot-20261112/mobile-320.png` | 46,437 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/layered-hero-slogan-mascot-20261112/mobile-390.png` | 53,958 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/layered-hero-slogan-mascot-20261112/tablet-768.png` | 99,444 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/layered-hero-slogan-unclipped-20261112/desktop-1920.png` | 213,319 | CẦN XEM XÉT | Xem phần đánh giá từng tệp ở trên |
| `docs/evidence/layered-hero-slogan-unclipped-20261112/mobile-390.png` | 50,085 | CẦN XEM XÉT | Xem phần đánh giá từng tệp ở trên |
| `docs/evidence/layered-hero-soft-scrim-20261112/mobile-390.png` | 49,976 | CẦN XEM XÉT | Xem phần đánh giá từng tệp ở trên |
| `docs/evidence/layered-hero-soft-scrim-20261112/wide-1920.png` | 206,128 | CẦN XEM XÉT | Xem phần đánh giá từng tệp ở trên |
| `docs/evidence/layered-hero-soft-water-20261111/desktop-1440.png` | 207,263 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/layered-hero-soft-water-20261111/mobile-390.png` | 48,926 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/mentor-demo-ui.md` | 10,584 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/mobile-explore/README.md` | 2,809 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/mobile-explore/after-375.png` | 139,783 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/mobile-explore/after-390.png` | 234,514 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/mobile-explore/after-430.png` | 260,945 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/mobile-explore/before-375.png` | 134,462 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/mobile-explore/before-390.png` | 221,950 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/mobile-explore/before-430.png` | 239,200 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/mobile-explore/empty-390.png` | 233,024 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/mobile-explore/error-390.png` | 234,436 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/mobile-explore/explore-before-after.png` | 270,187 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/mobile-explore/loading-390.png` | 215,783 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/mobile-explore/qa-results.json` | 850 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/mobile-explore/stays-long-name-390.png` | 170,298 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/mobile-onboarding/README.md` | 1,594 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/mobile-onboarding/onboarding-flow.png` | 542,773 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/mobile-onboarding/qa-results.json` | 715 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/mobile-reel-overlay/reel-390.jpg` | 80,028 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/mobile-reel-startup/tripflix-launch.png` | 9,419 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/mobile-ui-parity.md` | 2,057 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/mobile-ui-review.md` | 7,660 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/ota-search-redesign/filters-1280.png` | 736,434 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/ota-search-redesign/filters-390.png` | 122,283 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/ota-search-redesign/homepage-1440.png` | 781,031 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/ota-search-redesign/homepage-390.png` | 696,896 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/ota-search-redesign/verification.json` | 2,610 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/reels-iphone-feedback.md` | 3,935 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/reels-iphone-feedback/01-collapsed.png` | 34,083 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/reels-iphone-feedback/02-expanded.png` | 51,241 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/reels-iphone-feedback/03-comments.png` | 39,177 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/reels-iphone-feedback/verification.json` | 584 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/evidence/search-monitoring-20261111.md` | 9,108 | PHẢI GIỮ | Minh chứng đầu việc, nghiệm thu hoặc kiểm thử hồi quy |
| `docs/mascot/generated-2026-11-10/README.md` | 1,430 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/index.html` | 9,013 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/prompts.json` | 9,309 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/qa-report.json` | 7,974 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/action-book.png` | 1,360,313 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/action-depart.png` | 1,325,005 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/action-explore.png` | 1,268,934 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/action-plan.png` | 1,519,834 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/action-share.png` | 1,340,360 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/action-vacation.png` | 1,450,053 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/action-vlog.png` | 1,301,457 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/expr-angry.png` | 1,946,892 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/expr-cheer.png` | 1,412,709 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/expr-confident.png` | 1,060,700 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/expr-cry-soft.png` | 1,956,825 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/expr-cry.png` | 1,969,498 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/expr-curious.png` | 1,260,514 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/expr-effort.png` | 1,460,900 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/expr-excited.png` | 1,377,171 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/expr-furious.png` | 1,841,202 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/expr-gloomy.png` | 1,553,818 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/expr-happy.png` | 1,395,141 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/expr-laugh.png` | 1,869,267 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/expr-love.png` | 1,932,126 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/expr-peace.png` | 1,964,833 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/expr-proud.png` | 1,769,921 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/expr-relaxed.png` | 1,186,173 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/expr-sad.png` | 1,763,060 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/expr-shy.png` | 2,065,309 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/expr-sleepy.png` | 1,853,823 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/expr-sorry.png` | 1,635,544 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/expr-surprised.png` | 1,489,429 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/expr-thinking.png` | 1,648,307 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/expr-wink.png` | 1,868,290 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/hero-welcome.png` | 1,589,295 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/portrait-profile.png` | 1,531,596 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/pose-thumbs-up.png` | 1,556,292 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/pose-wave.png` | 1,537,933 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/ui-searching.png` | 1,242,348 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/stickers/ui-success.png` | 1,391,181 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/tripi-rig/rig-arm-thumbs.png` | 1,446,399 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/tripi-rig/rig-arm-wave-tilt.png` | 1,412,821 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/tripi-rig/rig-arm-wave-up.png` | 1,466,586 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/tripi-rig/rig-base.png` | 1,557,632 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/tripi-rig/rig-body-no-arms.png` | 1,415,971 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/tripi-rig/rig-eyes-angry.png` | 1,461,581 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/tripi-rig/rig-eyes-closed.png` | 1,451,116 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/tripi-rig/rig-eyes-cry.png` | 1,445,794 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/tripi-rig/rig-eyes-gloomy.png` | 1,446,019 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/tripi-rig/rig-eyes-happy.png` | 1,438,479 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/tripi-rig/rig-eyes-heart.png` | 1,452,218 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/tripi-rig/rig-eyes-sad.png` | 1,445,161 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/tripi-rig/rig-eyes-sleepy.png` | 1,434,338 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/tripi-rig/rig-eyes-surprised.png` | 1,415,485 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/tripi-rig/rig-eyes-teary.png` | 1,439,561 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/tripi-rig/rig-eyes-up.png` | 1,440,628 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/tripi-rig/rig-eyes-wink.png` | 1,433,868 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/tripi-rig/rig-face-blank.png` | 1,447,424 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/tripi-rig/rig-mouth-flat.png` | 1,407,940 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/tripi-rig/rig-mouth-grin.png` | 1,472,960 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/tripi-rig/rig-mouth-laugh.png` | 1,453,547 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/tripi-rig/rig-mouth-o.png` | 1,438,954 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/tripi-rig/rig-mouth-pout.png` | 1,457,853 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/tripi-rig/rig-mouth-sad.png` | 1,432,058 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/tripi-rig/rig-mouth-shout.png` | 1,450,677 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/mascot/generated-2026-11-10/tripi-rig/rig-mouth-wail.png` | 1,481,178 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `docs/moderation/01-bao-cao-doi-chieu-tiktok.md` | 13,069 | PHẢI GIỮ | Hồ sơ triển khai hoặc nghiệm thu kiểm duyệt |
| `docs/moderation/02-ke-hoach-trien-khai-fe-be.md` | 26,535 | PHẢI GIỮ | Hồ sơ triển khai hoặc nghiệm thu kiểm duyệt |
| `docs/moderation/03-ket-qua-kiem-tra-p0-20261113.md` | 6,433 | PHẢI GIỮ | Hồ sơ triển khai hoặc nghiệm thu kiểm duyệt |
| `docs/moderation/04-nghiem-thu-p0-20261113.md` | 12,975 | PHẢI GIỮ | Hồ sơ triển khai hoặc nghiệm thu kiểm duyệt |
| `docs/tripi-library.md` | 2,673 | PHẢI GIỮ | Tài liệu thương hiệu, thiết kế hoặc quy trình dựng tài nguyên |
| `packages/api-client/README.md` | 2,533 | PHẢI GIỮ | Hướng dẫn cài đặt, quy định kho mã hoặc tài liệu tham chiếu triển khai |
| `packages/app-core/README.md` | 635 | PHẢI GIỮ | Hướng dẫn cài đặt, quy định kho mã hoặc tài liệu tham chiếu triển khai |
| `packages/config/README.md` | 526 | PHẢI GIỮ | Hướng dẫn cài đặt, quy định kho mã hoặc tài liệu tham chiếu triển khai |
| `packages/i18n/README.md` | 414 | PHẢI GIỮ | Hướng dẫn cài đặt, quy định kho mã hoặc tài liệu tham chiếu triển khai |
| `packages/tokens/README.md` | 577 | PHẢI GIỮ | Hướng dẫn cài đặt, quy định kho mã hoặc tài liệu tham chiếu triển khai |
| `packages/ui-web/README.md` | 650 | PHẢI GIỮ | Hướng dẫn cài đặt, quy định kho mã hoặc tài liệu tham chiếu triển khai |
| `packages/utils/README.md` | 302 | PHẢI GIỮ | Hướng dẫn cài đặt, quy định kho mã hoặc tài liệu tham chiếu triển khai |

</details>
