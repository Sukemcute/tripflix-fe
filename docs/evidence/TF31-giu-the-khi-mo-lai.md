# TF31 — Mở lại Tripi vẫn còn thẻ lộ trình

- Notion: TF31 · Nhánh: `bao/TF31-giu-the-khi-mo-lai` · Người làm: Bảo (dùng AI: có) · Ngày: 2026-11-18

## Đã làm
- **Lỗi:** người đã đăng nhập tải lại trang hoặc mở lại app thì Tripi chỉ còn chữ hội thoại, mất thẻ lộ trình (cùng nút "Đặt theo lộ trình").
  - Nguyên nhân 1: `storedMessage` (`packages/app-core/src/assistant-chat.ts`) chỉ lưu `id`, `role`, `text`, `kind`, bỏ `cards`.
  - Nguyên nhân 2 (Android): chat lưu trong SecureStore, giới hạn 2.048 byte, nên một thẻ lộ trình (vài KB) không bao giờ vừa.
- **Lưu thẻ cùng tin nhắn.** Khi thiếu chỗ, bỏ thẻ của tin cũ trước, rồi mới bỏ tin cũ như trước. Thẻ của câu trả lời mới nhất được giữ lâu nhất, chỉ bỏ khi không còn chỗ cho lượt hỏi đáp cuối. Gợi ý (chip) vẫn không lưu.
- **Thẻ khôi phục đi qua cùng bộ lọc với thẻ từ server** (`readAssistantCards` trong api-client), nên nút có đường dẫn lạ vẫn bị loại.
- **Android:** lưu vào file trong thư mục riêng của app (`expo-file-system`, đã có sẵn), giới hạn 64 KB.
  - Lần đọc đầu chuyển phiên cũ từ SecureStore sang file rồi xoá bản cũ.
  - Đọc, ghi và xoá chạy tuần tự để lần ghi chậm không ghi đè lệnh xoá chat.
  - Web vẫn dùng `localStorage`.
  - Giữ nguyên các mốc 7 ngày, 20 tin, chỉ người đăng nhập mới lưu.

## Đối chiếu "Xong khi"
| Tiêu chí (Bảo báo lỗi 18/11) | Đạt | Bằng chứng |
|---|---|---|
| Mở lại Tripi vẫn thấy thẻ lộ trình | Đạt (test) | `assistant-chat.test.ts`: "stores cards with text and kind…" |
| Thiếu chỗ thì bỏ thẻ cũ trước, giữ thẻ mới nhất | Đạt | "drops old cards before messages…", "keeps the newest assistant cards longer…", "drops even the newest cards when needed…" |
| Thẻ lưu trên máy không mở được đường dẫn lạ | Đạt | `assistant.test.ts`: "filters restored cards and actions the same way as server cards" |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test` cho app-core, api-client, mobile, web: **11/11 việc đạt**.
- `assistant-chat.test.ts`: **18 passed**.
- `assistant.test.ts` (api-client): **39 passed**.

## Cách kiểm lại
1. Đăng nhập, hỏi "Tôi muốn đi Đà Lạt 3 ngày 2 đêm", trả lời "từ TP.HCM, 21/11" để có thẻ lộ trình.
2. Tải lại trang (web) hoặc tắt hẳn app rồi mở lại (Android), mở Tripi: thẻ lộ trình và nút "Đặt theo lộ trình" vẫn còn.

## Ảnh / video
- Chờ Bảo chụp trên Android và web.

## Ảnh hưởng tới phần của người khác
- `apps/mobile/src/features/assistant/assistant-store.ts`, `assistant-provider.tsx` (chị Trang): đổi chỗ lưu trên Android từ SecureStore sang file riêng của app. File không mã hoá nhưng chỉ app đọc được.
- `apps/web/src/features/assistant/assistant-provider.tsx` (Thành; Tripi web của Dũng): chỉ thêm bước đọc thẻ khi khôi phục.
- `packages/api-client`: thêm export `readAssistantCards`, không đổi hàm cũ.
