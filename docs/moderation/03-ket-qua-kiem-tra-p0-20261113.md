# Kết quả kiểm tra P0 — 13/11/2026

**Bản ghi lịch sử:** các phần thiếu được xử lý tiếp trong [báo cáo nghiệm thu cập nhật](04-nghiem-thu-p0-20261113.md).

Nhánh BE/FE: `feature/moderation-lifecycle`. Các thay đổi đang ở working tree, chưa commit/deploy. Báo cáo này ghi kết quả đã chạy và phần còn thiếu; **chưa nghiệm thu toàn bộ P0** theo kế hoạch gốc.

## 1. Đã kiểm tra và sửa trong đợt này

- Gỡ bình luận gốc không ghi đè lệnh ẩn độc lập của phản hồi. Khi khôi phục gốc, phản hồi bị xử lý riêng vẫn ẩn, counter đúng.
- Sự kiện `content.comment.hidden` thu hồi thông báo tương tác qua repository hiện có. Repository giữ tombstone nên sự kiện tạo đến muộn không tạo lại thông báo cho bình luận đó. Thông báo cũ không được tự phát lại khi restore.
- BE trả `canAppeal` cho lịch sử quyết định. Web/Mobile dùng trường này để ẩn nút khi quyết định cũ, nội dung đã thay đổi/xóa hoặc đã có appeal. Write API vẫn kiểm tra lại quyền và trạng thái.
- Thêm “Báo cáo của tôi” trên Web/Mobile, nối API cá nhân đã có; có phân trang và trạng thái tiếp nhận/đang xem xét/đã xử lý.
- Kiểm tra HTTP mới bao phủ auth/role, validation và replay Idempotency-Key cho appeal.
- Kiểm tra hai reviewer xử lý cùng appeal: chỉ một kết quả và một event kết quả được ghi.

## 2. Kết quả chạy

| Phạm vi | Kết quả |
| --- | --- |
| Core moderation + social unit/HTTP tests | 262/262 đạt, 14 file |
| Moderation integration trên Postgres Testcontainers | 21/21 đạt |
| Notification service tests | 111/111 đạt, 16 file |
| API client moderation + notification tests | 28/28 đạt |
| Typecheck | Core API, Notification, Admin, Web và Mobile đạt |
| Lint tập tin/module liên quan | Core type-aware, Web và Admin đạt |
| Git diff whitespace | BE và FE không lỗi trong lần kiểm tra |
| Playwright giao diện Web | Gửi appeal và xem report đạt ở 1440px và 390px |
| Playwright giao diện Admin | Mở queue và chấp nhận appeal đạt |

Một lượt integration từng lỗi timeout pool dưới tải chạy song song; lượt chạy lại cả 21 test đạt. Không thay cấu hình pool production để che lỗi test.

## 3. Bằng chứng giao diện

Script tái chạy: [verify-moderation-appeals.cjs](../../tools/verify-moderation-appeals.cjs).

Script dùng Playwright runtime được cấu hình bằng `PLAYWRIGHT_PACKAGE`. URL mặc định: Web dev `http://localhost:3101`, Admin `http://localhost:3200`; có thể đổi bằng `MODERATION_WEB_URL`/`MODERATION_ADMIN_URL`. Output có thể đổi bằng `MODERATION_QA_OUTPUT`.

- Web desktop sau gửi appeal (evidence local: ../../outputs/moderation-p0-20261113/author-1440.png).
- Web 390px sau gửi appeal (evidence local: ../../outputs/moderation-p0-20261113/author-390.png).
- Admin sau xử lý appeal (evidence local: ../../outputs/moderation-p0-20261113/admin-appeal-resolved.png).

Playwright chạy với **API giả lập**, không phải deployment FE–BE thật. Test HTTP dùng Nest test app và dependency fixture; test transaction dùng Postgres thật. Chưa chạy ứng dụng trên giả lập/thiết bị native.

## 4. Phần P0 còn phải hoàn thiện

### BE-01 — Scan/evidence/version

Scan ledger hiện ghi deferred/passed/flagged và model/attempts. Chưa đủ queued/running/failed/superseded, policyVersion, evidence snapshot bất biến, coverage từng modality và version/hash chuyên biệt. `contentVersion` hiện dùng updatedAt nên có thể làm mất eligibility khi timestamp đổi do cập nhật không sửa nội dung. Các API mới chưa có bộ DTO/OpenAPI đầy đủ để regenerate client; FE hiện dùng typed wrapper qua HTTP chung.

### BE-02 — Retry vận hành

Đang dùng retry/DLQ của Redis Streams. Chưa có scheduler kiểm tra bù scan deferred sau khi vượt giới hạn giao, backoff riêng và công cụ retry/admin/metric đủ theo kế hoạch. Scan có thể còn deferred dù event đã vào DLQ. Cần chốt và kiểm thử recovery sau outage dài trước phát hành.

### BE-03 — Report

Đã bỏ tự ẩn từ số report và có dedupe hiện tại. Chưa thêm rate limit riêng và report theo contentVersion; unique hiện tại vẫn theo target/reporter nên chưa thể re-report một bản sửa mới bằng cùng tài khoản.

### BE-04 — Lịch sử removal

Các platform removal mới dùng status removed thay vì deletedAt, có thể restore. Dữ liệu cũ removed + deletedAt vẫn bị chặn vì chưa đủ bằng chứng phân biệt author deletion. Cần migration/backfill có audit hoặc quy trình manual; không tự phục hồi hàng loạt. Chưa nghiệm thu mọi query phụ có thể đang dùng deletedAt thay cho trạng thái.

### BE-05/06 và FE

Đã có API cá nhân, API appeal, hàng chờ Admin, Web/Mobile và notification kết quả. Còn cần evidence snapshot cho reviewer, DTO/capabilities chi tiết, policy/thời hạn/lưu giữ evidence, thông báo kết quả report nếu được yêu cầu và kiểm thử thực tế với dịch vụ đang chạy. Quyết định lịch sử thiếu version không thể auto-overturn. Reviewer có thể giữ nguyên quyết định; các trường hợp không auto-restore được cần quy trình xét lại thủ công được mô tả rõ.

Mobile inbox hiện chỉ điều hướng thông báo moderation tới màn trạng thái; thông báo khác có thể đọc/đánh dấu đã đọc nhưng chưa được nối đủ đường đi chi tiết. Chưa kiểm thử native runtime.

## 5. Điều kiện trước khi đánh dấu P0 hoàn tất

1. Khép các mục thiếu ở phần 4 và cập nhật contract/client.
2. Chạy luồng thật: đăng → screening → action → notification → appeal → reviewer độc lập → restore → đồng bộ feed/search/inbox/counter.
3. Thử AI outage vượt số lần giao, replay/backfill và dữ liệu legacy trên bản sao kiểm thử.
4. Xác nhận giới hạn lưu bằng chứng, thời hạn và đầu mối xử lý khiếu nại.
