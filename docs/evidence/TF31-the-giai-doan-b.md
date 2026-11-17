# TF31 — Thẻ kế hoạch chuyến đi của Tripi trên mobile (Giai đoạn B)

- Notion: TF31 · Nhánh: `bao/TF31-the-giai-doan-b` · Người làm: Bảo (dùng AI: có) · Ngày: 2026-11-17
- Kế hoạch: bước B9. **Phụ thuộc:** PR FE `bao/TF31-the-chuyen-bay` (nhánh này tách từ đó) và hợp đồng AI nhánh `bao/TF31-tro-ly-day-du` (`TripContext` v2, `ChatRequest.action`).
- Tripi chỉ có trên app mobile, không làm khung trên web (Bảo chốt 2026-11-17).

## Đã làm
- **Sinh lại model ai-service** bằng `pnpm gen:api` từ `contracts/openapi/ai-service.json` của tripflix-ai:
  - thêm `DraftStop`, `DraftChoice`, `DraftTransport`, `DraftOp`, `DraftAction`;
  - `TripContext` có thêm trường cho kế hoạch, `v` thành 1 | 2;
  - `ChatRequest.action`.
  - Không sửa tay file sinh.
- **api-client:** `AssistantCardLine.ref`, kiểu `AssistantAction`; `sendAssistantMessage` gửi kèm `action`.
- **Provider và transport:** `send(text, retry, action)`, hàm `act`; xuất `trip` để thẻ biết còn hoàn tác được không.
- **Thẻ:**
  - Thẻ `compare` (chọn chỗ ở) và `transport` (xe khách tham khảo) hiện như thẻ thông tin.
  - Dòng có `ref` có nút **Chọn**: gửi `action {type: 'select', ref}`, AI chạy phép sửa bằng code, không gọi LLM.
  - Thẻ kế hoạch (id `plan:`) có nút **Hoàn tác** khi `trip.ops` còn phép sửa.
  - Chỉ tin cuối cùng có nút, để bấm vào tin cũ không sửa nhầm kế hoạch hiện tại.
- **i18n:** `choose`, `undo`.

## Đối chiếu "Xong khi"
| Tiêu chí (kế hoạch B9) | Đạt | Bằng chứng |
|---|---|---|
| Thẻ lộ trình có chặng km, phút, "ước tính" | Đạt (AI) | Chữ chặng do AI dựng trong `lines`; FE hiện nguyên |
| Thẻ đi lại, thẻ so sánh có nút "Chọn" gửi `action` | Đạt (code) | `assistant-cards.tsx`, `assistant-provider.tsx` |
| Chỗ ở ngoài Tripflix có nhãn, không nút đặt | Đạt (AI) | AI chỉ gắn `ref` để chọn, không có `priceFrom`; thẻ không mở trang đặt |
| Chip "Hoàn tác" | Đạt (code) | Nút Hoàn tác trên thẻ `plan:` |
| api-client có `action` | Đạt | `packages/api-client/src/assistant.ts` |
| Lưu draft v2 ≤ 2.048 byte | Đạt một phần | `serializeAssistantChat` (app-core) bỏ tin cũ trước. **Giới hạn:** riêng `trip` đã quá 2.048 byte thì không lưu `trip`; trong phiên vẫn còn, mở lại app thì mất kế hoạch. Đo ở AI: kế hoạch 2 ngày 815 byte (`test_the_plan_stays_small_enough_for_the_app_to_keep` chặn < 1.800). Với id và tên OSM thật ước khoảng 130 byte mỗi điểm, nên kế hoạch **từ khoảng 4 ngày** sẽ không được lưu [ƯỚC TÍNH] |
| Ảnh trên Android | Bỏ | Bảo bỏ việc chụp ảnh (2026-11-17) |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`: **16/16** task thành công (2026-11-17).
  - app-core 164 test, api-client 220 test, i18n 2 test, web 93 test: pass hết.
  - Lint: 0 lỗi; cảnh báo có sẵn từ trước, không nằm ở file của nhánh này.
- Mobile không có bộ test riêng (task `test` của mobile không tồn tại).

## Cách kiểm lại
1. Chạy BE (`pnpm stack:up`), ai-service nhánh `bao/TF31-tro-ly-day-du`, rồi `pnpm --filter @tripflix/mobile android` (hoặc `web`).
2. Mở Tripi, gõ lần lượt:
   - "muốn đi vũng tàu 2n1đ" → thẻ kế hoạch 2 ngày.
   - "mình ở sài gòn" → thẻ xe khách, nhãn tham khảo.
   - "đổi chỗ ở gần biển hơn" → thẻ so sánh, mỗi dòng có nút **Chọn**.
3. Bấm **Chọn** một dòng → kế hoạch xếp lại quanh nơi ở mới.
4. Bấm **Hoàn tác** → quay về nơi ở cũ.

## Ảnh / video
- Không chụp: Bảo bỏ việc chụp ảnh Android cho task này (2026-11-17).

## Ảnh hưởng tới phần của người khác
- Có: `apps/mobile` (chủ: chị Trang). Chỉ sửa trong `features/assistant`. Cần chị Trang duyệt trước khi merge.
- `packages/api-client`, `packages/i18n`: chỉ thêm, không đổi chữ ký có sẵn.
