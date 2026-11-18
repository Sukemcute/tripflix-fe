# TF31 — api-client đọc 204 của ai-summary là "chưa có tóm tắt"

- Notion: TF31 · Nhánh: `bao/TF31-tom-tat-204` · Người làm: Bảo (dùng AI: có) · Ngày: 2026-11-18

## Đã làm
- `getPostSummary` trả `null` khi core trả 204 (body rỗng), giống 404 hiện nay. Chuẩn bị cho core đổi bài chưa có tóm tắt từ 404 sang 204, để trình duyệt không còn báo lỗi đỏ.
- Giữ nguyên cách đọc 404 cho core bản cũ và bài không tồn tại.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| 204 body rỗng được hiểu là chưa có tóm tắt | Đạt | `post-summary.test.ts`: "treats 204 with an empty body as not generated yet" |
| 404 và lỗi 503 giữ cách xử lý cũ | Đạt | "treats 404 as not generated yet and preserves service failures for retry" |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`: 17/17 task; 649 test pass, 0 fail.
- Chạy lại `post-summary.test.ts`: 21/21 pass; typecheck api-client pass.

## Cách kiểm lại
1. `pnpm --filter @tripflix/api-client exec vitest run src/post-summary.test.ts`

## Ảnh / video
- Không đổi giao diện (web và mobile vẫn ẩn phần tóm tắt khi chưa có).

## Ảnh hưởng tới phần của người khác
- `packages/api-client` dùng chung cho web (Thành) và mobile (chị Trang). Chỉ thêm một nhánh đọc 204, không đổi hàm hay kiểu trả về.
- Merge PR này **trước** PR core trả 204.
