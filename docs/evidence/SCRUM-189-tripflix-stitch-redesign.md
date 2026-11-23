# SCRUM-189 — Thiết kế lại giao diện mobile theo Stitch "Original Explorer"

- Jira: SCRUM-189 · Nhánh: `trang/SCRUM-189-tripflix-stitch-redesign` · Người làm: Trang (dùng AI: có) · Ngày: 2026-11-21

## Đã làm

- Bộ token `explorer` (Day/Night, nút chính, khoảng cách, bo góc, kiểu chữ, đổ bóng, chuyển động) trong `packages/tokens`, có test tương phản.
- Chuỗi giao diện mới trong `packages/i18n` (`mobile.explorer.*`).
- Thành phần dùng chung (`mobile-ui.tsx`): nút pill, chip, thẻ, ô nhập, thông báo, huy hiệu, sheet.
- Các màn: Khám phá và kết quả khách sạn, onboarding, Tôi và hồ sơ, Đã lưu, Tạo bài, trợ lý Tripi, Chuyến đi của tôi, lộ trình (xem và đặt), chi tiết khách sạn, phòng, giỏ, checkout, thanh toán thành công, đơn đã huỷ, chi tiết đơn, vé máy bay, tự lên lộ trình, bình luận và menu bài đăng.
- Quét toàn bộ màu cũ (`colors.*`) sang token `explorer` ở `components/` và `features/`, trừ nhóm Reels.
- Nút cam dùng nhãn trắng theo quyết định của chủ sản phẩm (3.1:1, chỉ đạt ngưỡng chữ đậm lớn).
- Phần chưa có API (Limousine, Tour, Thư mục đã lưu, gợi ý caption AI) hiện nhãn "Sắp có", không bấm được.
- Không đổi: màn Reels (`reel-*`, `reels-*`), khung chat Tripi (`assistant-*`, theo yêu cầu chủ sản phẩm), thanh tab, API, logic nghiệp vụ, web, admin, backend.

## Đối chiếu "Xong khi"

| Tiêu chí                         | Đạt      | Bằng chứng                                                                                                                          |
| -------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Giữ logo, mascot Tripi, slogan   | Đạt      | Ảnh onboarding, Khám phá, thanh toán thành công trong báo cáo                                                                       |
| Giữ chức năng và API             | Đạt      | Không sửa `packages/api-client`; typecheck, lint, test pass                                                                         |
| Màu, chữ lấy từ token và i18n    | Đạt      | Chỉ còn `colors.overlay*`/`transparent` (lớp phủ)                                                                                   |
| Reels và thanh tab giữ nguyên    | Đạt      | Màn Reels, overlay, thanh tab không đổi so với HEAD; chỉ `reel-comments.tsx` đổi nút gửi bình luận từ màu đỏ gạch cũ sang nút chính |
| Phần chưa có API ghi rõ "Sắp có" | Đạt      | Khám phá, Đã lưu, Tạo bài                                                                                                           |
| Tương phản                       | Một phần | Token test pass; nút cam chữ trắng 3.1:1 là lựa chọn của chủ sản phẩm                                                               |

## Kết quả kiểm tra

- `pnpm turbo run lint typecheck test`: 26/26 tác vụ thành công; lint chỉ còn cảnh báo cũ.
- `@tripflix/tokens`: 39 test pass. `@tripflix/mobile`: 3 test pass.

## Cách kiểm lại

1. `cd apps/mobile && EXPO_PUBLIC_API_URL=http://localhost:8080 EXPO_PUBLIC_AI_URL=http://localhost:8000 npx expo start --web --port 3100 --clear`
2. Mở `http://localhost:3100` với khung 390px; đăng nhập bằng tài khoản thử.
3. Thanh toán thẻ ở máy local cần `ENABLE_MOCK_PAYMENT=true` trong `tripflix-be/deploy/.env` (không commit).

## Ảnh / video

- Báo cáo trước/sau (21 màn, có ảnh Stitch đối chiếu) đính kèm trong PR; không commit ảnh vào repo.
- Ảnh chụp trên web 390px, chưa có ảnh trên máy Android thật.

## Cập nhật 2026-11-23: merge `origin/develop`

- Merge 64 commit mới của `develop` vào nhánh bằng merge commit `b726d4db` (không rebase). Sau merge nhánh không còn thiếu commit nào của `develop`.
- 7 xung đột sửa/xoá: `placeholder-screen.tsx`, `account-screens.tsx`, `booking-screens.tsx`, `detail-screens.tsx`, `discovery-screens.tsx`, `feed-trip-detail-screen.tsx`, `create-screen.tsx`. `develop` đã xoá các file này trong `2de20206` (dọn mã, Trang); không route hay file nào còn import (route dùng bản `live-*`); nhánh chỉ đổi màu trong đó. Giữ quyết định xoá của `develop`.
- Các phần tự merge (Reels nguồn discovery mixed, Explore, chi tiết bài viết, trợ lý Tripi, `api-client`) không có xung đột.
- Kiểm tra sau merge: `pnpm turbo run lint typecheck test` 26/26 tác vụ thành công, lint 0 lỗi (cảnh báo cũ: mobile 21, web 27); `node tools/check-boundaries.mjs` không vi phạm. Test: mobile 6/6, api-client 330, app-core 262, web 582, admin 106, tokens 39, utils 4, i18n 2, tất cả pass.
- Chạy lại trên web 390px với backend local: Reels (có sheet lộ trình, bình luận, Tripi), Khám phá, Tìm kiếm, Đặt, Tôi, Đã lưu, Chuyến đi của tôi, Thông báo, Tạo bài, Tripi, Vé máy bay, Tự lên lộ trình, Chi tiết khách sạn hiển thị bình thường.
- Lưu ý môi trường: Reels mới gọi `/api/recommendations/reels?mode=mixed` và `/api/v1/feed?tab=hot`; backend local phải ở `develop` mới nhất và đã chạy migration (`trend_scores`), nếu không Reels đứng ở "Đang tải video…".
- Ảnh chụp lưu ngoài repo: `VSF/outputs/scrum189-merge-develop-2026-11-23/`. Vẫn chưa có ảnh trên máy Android thật.

## Ảnh hưởng tới phần của người khác

- Có, đã được người dùng đồng ý trong phiên: một số file dùng chung nằm ở `packages/tokens`, `packages/i18n` (chỉ thêm khoá), `features/feed/` (phần bình luận, menu bài đăng: chỉ đổi màu). Không sửa web, admin, API client hay backend.
- Chưa xử lý, cần báo chủ commerce: app gọi `/api/v1/payments/test-cards` còn BE chỉ có `/api/mock-gateway/test-cards`, Traefik chưa định tuyến `/api/mock-gateway`.
