# TF31 — App gửi Tripi nhiều ngữ cảnh hơn (20 tin)

- Notion: TF31 · Nhánh: `bao/TF31-ngu-canh-rong` · Người làm: Bảo (dùng AI: có) · Ngày: 2026-11-17
- Đi cùng PR AI `bao/TF31-ngu-canh-tu-nhien` (AI đọc tối đa 20 tin, nhận tối đa 30). Merge PR AI trước.

## Đã làm
- `ASSISTANT_HISTORY_TURNS` 10 → 20 (`packages/app-core/src/assistant-chat.ts`): mỗi lượt app gửi 20 tin gần nhất. Giới hạn này để test, chốt lại trước khi phát hành.
- Số tin lưu trên máy giữ 20 (`ASSISTANT_SAVED_MESSAGES`), native vẫn giới hạn 2.048 byte. Lịch sử gửi đi lấy từ cuộc trò chuyện đang mở trong app, nên không bị giới hạn lưu này cắt.
- Sinh lại model ai-service (`pnpm gen:api`): `TripContext.awaiting`, `mealsOnly`, khung giờ `trưa`; `ChatRequest.history` tối đa 30. Không sửa tay file sinh.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| App gửi nhiều lịch sử hơn để Tripi giữ ngữ cảnh | Đạt | `ASSISTANT_HISTORY_TURNS = 20` |
| Model khớp hợp đồng AI mới | Đạt | `packages/api-client/src/generated/ai-service/model/` |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`: **17/17** task thành công; app-core 187 test.

## Cách kiểm lại
1. Chạy AI nhánh `bao/TF31-ngu-canh-tu-nhien` và app mobile.
2. Chat hơn 10 tin rồi hỏi lại điều đã nói ở đầu cuộc trò chuyện: Tripi vẫn nhớ.

## Ảnh / video
- Bảo bỏ việc chụp ảnh cho các task TF31 (2026-11-17).

## Ảnh hưởng tới phần của người khác
- `packages/app-core`, `packages/api-client` (file sinh): đổi 1 hằng số và model sinh tự động; không đổi chữ ký hàm.
