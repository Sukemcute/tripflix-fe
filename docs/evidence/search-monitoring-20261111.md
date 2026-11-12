# Theo dõi tìm kiếm trong admin — 11/11/2026

Nguồn yêu cầu: người dùng cung cấp `search-ranking-spec.md` của Duy và yêu cầu bổ sung giao diện theo dõi trong admin. Không có mã TF hoặc task Notion đi kèm; không tự tạo mã task. Thay đổi được giữ trong working tree, chưa commit/push/PR.

## Đã làm

- Thêm menu và route `/search-monitor`, cho moderator và superadmin. Thành viên thường không mở được công cụ.
- Bốn phần: thử truy vấn, biểu đồ biến động, sáu ca cần theo dõi từ tài liệu, quy tắc xếp hạng và giới hạn số liệu chỉ mục.
- Gọi hai API hiện có qua api-client: `POST /api/search` và `POST /api/search/posts`.
- Thử vị trí ở tìm khám phá; lọc loại bài và phân trang ở tìm bài. Kiểm tra câu trống/200 ký tự, toạ độ và số mục mỗi trang.
- Hiển thị `understood`, sửa từ, địa điểm, ý muốn, ngân sách, ngày, tên riêng, cụm dính, từ bỏ để tìm gợi ý; giữ nguyên thứ tự vùng và mục của API.
- Phân biệt kết quả khớp và `suggest`; hiện số liệu của phản hồi đang xem, chi tiết từng mục, JSON gốc và tải JSON đối chiếu.
- Phân trang dùng request đã gửi, kể cả khi người dùng đang sửa câu trong form. Lỗi truy vấn có nút thử lại và không trình bày kết quả cũ như kết quả thành công.
- Thu gọn shell trên màn hình nhỏ riêng cho trang mới, hiện tên menu; dùng màu và font sẵn có, không thêm thư viện.

## Kết quả kiểm tra

- `pnpm --filter @tripflix/admin build`: đạt, có route `/search-monitor` trong bản build production.
- `pnpm --filter @tripflix/admin lint` và `typecheck`: đạt. Hai cảnh báo lint ở `staff-management.tsx` đã tồn tại, không thuộc thay đổi này.
- `pnpm --filter @tripflix/i18n lint`, `typecheck`, `test`: đạt; 2 test i18n.
- `node tools/check-boundaries.mjs`: đạt.
- `git diff --check`: đạt.
- `pnpm turbo run lint typecheck test --affected --continue`: lần cuối đạt **21/21 tác vụ**, 14 tác vụ lấy cache. Log: `D:/Sukem/VinUni/VSF/outputs/search-monitoring-20261111-final/affected-checks.log`.
- Playwright trên admin đang chạy tại `http://localhost:3200`: 18 nhóm kiểm tra ở mỗi kích thước 1440×1000 và 390×844, thêm kiểm tra quyền superadmin/member. Không lỗi JavaScript trình duyệt, không tràn ngang toàn trang.
- Các nhóm bao gồm: không tự tìm khi mở trang; validate; request đúng; giữ thứ tự; giá 0; tải JSON; lọc vùng; chạy lại cùng câu; fallback; lọc loại bài; phân trang theo snapshot request; lỗi/thử lại; sáu ca kiểm tra; bảng quy tắc và responsive.
- Hai API tìm kiếm local thật cũng đã được hiển thị trên UI: `vin com` ở khám phá, `vincom đồng khởi` ở tìm bài. Phần xác thực được giả lập trong bài E2E này; API tìm kiếm đọc dữ liệu local thật. Chưa kiểm tra đăng nhập bằng tài khoản thật.

## Cách chạy lại

Chạy admin và API local trước. Dùng runtime Playwright đã cài trên máy, không cần thêm dependency vào repo:

```powershell
$env:PLAYWRIGHT_PACKAGE='D:\Sukem\VinUni\VSF\.tools\tripi-qa\node_modules\playwright'
$env:SEARCH_ADMIN_URL='http://localhost:3200'
$env:SEARCH_EVIDENCE_DIR='D:\Sukem\VinUni\VSF\outputs\search-monitoring-20261111-final'
$env:SEARCH_LIVE_API_URL='http://localhost:8080'
node tests/e2e/admin/search-monitoring.cjs
```

Không đặt `SEARCH_LIVE_API_URL` nếu chỉ muốn chạy bộ fixture xác định. Bộ test không ghi dữ liệu nghiệp vụ.

## Ảnh

Ảnh nằm ngoài repo, không commit ảnh vào Git:

- `D:/Sukem/VinUni/VSF/outputs/search-monitoring-20261111-final/search-1440-query.png`
- `D:/Sukem/VinUni/VSF/outputs/search-monitoring-20261111-final/search-1440-posts.png`
- `D:/Sukem/VinUni/VSF/outputs/search-monitoring-20261111-final/search-1440-cases.png`
- `D:/Sukem/VinUni/VSF/outputs/search-monitoring-20261111-final/search-1440-rules.png`
- Các ảnh tương ứng `search-390-*.png`, cùng ảnh fallback ở cả hai kích thước.
- `search-live-query.png` và `search-live-posts.png`: phản hồi API local thật; phiên đăng nhập trong kiểm tra được giả lập.

## Giới hạn và quan sát

- Không đổi backend, thuật toán xếp hạng, hợp đồng API hoặc database.
- API chưa trả điểm BM25/coverage/quality/rank từng mục; UI không dựng điểm giả và không kết luận chính xác vì sao A đứng trên B.
- Chưa có API cho df/ng/street/brand/tgram, lần dựng chỉ mục, trạng thái worker, lịch sử tìm kiếm, CTR và tỷ lệ không kết quả toàn hệ thống. UI có thông báo rõ và SQL đọc bộ đếm để đối chiếu riêng.
- Các tham số và sáu câu hỏi mở là tham chiếu ngày 11/11/2026, không phải cấu hình live hay lỗi đã xác nhận.
- Dữ liệu local hiện trả `fixed = {"vin":"vinh"}` cho `vin com`, khác ví dụ sau bổ sung từ điển trong tài liệu. Với `vincom đồng khởi`, local đã nhận `dong khoi` trong names/phrases nhưng trả 0 bài. Không tự sửa discovery theo những quan sát này.

## Bổ sung biểu đồ biến động theo yêu cầu tiếp theo

- Tab **Biến động** có ba biểu đồ đường: thời gian phản hồi, tổng kết quả khớp, số cụm được sửa; thêm biểu đồ cột ngang so sánh số kết quả của từng vùng giữa hai mẫu khám phá thành công gần nhất.
- Dữ liệu lấy từ lần gọi API thực sự, không thêm mẫu demo vào sản phẩm. Các biểu đồ chỉ nối mẫu có cùng toàn bộ request: câu tìm, endpoint, vị trí, loại bài, limit và cursor. Có bảng số liệu mẫu để đọc bằng bàn phím hoặc đối chiếu biểu đồ.
- Nút **Lấy mẫu ngay**, bật **Theo dõi mỗi 60 giây** và **Dừng theo dõi**. Polling chỉ chạy khi bật và trang hiện trong trình duyệt; không chạy nền. Chạy truy vấn hoặc chuyển trang kết quả sẽ dừng polling.
- Lần gọi lỗi có điểm đỏ ở thời gian phản hồi; số kết quả/sửa từ để thiếu và ngắt đường tại mẫu lỗi. Phản hồi thành công có 0 kết quả vẫn là mẫu hợp lệ. Tỷ lệ không kết quả chỉ tính trên các phản hồi thành công trong chuỗi mẫu đang xem.
- Giữ tối đa 60 mẫu trong bộ nhớ của trang, xoá khi reload/rời trang. Chưa lưu lịch sử liên phiên hoặc telemetry toàn hệ thống; UI nêu rõ phạm vi này.
- Không thêm dependency. Biểu đồ SVG dùng token màu của dự án và có nhãn truy cập, tooltip cùng bảng dữ liệu.
- Lần kiểm tra mới: `pnpm turbo run lint typecheck test --affected --continue` đạt **21/21 tác vụ**, 13 tác vụ cache. Log: `D:/Sukem/VinUni/VSF/outputs/search-trends-20261111/affected-checks.log`. Build production admin, lint admin, kiểm tra boundaries và diff whitespace đều đạt.
- E2E bổ sung **14 nhóm kiểm tra biểu đồ** ở cả 1440×1000 và 390×844: trạng thái trống, một điểm, thay đổi theo vùng, ngắt đường ở lỗi, giá trị 0, tỷ lệ không kết quả, bảng mẫu, polling 60 giây, dừng polling, tách endpoint, reset khi reload, không tràn ngang, SVG hữu hạn và không lỗi JavaScript. Các kiểm tra giao diện cũ và quyền truy cập vẫn đạt.
- Có ảnh `search-1440-trends.png`, `search-390-trends.png` ở `D:/Sukem/VinUni/VSF/outputs/search-trends-20261111/`. Ảnh `search-live-trends.png` dùng ba phản hồi liên tiếp từ API khám phá local thật; phần xác thực của bài E2E vẫn được giả lập.
- Đã cập nhật đúng thư mục feature và nội dung tiếng Việt trong container admin đang chạy ở cổng 3200, giữ nguyên shell/menu runtime khác với checkout.

## Phạm vi và runtime local

- Các điểm nối sửa trong `apps/admin` thuộc khu vực FE của Thành; chủ phần phân tích theo yêu cầu là Trang. Đã thông báo phạm vi và ảnh hưởng trong chat.
- Nội dung mới nằm trong `packages/i18n`; gọi API sinh sẵn, không sửa tay code sinh.
- Không chỉnh các file `apps/web` đang được sửa song song, không thay đổi Git staging của người dùng.
- Đã bổ sung các file mới vào container admin local và khởi động lại riêng `tripflix-admin-1`. Shell/menu của container có chỉnh sửa khác source checkout: chỉ thêm điểm nối mới vào runtime, giữ các chỉnh sửa runtime đó. Trang trả HTTP 200 ở cổng 3200 và đã được kiểm tra lại bằng Playwright.
- Dừng server kiểm tra tạm ở cổng 3201; admin local cổng 3200 tiếp tục chạy. Không triển khai lên staging/production.
