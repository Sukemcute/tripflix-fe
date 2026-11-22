# TF117 — Redesign Admin và bộ lọc kiểm duyệt

- Jira: [SCRUM-188](https://tripflix.atlassian.net/browse/SCRUM-188) · Nhánh: `trang/TF117-admin-ui-redesign` · Người làm: Trang (dùng AI: có) · Ngày: 2026-11-20

## Đã làm

- Hoàn tất redesign Admin P1–P6 theo kế hoạch được duyệt, giữ nguyên chức năng và API hiện hữu.
- Thêm bộ chọn sắp xếp ưu tiên/mới nhất và lọc mức ưu tiên cho hàng đợi moderation; trạng thái lọc nằm trên URL.
- Đồng bộ kiểu API từ OpenAPI backend và ghi tiến độ vào `docs/admin-ui-redesign-plan.md`.

## Đối chiếu tiêu chí

| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Redesign Admin P1–P6 | Có | `docs/admin-ui-redesign-plan.md`, `docs/evidence/admin-ui-redesign.md` |
| Lọc moderation và sắp bình luận mới nhất | Có | API params `sort`, `priority`; test BE trong PR backend |
| URL giữ filter và API client có type tương ứng | Có | `moderation-queue.tsx`, generated Orval model |

## Kết quả kiểm tra

- `pnpm --filter @tripflix/admin typecheck` — pass.
- `pnpm --filter @tripflix/admin lint` — pass.
- `pnpm --filter @tripflix/admin test` — 24 files, 102 tests pass.
- Browser local tới trang moderation nhưng được chuyển về `/login`; chưa có ảnh trạng thái sau đăng nhập.

## Cách kiểm lại

1. Mở `/moderation` trong Admin và đăng nhập bằng tài khoản QA.
2. Chọn `Loại nội dung: Bình luận`, `Sắp xếp: Nội dung mới nhất`.
3. Chọn `Mức ưu tiên: Ưu tiên cao (từ 80/100)` rồi tải thêm trang để kiểm tra thứ tự.

## Ảnh / video

- Chưa chụp trạng thái sau đăng nhập; local route yêu cầu phiên QA.

## Ảnh hưởng tới phần của người khác

- Có: phạm vi Admin thuộc Thành; đã được báo về redesign trong quá trình duyệt.
- Ảnh PNG untracked trong `apps/web/public/brand/` không thuộc task và không được đưa vào commit.
