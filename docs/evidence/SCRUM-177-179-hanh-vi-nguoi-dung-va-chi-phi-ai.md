# SCRUM-177 + SCRUM-179 — Hành vi người dùng và chi phí AI (admin)

- Jira: [SCRUM-177](https://tripflix.atlassian.net/browse/SCRUM-177), [SCRUM-179](https://tripflix.atlassian.net/browse/SCRUM-179) · Nhánh: `trang/SCRUM-177-*`, `trang/SCRUM-179-*` · Người làm: Trang (dùng AI: có) · Ngày: 2026-11-19
- Ba repo: tripflix-ai (sự kiện), tripflix-be (lưu và API), tripflix-fe (trang admin). Thứ tự merge: BE trước, AI sau, FE cuối.

## Đã làm
- **SCRUM-177, Hành vi người dùng.** Superadmin xem từng người: lượt thích, bình luận, chia sẻ, lượt xem đủ tiêu chuẩn, lượt chat Tripi kèm câu hỏi đã che email/số điện thoại (rút gọn 120 ký tự, giữ 30 ngày). Tên hiển thị và email đọc qua `AccessFacade.getUserContacts`, không truy vấn chéo module. Chi tiết mở trong cửa sổ riêng.
- **SCRUM-179 đợt 1, AI usage và trace.**
  - Bảng `analytics.ai_usage_events` thêm `user_id`, `conversation_id`, `turn_id`, `latency_ms`. Sau 90 ngày job dọn bỏ liên kết người dùng, giữ số tổng.
  - API chỉ superadmin: `ai-usage/timeseries`, `ai-usage/users`, `ai-traces`, `ai-traces/:turnId`.
  - Trang **Chi phí AI** 3 tab: Tổng quan (thẻ số liệu, biểu đồ token và chi phí theo giờ/ngày, bảng theo tính năng/ngày/model), Người dùng (xếp theo chi phí), Trace (danh sách lượt chat, lọc theo kết quả/chi phí/người; dialog dòng thời gian các bước LLM). Dialog hành vi người dùng có phần "Dùng AI".
  - Trace chỉ lưu siêu dữ liệu, không lưu prompt hay câu trả lời đầy đủ.

## Đối chiếu "Xong khi"
| Tiêu chí (SCRUM-179) | Đạt | Bằng chứng |
|---|---|---|
| Biểu đồ token và chi phí theo thời gian, bảng theo model và tính năng | Đạt | Ảnh tab Tổng quan (dữ liệu giả, xem mục Ảnh) |
| Xếp hạng người dùng theo token và chi phí, kèm tên và email | Đạt | `ai-insights.int.spec.ts` trên Postgres thật; ảnh tab Người dùng |
| Mở được trace một lượt chat: bước LLM, token, chi phí, thời gian | Đạt phần code | `ai-usage-format.test.ts` (dòng thời gian); thời gian từng bước cần `turnId`/`latencyMs` từ ai-service (AI #50) |
| Moderator gọi API bị chặn (403) | Đạt | `@Roles('superadmin')`, test controller |

## Kết quả kiểm tra
- BE: tsc, lint, vitest analytics, test tích hợp trên Postgres thật (cả `ai-insights` và `user-activity`), `check-boundaries`, OpenAPI chỉ thêm.
- FE: `pnpm turbo run lint typecheck test --filter=@tripflix/admin --filter=@tripflix/i18n` **6/6 task thành công**, admin **44 test pass** (13 file).
- Staging đã kiểm tra: trang Hành vi người dùng hiện đúng tài khoản `pthen228` với 4 lượt chat. Lỗi 500 lúc đầu (cột thời gian từ SQL thô là chuỗi) sửa ở BE #276; lỗi null của `turnId`/`latencyMs` do ai-service gửi `null` sửa ở BE #280.
- **Chưa kiểm tra trên staging:** trang Chi phí AI 3 tab và dòng thời gian với dữ liệu thật (cần đăng nhập superadmin và một lượt chat mới sau khi AI #50 chạy).

## Cách kiểm lại
1. Đăng nhập admin bằng superadmin, vào **Chi phí AI**, chọn "Hôm nay" thấy biểu đồ theo giờ.
2. Dùng một tài khoản thường chat Tripi vài câu (có một câu lỗi nếu được).
3. Tab **Người dùng** thấy tài khoản đó; bấm "Xem trace" rồi "Chi tiết": thấy bước controller và responder cùng thời gian.
4. Đăng nhập moderator: API trả 403.

## Ảnh / video
- Không commit ảnh vào repo. 6 ảnh chụp ngày 2026-11-19 bằng Chrome với **dữ liệu giả** (tổng quan 7 ngày và hôm nay, người dùng, trace lọc theo người, dialog dòng thời gian, phần AI trong dialog hành vi), lưu cục bộ ở máy Trang; sẽ đính vào Jira khi có ảnh thật từ staging.

## Ảnh hưởng tới phần của người khác
- Có, đã báo và được đồng ý:
  - `apps/admin` (chủ: Thành): chỉ thêm trang, menu, BFF whitelist, i18n; không đổi hành vi cũ. FE #260, #262, #272.
  - `libs/contracts` (chủ: Dũng): thêm trường tuỳ chọn vào `ai.chat.turn.recorded`. BE #272, #275, #276, #278, #280.
  - tripflix-ai (chủ: Bảo): sự kiện lượt chat (#48) và `turnId`/`latencyMs` (#50), đã merge.
  - Triển khai staging: anh Phong (`AI_TAG`).
