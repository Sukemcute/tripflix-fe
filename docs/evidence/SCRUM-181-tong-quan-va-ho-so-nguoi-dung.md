# SCRUM-181 — Tổng quan toàn hệ thống và hồ sơ người dùng (admin)

- Jira: [SCRUM-181](https://tripflix.atlassian.net/browse/SCRUM-181) · Nhánh: `trang/SCRUM-181-tong-quan-hanh-vi`, `trang/SCRUM-181-sua-test-sua-binh-luan`, `trang/SCRUM-179-bo-tieu-de-lap`, `trang/SCRUM-181-ho-so-nguoi-dung`, `trang/SCRUM-181-sua-the-tong-quan` · Người làm: Trang (dùng AI: có) · Ngày: 2026-11-20
- PR: BE [#288](https://github.com/Sukemcute/tripflix-be/pull/288), [#290](https://github.com/Sukemcute/tripflix-be/pull/290), [#298](https://github.com/Sukemcute/tripflix-be/pull/298); FE [#281](https://github.com/Sukemcute/tripflix-fe/pull/281), [#294](https://github.com/Sukemcute/tripflix-fe/pull/294) và PR chứa file này. Thứ tự merge: BE trước, FE sau.

## Đã làm
- **Trang Tổng quan gom số tổng của mọi tab (chỉ superadmin).** Khối "Toàn hệ thống" có ô chọn Hôm nay / 7 ngày / 30 ngày và 5 nhóm, mỗi nhóm có link "Xem chi tiết" sang tab: Người dùng (người có hoạt động, bài đăng mới, chia sẻ), Chi phí AI (chi phí, lần gọi LLM, token vào/ra), Hệ thống (số request, tỉ lệ lỗi trong 24 giờ), Đơn hàng (đơn bất thường), Job nền (lượt chạy lỗi). Mỗi nhóm tải riêng, một API lỗi không làm trống cả khối. Moderator thấy trang như trước. Phần kiểm duyệt giữ nguyên dưới tiêu đề "Kiểm duyệt".
- **Tab Hành vi người dùng kiểu hồ sơ TikTok.** Bảng hiện người theo dõi, đang theo dõi, lượt thích nhận được, bài đăng công khai (từ trước tới nay, cùng cách đếm với trang cá nhân công khai). Biểu đồ người hoạt động và bài đăng mới theo ngày. Xem chi tiết có phần "Hồ sơ" và "Hoạt động trong khoảng đã chọn" (thích đã bấm, bình luận, chia sẻ, xem, chat, bài đã đăng), câu hỏi Tripi, dùng AI, dòng thời gian.
- **BE:** ghi sự kiện đăng bài vào analytics (`kind='post'`); API `GET /api/analytics/user-activity/overview` (tổng và theo ngày giờ Việt Nam, có số người hoạt động theo ngày); danh sách và chi tiết trả thêm `profile` lấy qua `ContentFacade.getProfileStats` (đếm theo lô, chỉ thêm hàm đọc). Không có migration hay consumer group mới.
- **Dọn giao diện:** bỏ tiêu đề lặp ở 5 trang admin; thẻ tổng quan làm tròn số request (Prometheus trả số thực) và rút gọn token (1.9M / 55.2K) để không bị cắt.
- **Sửa test cũ** (BE #290): 2 test sửa bình luận thiếu `mentions` sau PR #285, làm develop đỏ.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Tổng quan hiện số tổng toàn hệ thống, chi tiết xem ở từng tab | Đạt | Ảnh staging trang Tổng quan (2026-11-20); `system-summary-format.test.ts` |
| Quản lý người dùng hiện theo dõi, lượt thích, bài đăng như TikTok | Đạt | Ảnh staging tab Hành vi người dùng; `profile-stats.int.spec.ts` trên Postgres thật |
| Chat, bình luận, lượt xem nằm trong xem chi tiết từng người | Đạt | Ảnh staging dialog "Hành vi của Sumels" |
| Số tổng khớp từng người, ngày theo giờ Việt Nam | Đạt | `user-activity-overview.int.spec.ts` (17:30 UTC tính sang ngày sau); tổng bảng khớp thẻ trên staging |
| Moderator không gọi được API superadmin | Đạt | `@Roles('superadmin')`, khối mới chỉ render khi `role === 'superadmin'` |

## Kết quả kiểm tra
- BE: `tsc --noEmit` sạch; `check-boundaries` không vi phạm; test tích hợp Postgres thật 7/7 pass; toàn core-api 3011 pass (1 test `access` quá giờ khi chạy chung, chạy riêng pass). CI PR #298 xanh.
- FE: `pnpm turbo run lint typecheck test --filter=@tripflix/admin` 3/3 task thành công, **67 test pass**; CI PR #294 xanh. 2 cảnh báo lint ở `user-activity-dialog.tsx` có từ trước.
- Staging (2026-11-20, superadmin): trang Tổng quan hiện 16 người hoạt động, 5 bài đăng mới, $0.1413 chi phí AI, 582 lần gọi LLM, 3 đơn bất thường, 2 lượt chạy job lỗi. Tab Hành vi người dùng hiện 16 người với số theo dõi, lượt thích, bài đăng. Lỗi tràn số ở thẻ Hệ thống và Token phát hiện tại đây, sửa trong PR chứa file này.

## Cách kiểm lại
1. Đăng nhập admin bằng superadmin, mở **Tổng quan**: khối "Toàn hệ thống" ở đầu trang, đổi khoảng thời gian thì số Người dùng và Chi phí AI đổi theo; bấm "Xem chi tiết" sang tab tương ứng.
2. Đăng nhập bằng moderator: trang Tổng quan chỉ có phần kiểm duyệt.
3. Mở **Hành vi người dùng**, bấm "Xem chi tiết" một người: thấy "Hồ sơ" rồi "Hoạt động trong khoảng đã chọn".
4. BE: `pnpm --filter @tripflix/core-api exec vitest run --config vitest.int.config.ts src/modules/content/social/infra/profile-stats.int.spec.ts src/modules/analytics/user-activity/user-activity-overview.int.spec.ts`.

## Ảnh / video
- Ảnh staging (Tổng quan, Hành vi người dùng, dialog chi tiết) đính kèm trong Jira SCRUM-181 và PR. Không commit ảnh vào repo.

## Ảnh hưởng tới phần của người khác
- Có: `apps/admin` (Thành): `features/overview/*`, 1 dòng trong `features/shell/live-workspace.tsx`, bỏ tiêu đề lặp ở `search-monitoring`, `discovery-jobs`, `analytics`. BE `content/social` (Thành): thêm hàm đọc theo lô ở `follow.repository.ts`, `post.repository.ts`, `content.facade.ts`; sửa 2 kỳ vọng test ở `social-use-cases.spec.ts`. Đã ghi trong từng PR.
- Lượt xem bằng 0 trên staging vì hiện chỉ app di động gửi sự kiện xem, web chưa gửi (không phải lỗi analytics).
