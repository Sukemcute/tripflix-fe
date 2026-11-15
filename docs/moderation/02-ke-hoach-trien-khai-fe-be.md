# Kế hoạch triển khai kiểm duyệt Tripflix — FE và BE

Ngày lập: **12/11/2026**. Trạng thái: **đề xuất kỹ thuật, chưa triển khai**.

**Cập nhật 13/11/2026:** P0 đã được triển khai và kiểm thử kỹ thuật local; xem [kết quả, bằng chứng và giới hạn phát hành](04-nghiem-thu-p0-20261113.md). Phần dưới giữ nguyên kế hoạch gốc để đối chiếu phạm vi P1/P2.

Đầu vào: [báo cáo đối chiếu TikTok và hiện trạng Tripflix](01-bao-cao-doi-chieu-tiktok.md).

## 1. Phạm vi và kết quả cần đạt

Kế hoạch bao gồm Core API, database, worker, AI/media, notification, discovery và FE Admin/Web/Mobile. Tận dụng module moderation, audit, transaction và outbox hiện có.

Sau P0, hệ thống phải đi hết luồng: **phát hiện → review/quyết định → thông báo → khiếu nại → giữ hoặc đảo quyết định → cập nhật các nơi hiển thị** cho cả bài và bình luận.

P1 thêm kiểm soát trước public, bộ lọc chủ bài, coverage media và vận hành. P2 thêm chế tài tài khoản và eligibility. Không cần xây microservice moderation mới cho phạm vi này.

## 2. Các quyết định thiết kế nền tảng

### 2.1. Tách vòng đời

| Thành phần | Mô hình đề xuất | Quy tắc |
| --- | --- | --- |
| Nội dung | Giữ business status; thêm moderation gate hoặc các hold có kiểu rõ ràng | Case đang pending không tự đồng nghĩa nội dung bị chặn |
| Scan | queued/running/passed/flagged/deferred/failed/superseded | Error không phải passed; phân biệt text/media và phiên bản |
| Case | pending/resolved hiện có; thêm trạng thái nhận xử lý nếu cần | Claim/lease không thay thế khóa và kiểm tra cạnh tranh khi quyết định |
| Decision | Action immutable gắn actor, target/version, policy và lý do | Ưu tiên mở rộng moderation_actions làm decision ledger, tránh hai nguồn quyết định |
| Appeal | pending/upheld/overturned | Gắn decisionId và unique constraint theo chính sách appeal |
| Creator filter | Pending/approved/rejected và lý do lọc của chủ bài | Độc lập với platform hold/removal; approval không vượt platform decision |

Khởi đầu ưu tiên trường có kiểu và constraint cho các trạng thái đơn giản. Chỉ dùng bảng hold riêng nếu cần nhiều lý do đồng thời; phải hỗ trợ tình huống scan hold, creator hold và platform action cùng tồn tại.

### 2.2. Khôi phục và quyền xem

- Tách `authorDeletedAt`/deletion origin khỏi platform removal; tên cột cụ thể chốt trong migration design.
- Không diễn giải lại dữ liệu `deletedAt` cũ hàng loạt khi thiếu bằng chứng. Backfill từ audit/action; trường hợp mơ hồ cần review, không tự restore.
- Restore đúng target/version; nếu đã có bản sửa thì không đưa bản cũ trở lại public tự động.
- Parent chưa visible hoặc reply có independent hold thì restore parent/appeal không làm reply hiện lại.
- Quyền xem hiệu lực ở API nguồn; projection, cache và notification cần đồng bộ nhưng không thay thế authorization.
- Endpoint dành cho tác giả trả metadata quyết định của chính họ; không nới public detail để hỗ trợ appeal.

### 2.3. Contract và event

- Dùng action ID hiện có làm `decisionId` nếu semantics tương thích.
- Ghi quyết định + trạng thái + outbox trong transaction.
- Phát event cho cả quyết định ngoài case; `caseId` được nullable, không dùng nó làm điều kiện duy nhất để phát notification.
- Phân biệt interim auto-hide với kết luận vi phạm cuối cùng; không cộng strike từ interim action.
- Payload dự kiến: decisionId, caseId?, targetType, targetId, authorId, contentVersion, policyVersion, action, reasonCode, occurredAt và tính tự động.
- Consumer dedupe theo eventId/decisionId tùy side effect; không gửi lại cùng notification khi replay.
- Event bổ sung field phải bảo đảm tương thích schema hiện tại; thay đổi breaking tăng version.
- Public DTO không lộ reporter, ghi chú staff nội bộ hoặc bằng chứng nhạy cảm của người khác.

## 3. Backlog BE

### BE-01 — Scan ledger và phiên bản nội dung · P0

**Thay đổi:** mở rộng schema content; bổ sung `moderation_scans` gắn target, contentVersion/hash, modality, policyVersion, model, outcome, attemptCount, nextAttemptAt và error code. Tận dụng thông tin version hiện có; xác định version không bị đổi chỉ vì counter/visibility trước khi chốt.

**Điểm sửa:** `content/db/schema`, `moderation.repository.ts`, screening use cases và consumer.

**Nghiệm thu:** truy ra được pass/error/chưa scan của từng phiên bản; scan cũ không ẩn bản mới; verdict không ghi đè quyết định staff; unique key không chặn retry hợp lệ.

### BE-02 — Retry AI và kiểm tra bù · P0

**Thay đổi:** khi AI trả null, vẫn chạy rules nhưng lưu deferred; scheduler/worker retry theo backoff có jitter, giới hạn attempt và DLQ. Job retry có ID riêng, tham chiếu scan gốc; không tái dùng event đã accept rồi bị dedupe bỏ qua. Cấu hình thiếu provider phải nhìn thấy trong health/metric.

**Nghiệm thu:** provider down rồi hồi phục có scan bù; nội dung đã sửa/xóa được supersede/skip; replay không tạo lặp case/action; có metric và người xử lý DLQ. Không giữ connection/transaction khi gọi AI.

**Phụ thuộc:** BE-01.

### BE-03 — Chính sách report và chống lạm dụng · P0

**Thay đổi:** loại số report đơn lẻ khỏi điều kiện auto-hide; report tăng ưu tiên và kích hoạt review/rescan. Giữ khả năng tự giữ nội dung khi evidence nguy hiểm đạt policy. Rate limit theo tài khoản; IP/device chỉ là tín hiệu bổ sung khi sẵn có và phù hợp, không mặc định chặn người dùng chung mạng.

Chốt semantics report theo phiên bản: giữ lịch sử report cũ; cân nhắc unique `(targetType, targetId, contentVersion, reporterId)` để người dùng báo bản sửa mới. Chuyển constraint qua migration có kiểm soát và giữ idempotency cho request trùng.

**Nghiệm thu:** ba tài khoản report nội dung sạch không tự làm ẩn; một tài khoản không nhân số report cùng phiên bản; re-report bản sửa không bị dedupe vĩnh viễn; tác giả không xem được reporter.

### BE-04 — Platform removal có thể đảo · P0

**Thay đổi:** sửa `ChangeVisibilityUseCase`, schema comment và các query đọc/xóa để phân biệt tác giả xóa với nền tảng gỡ. Bảo toàn audit, cascade provenance và counter.

**Nghiệm thu:** restore được comment nền tảng gỡ; không restore author-deleted; counter đúng một lần; reply bị ẩn riêng không hiện lại; hai quyết định cạnh tranh không làm sai trạng thái.

**Phụ thuộc:** chốt decision/version ở BE-01; là điều kiện cho BE-06.

### BE-05 — Decision status, report status và notification · P0

**Thay đổi:** API phân trang dành cho tác giả/reporter; chuẩn hóa reason/policy/action; handler notification cho quyết định, kết quả appeal và kết quả report được phép công bố. Deep link tới màn trạng thái riêng.

Xử lý cả `comment.hidden/restored` và trường hợp held trước public: nội dung bị chặn không còn preview nhạy cảm trong inbox; chặn race giữa created notification và hidden event đến trước/sau. Consumer cần truy vấn/projection trạng thái đủ mới, không chỉ xóa notification đang tồn tại.

**Nghiệm thu:** tự ẩn và staff action đều có trạng thái phù hợp; event lặp một notification; direct action không case vẫn có decision; người khác không mở quyết định của tác giả; reporter chỉ thấy kết quả tổng quát.

**Phụ thuộc:** decision contract BE-01; dùng lại notification infrastructure.

### BE-06 — Appeal và admin review · P0

**Thay đổi:** `moderation_appeals`, API submit/list/detail, queue và decision API cho staff. Validate ownership, eligibility, deadline và uniqueness. Reviewer không trùng actor ra quyết định; hệ thống tự động dùng reviewer người có quyền. Staff thiếu người phải escalate.

Appeal upheld giữ quyết định; overturned ghi decision mới liên kết decision gốc, restore khi còn đủ điều kiện, cập nhật outbox và thông báo atomically. Không chỉnh sửa audit cũ.

**Nghiệm thu:** race hai appeal/reviewer có kết quả xác định; author delete/edit trong lúc chờ không bị restore sai; appeal không bỏ independent hold; action rollback nếu ghi outbox thất bại.

**Phụ thuộc:** BE-01, BE-04, BE-05.

### BE-07 — Gate trước public và quyền bình luận · P1

**Thay đổi:** luật nhanh trước publish/add/edit; nội dung nghi ngờ cao được held. AI tiếp tục async ngoài transaction. Áp dụng visibility thống nhất cho list/detail/user posts/reels/search/summary/comment sampling và các nơi có thể nhúng nội dung. Notification/counter chỉ theo public eligibility.

Với sửa nội dung, chọn chính sách rõ: giữ bản đã duyệt cũ trong khi kiểm tra bản mới, hoặc tạm giữ toàn target. MVP có thể chọn tạm giữ target; FE phải phản ánh đúng, không làm như đã đăng công khai.

**Nghiệm thu:** held không lọt public API; tác giả xem được trạng thái riêng; timeout có retry/escalation; luật nhanh không gọi provider khi giữ DB lock.

**Phụ thuộc:** BE-01/02/05.

### BE-08 — Comment settings và creator queue · P1

**MVP:** bật/tắt bình luận từng bài; lọc keyword và creator review queue. Sau đó mới thêm lọc spam/offensive, duyệt tất cả và audience restriction nếu quan hệ follow/block đã đủ API.

**Thay đổi:** settings có giới hạn số/độ dài keyword; matching Unicode/tiếng Việt được mô tả; lưu creator hold độc lập; API chỉ chủ bài quản lý. Không đồng nhất creator reject với platform violation hoặc strike.

**Nghiệm thu:** approve không bỏ platform hold; đổi settings không tự hiện mọi bình luận đã chặn; comment pending không tăng public count hoặc phát notification cho người khác; thao tác approval lặp không nhân counter.

**Phụ thuộc:** BE-07 và BE-04.

### BE-09 — Coverage ảnh/video và ngữ cảnh · P1

**Thay đổi:** quét các ảnh của bài; media-ready kích hoạt scan theo asset revision, không chỉ post.updatedAt. Video dùng frame theo cảnh/chu kỳ, OCR và ASR có timestamp; hỗ trợ evidence viewer. Scan key gồm target version + asset revision + modality/policy.

Chia milestone: ảnh trước; video frame tiếp theo; OCR/ASR sau khi đo chi phí. Có quota, timeout, giới hạn độ dài, kiểm soát truy cập media và lưu giữ transcript/evidence. Context bình luận gồm parent và post trong phạm vi cần thiết.

**Nghiệm thu:** cover sạch không đại diện cả clip; chứng minh phát hiện test case vi phạm giữa video; media chưa sẵn sàng được deferred; không áp verdict asset cũ. Sampling vẫn có thể bỏ sót, phải công bố coverage.

### BE-10 — Queue, SLA và aggregate · P1

**Thay đổi:** assignee/lease, dueAt, escalation, filter/pagination ở backend; API aggregate đầy đủ cho dashboard. Lưu audit truy cập evidence và hành động staff.

**Nghiệm thu:** queue lớn không dùng đếm 100 dòng FE; lease hết hạn nhận lại được; decision vẫn có concurrency guard; backlog/DLQ alert có đầu mối nhận.

### BE-11 — Sanctions và eligibility · P2

Ledger vi phạm gắn quyết định cuối cùng; expiresAt, hạn chế tính năng và đảo hậu quả khi appeal thắng. Tách recommendation eligibility khỏi quyền mở bài. Thời hạn và mức phạt là policy Tripflix cần phê duyệt nghiệp vụ, không mặc định sao chép TikTok.

**Nghiệm thu:** report/AI flag/interim hide không cộng strike; không strike tác giả reply chỉ vì bị cascade; overturn bỏ sanction tương ứng; projection recommendation cập nhật đúng.

## 4. Backlog FE dùng chung

### FE-01 — API client và trạng thái dùng chung · P0

- Sau khi chốt OpenAPI, regenerate `packages/api-client/src/generated`; không sửa file generated bằng tay.
- Mở rộng `packages/api-client/src/moderation.ts`, DTO mapping và query keys.
- Bổ sung copy trong `packages/i18n`; hiển thị lý do dễ hiểu thay vì score/model nội bộ.
- Quy định invalidation cho feed/detail/comments/profile/notification/moderation sau action và appeal.
- Không optimistic restore hoặc optimistic public khi server chưa xác nhận; xử lý stale version/409 bằng refetch.

**Nghiệm thu:** Web/Mobile/Admin đọc cùng trạng thái; enum mới có fallback; không còn item chặn trong cache sau refetch; API denial vẫn bảo vệ nội dung dù client cũ.

## 5. FE Web và Mobile cho người dùng

### FE-02 — Trang trạng thái kiểm duyệt · P0

**Màn hình đề xuất:** mục “Trạng thái nội dung” trong tài khoản, danh sách quyết định, chi tiết quyết định và trạng thái appeal.

Chi tiết gồm loại nội dung, preview được phép xem, thời gian, hành động, lý do/chính sách, phạm vi ảnh hưởng và CTA appeal nếu eligible. Nội dung hidden/removed mở qua API riêng của tác giả. Trạng thái tạm giữ không viết như đã kết luận vi phạm.

**Tích hợp:** Web social/post detail/profile/notifications; Mobile account/feed/post detail/reel-comments. Route mới chốt theo conventions thực tế khi implement.

**Nghiệm thu:** deep link từ notification mở được khi public detail trả 404; người khác không xem được; đủ loading/error/empty/expired/deleted states.

### FE-03 — Form khiếu nại và theo dõi · P0

- Form mô tả lý do, giới hạn ký tự và xác nhận gửi; không thêm upload evidence vào MVP nếu chưa có nhu cầu/contract.
- Hiển thị pending, upheld, overturned và lý do kết quả được phép công bố.
- Submit lặp/409 lấy lại appeal đã tồn tại; disable chỉ trong lúc request đang chạy, server vẫn enforce uniqueness.
- Người dùng sửa/xóa nội dung được báo ảnh hưởng tới khả năng restore.

**Nghiệm thu:** gửi xong có trạng thái bền vững sau reload; lỗi mạng không làm mất bản nháp form; nút appeal theo eligibility server.

### FE-04 — Report và kết quả · P0

- Cải thiện report dialog: reason phù hợp post/comment, mô tả tùy chọn, trạng thái đang gửi/đã nhận/đã báo cáo.
- “Báo cáo của tôi”: tiếp nhận/đang xem xét/đã có kết quả theo DTO; không hứa tự ẩn sau đủ lượt report.
- Tách CTA “báo cáo” với việc ẩn khỏi feed cá nhân nếu tính năng đó tồn tại.

**Điểm nối hiện có:** `apps/mobile/src/features/feed/report-button.tsx` và report flow Web được xác định khi implement.

### FE-05 — Trạng thái held trong composer và comment · P1

- Composer báo “Đang kiểm tra” khi held, không thông báo “đã công khai”.
- Comment của chính tác giả có trạng thái rõ; người khác không nhận placeholder làm lộ nội dung.
- Khi bình luận bị tắt, composer phản ánh quyền từ server và giải thích ngắn.
- Làm mới quyền khi người dùng đang gõ mà chủ bài tắt bình luận; giữ bản nháp nếu request bị từ chối.
- Đồng bộ Web live-comments, Mobile live-comments, reel-comments và reel composer.

### FE-06 — Cài đặt và duyệt bình luận của chủ bài · P1

- Menu bài → cài đặt bình luận: bật/tắt, keyword filter; giai đoạn sau thêm bộ lọc nâng cao.
- Queue “Bình luận cần bạn duyệt”: xem comment với parent context, approve/reject, pagination.
- Copy rõ “Bị bộ lọc của bạn giữ” và “Đang được nền tảng kiểm tra”; không hiển thị nút vượt platform block.
- Bulk chỉ thêm khi có nhu cầu thực tế và contract hỗ trợ; xử lý kết quả riêng từng item nếu một phần thất bại.

**Nghiệm thu:** chỉ chủ bài thấy controls; thao tác keyboard/screen reader hoạt động trên Web, touch target phù hợp Mobile; filter count/counter không bị lệch sau approve.

## 6. FE Admin

### ADMIN-01 — Hoàn thiện workspace hiện có · P0

**Điểm sửa:** `apps/admin/src/features/moderation/moderation-workspace.tsx`, `moderation-post-detail.tsx`, `post-moderation.tsx`.

- Detail hiển thị snapshot được scan, phiên bản hiện tại, nguồn tín hiệu, scan error/deferred và lý do xử lý.
- Phân biệt pending case, auto-hidden tạm thời và quyết định cuối cùng.
- Ghi rõ `dismiss` không tự restore; chỉ đưa action hợp lệ theo server capabilities.
- Thao tác ngoài case vẫn nhận decisionId; xử lý conflict bằng refetch, không giả định thành công.
- Require reason phù hợp; giữ ghi chú nội bộ tách khỏi thông báo gửi tác giả.

### ADMIN-02 — Hàng chờ khiếu nại · P0

- Tab appeal riêng: snapshot/quyết định gốc, lý do appeal, lịch sử và trạng thái hiện tại.
- Upheld/overturned, xác nhận tác động khi restore; không dùng nút xóa/đóng case thay cho quyết định appeal.
- Reviewer trùng actor gốc thấy giải thích và chuyển xử lý; BE enforce quyền.

### ADMIN-03 — Vận hành và evidence media · P1

- Aggregate backend, filter/pagination server, assignee và deadline; không tính KPI từ trang đầu.
- Hiển thị retry/DLQ theo quyền; retry thủ công có audit và idempotency.
- Video evidence có timestamp, frame/OCR/transcript và nhảy tới đoạn liên quan; không hiển thị như đã quét toàn clip nếu chỉ sampling.
- Bulk decisions báo từng item thành công/thất bại và refetch; không coi cả lô thành công khi có conflict.

## 7. API dự kiến và phụ thuộc FE/BE

Các endpoint bên dưới là đề xuất; chốt DTO/OpenAPI trước code và dùng lại endpoint hiện có nếu semantics tương thích.

| API | Consumer | Phụ thuộc |
| --- | --- | --- |
| GET `/v1/me/moderation/decisions` và `/:id` | FE-02 | BE-01/05 |
| GET `/v1/me/reports` | FE-04 | BE-03/05 |
| POST `/v1/moderation/decisions/:id/appeals` | FE-03 | BE-06 |
| GET `/v1/me/moderation/appeals` và `/:id` | FE-02/03 | BE-06 |
| GET `/v1/admin/moderation/appeals` và `/:id` | ADMIN-02 | BE-06 |
| POST `/v1/admin/moderation/appeals/:id/decisions` | ADMIN-02 | BE-06 |
| GET/PATCH `/v1/posts/:id/comment-settings` | FE-05/06 | BE-08 |
| GET `/v1/posts/:id/filtered-comments` | FE-06 | BE-08 |
| POST `/v1/comments/:id/creator-decisions` | FE-06 | BE-08 |
| GET `/v1/admin/moderation/stats` | ADMIN-03 | BE-10 |

DTO cần có capabilities như `canAppeal`, `canRestore`, `canCreatorApprove` và lý do không đủ điều kiện; FE không tự suy luận toàn bộ từ status. Server vẫn là nơi enforce quyền.

## 8. Thứ tự thực hiện và chia PR

| Đợt | BE | FE | Gate nghiệm thu |
| --- | --- | --- | --- |
| 1 — Nền móng P0 | BE-01/02/03/04; decision contract | FE-01; skeleton trạng thái theo DTO đã chốt, ADMIN-01 | AI recovery, report chống phá, restore/cascade, migration an toàn |
| 2 — Vòng đời P0 | BE-05/06 | FE-02/03/04, ADMIN-02, notification links | Post và comment đi hết decision → appeal → restore |
| 3 — Kiểm soát P1 | BE-07/08/10 | FE-05/06, ADMIN-03 aggregate | Held không rò; chủ bài không vượt platform action |
| 4 — Media P1 | BE-09 theo milestone | ADMIN-03 evidence viewer | Đo coverage/quality/cost, media-ready không mất scan |
| Sau pilot — P2 | BE-11 | Account status và eligibility UI | Sanction/eligibility đảo được khi quyết định sai |

Ước lượng tham chiếu: đợt 1 và 2 mỗi đợt khoảng một sprint hai tuần với 2 BE, 1 FE và QA/AI hỗ trợ; P1 cần chia thêm theo năng lực Mobile và media. Đây là giả định lập kế hoạch, không phải cam kết; chốt lịch sau khi đo baseline và xác nhận nhân sự.

PR nên chia theo lát cắt có thể nghiệm thu:

1. Schema/version/scan ledger và migration.
2. Retry/backfill + report policy.
3. Comment removal/restore và regression tests.
4. Decision API/event + notification + API client.
5. Appeal BE và admin queue.
6. Trạng thái/appeal/report Web + Mobile và deep link.
7. Gate + comment settings/creator queue.
8. Aggregate/SLA, sau đó media và P2.

FE có thể dựng UI theo contract đã chốt trong lúc BE triển khai. Không merge luồng người dùng chạy bằng mock như tính năng đã hoàn chỉnh; chỉ bật khi contract và API thật đã qua integration.

## 9. Kế hoạch kiểm thử

### BE: kiểm tra invariant và cạnh tranh

- AI timeout, provider thiếu cấu hình, retry thành công và vượt attempt vào DLQ.
- Event lặp; bản sửa mới đến khi scan cũ đang chạy; staff restore trước verdict cũ.
- Nhiều reporter, request report trùng, re-report bản sửa.
- Platform-remove rồi restore; tác giả tự xóa; dữ liệu lịch sử có origin mơ hồ.
- Parent/reply cascade, independent hold, counter và like/reply visibility liên quan.
- Hai reviewer quyết định đồng thời; appeal submit trùng; reviewer tự xét quyết định.
- Outbox lỗi rollback; notification replay, hidden event đến trước created event.
- API ownership/role và không lộ bằng chứng/reporter.

### FE: kiểm tra hành vi người dùng

- Web/Mobile mở deep link quyết định khi bài đã hidden/removed.
- Form appeal lỗi mạng, gửi lặp, reload, hết hạn và kết quả overturned.
- Composer held, bình luận vừa bị tắt, draft không mất.
- Creator approve không vượt platform action; các UI post/reels/comments đồng bộ.
- Admin 409, action không hợp lệ, bulk một phần thất bại và pagination lớn.
- Kiểm tra bàn phím, focus modal, screen reader, responsive và thao tác Mobile.

### End-to-end bắt buộc trước P0 release

1. Đăng bài/bình luận → phát hiện → ẩn → tác giả nhận lý do → appeal → staff khác overturn → nội dung đủ điều kiện hiện lại.
2. AI lỗi → scan deferred → provider hồi phục → verdict áp đúng phiên bản.
3. Ba report từ ba tài khoản lên nội dung sạch → có case ưu tiên nhưng không tự ẩn chỉ vì số report.
4. Comment bị nền tảng gỡ → restore thành công; comment tác giả tự xóa không bị phục hồi.
5. Nội dung chặn không còn khả dụng qua public detail/feed/search/comment API hoặc preview inbox.

## 10. Migration, rollout và rollback

1. Expand schema theo hướng tương thích; thêm index/constraint với phương án tránh khóa dài trên dữ liệu lớn.
2. Deploy BE hỗ trợ DTO/event mới, đồng thời tương thích consumer/client cũ.
3. Backfill có checkpoint; suy ra removal origin chỉ khi audit đủ tin cậy. Không biến dữ liệu không rõ thành “đã kiểm duyệt sạch”.
4. Deploy API client và FE; bật notification/appeal sau khi verify deep link và quyền.
5. Chạy shadow policy trên traffic mẫu; đánh giá bộ tiếng Việt có cả phản ánh dịch vụ hợp lệ, đe dọa, spam và lừa đảo.
6. Pilot nhóm nhỏ bằng flag riêng cho gate, filters và sanctions; tăng dần theo chất lượng và backlog thực tế.
7. Rollback tắt quyết định tự động mới và chuyển review; giữ platform blocks đang có, audit và outbox. Không tự public lại mọi held content. Không rollback schema phá dữ liệu đã ghi.

## 11. Chỉ số nghiệm thu vận hành

Các mức dưới đây là mục tiêu ban đầu cần hiệu chỉnh bằng baseline, không phải hiện trạng đã đo:

| Chỉ số | Mục tiêu đề xuất | Điều kiện diễn giải |
| --- | --- | --- |
| Text scan hoàn tất trong 5 phút | ≥99% phiên bản đủ điều kiện | Provider bình thường; theo dõi deferred riêng |
| Decision đến notification | p95 ≤60 giây | Không tính như API nguồn được phép tiếp tục lộ nội dung |
| Auto-hide precision | ≥98% trên tập gán nhãn độc lập | Công bố số mẫu/khoảng tin cậy; đo recall từng nhóm |
| SLA case nguy cấp | 1 giờ khi có ca trực | Chỉ công bố sau khi có nhân sự và escalation |
| Appeal turnaround | 24–48 giờ | Theo capacity; không tự xử thắng/thua khi hết SLA |

Dashboard bổ sung backlog age, DLQ, số lượt exposure trước action, scan coverage theo ảnh/frame/audio và tỷ lệ đảo quyết định. Audit ngẫu nhiên cả nội dung bị xử lý lẫn được cho qua để đánh giá sai sót ngoài các trường hợp có appeal.

## 12. Những việc cần chốt khi bắt đầu

- Owner BE/FE/QA/AI và người duyệt nghiệp vụ.
- Danh mục policy, ngoại lệ và mức evidence cho auto-hold/auto-hide.
- Thời hạn appeal, lưu evidence/snapshot và quyền truy cập.
- Tài nguyên moderator và escalation khi không có reviewer độc lập.
- Chính sách khi tác giả sửa nội dung đang chờ duyệt.
- Ngân sách media/OCR/ASR và nền tảng FE phát hành trước.

Các quyết định này không cản trở việc bắt đầu BE-01 đến BE-04. Hoàn thiện contract và P0 trước, rồi triển khai P1 theo thứ tự phụ thuộc ở mục 8.
