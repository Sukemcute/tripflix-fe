# TF31 — Nút Chọn và "Đặt theo lộ trình" trên thẻ Tripi (mobile và web)

- Notion: TF31 · Nhánh: `bao/TF31-nut-dat-cho` · Người làm: Bảo (dùng AI: có) · Ngày: 2026-11-18
- Đi kèm PR AI [Sukemcute/tripflix-ai#46](https://github.com/Sukemcute/tripflix-ai/pull/46): AI mới gửi `Card.actions` và thẻ `booking`.

## Đã làm
- **api-client:** sinh lại kiểu `ai-service` (`Card`, `CardAction`, `TripContext.pendingFlights`, `Awaiting.change_transport`). `AssistantCard.actions`: parser SSE bỏ từng action sai dạng; `book` chỉ nhận đường dẫn `/trip-builder`.
- **app-core:** `readTripBuilderSeed` đọc tham số Tripi gửi sang (nơi đến, số khách, ngày đi, số ngày, khách sạn với ngày nhận và số đêm, chuyến bay với tuyến và ngày) và kiểm hợp lệ. Không nhận giá, mã phòng hay mã hạng vé.
- **mobile (`assistant-cards.tsx`, chị Trang):**
  - Vẽ nút từ `actions`. `select` gửi action như nút "Chọn" có sẵn, chỉ ở câu trả lời mới nhất, không lặp nút trên thẻ so sánh.
  - `book` mở `/trip-builder`, chỉ đúng đường dẫn đó.
  - Thẻ `booking` ("Chốt chuyến") hiện như các thẻ thông tin khác.
- **mobile (`trip-builder-screen.tsx`, Thắng):**
  - Mở bằng tham số của Tripi thì điền sẵn nơi đến, số khách, ngày đi, số ngày. Khách sạn vào `hotelDraft`, nút tìm mở màn chọn phòng (`pick: 'post'`) có sẵn. Chuyến bay vào `flightDraft` (chiều đi).
  - Người dùng chọn phòng và hạng vé ở màn thật, nên giá luôn lấy mới từ core.
  - Tham số chỉ áp một lần rồi xoá khỏi đường dẫn; mở trang không có tham số thì giữ bản nháp cũ.
- **web (Tripi web của Dũng, PR #230; `apps/web` của Thành):**
  - Web chưa có trang combo, nên nút `book` của thẻ "Chốt chuyến" hiện thành tối đa hai link dựng từ chính tham số: **Đặt phòng** → `/hotels/{hotelId}?checkIn&checkOut&adults` (trang khách sạn web đọc đúng các tham số này), **Đặt vé** → `/flights?from&to&date&passengers`.
  - Nút "Chọn" trên thẻ chuyến bay gửi action như mobile.
  - Thêm khoá `bookHotel`, `bookFlight` vào `packages/i18n`.
- **Vì sao web trả lời như bản cũ:** ở máy local, web gọi `<API>/ai` qua Traefik tới container Docker `ai-service` build ngày 12/11, chưa có Controller. Đã build lại container từ code AI mới. Trên staging, web gọi AI do `develop` deploy.

## Đối chiếu "Xong khi"
| Tiêu chí (yêu cầu của Bảo, 18/11) | Đạt | Bằng chứng |
|---|---|---|
| Đồng ý thì hiện nút đặt, trỏ sang trang Đặt mới của Thắng (combo) | Đạt | `book` → `/trip-builder`; `trip-builder-seed.test.ts` |
| Không đưa giá từ đường dẫn | Đạt | Seed không đọc giá hay mã phòng; test params lạ |
| Chỉ mở đường dẫn được phép | Đạt | `assistant.test.ts` (api-client) từ chối đường dẫn khác |
| Tripi web nối đúng tính năng mới | Đạt | `apps/web/.../assistant.test.ts`: link từ params, đường dẫn lạ bị bỏ |
| Thẻ không có `actions` hiện như cũ | Đạt | Test SSE cũ giữ nguyên |
| Ảnh Android và web | Chờ | Bảo chụp |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`: **17/17 task**, 0 fail. Theo gói: api-client 274, app-core 228, web 211, admin 29, i18n 2 test pass. Lint 0 lỗi (warning có sẵn ở code ngoài phạm vi).
- Mobile chưa có test runner cho phần này; lint và typecheck mobile pass.

## Cách kiểm lại
1. `pnpm turbo run lint typecheck test --affected`
2. Mobile (Expo web ở `localhost:3100`, AI và core local mới): "Lên lịch trình Đà Nẵng 3 ngày 2 đêm cuối tuần này" → "mình bay từ Sài Gòn" → bấm "Chọn chuyến này" và "Chọn" một chỗ ở → "Chốt và đặt" → bấm "Đặt theo lộ trình" → trang Tự lên lộ trình có sẵn Đà Nẵng, ngày, số khách, khách sạn và chuyến bay để chọn phòng, hạng vé.
3. Web: cùng luồng; thẻ "Chốt chuyến" có link "Đặt phòng" và "Đặt vé".

## Ảnh / video
- Chờ Bảo chụp trên Android và trình duyệt.

## Ảnh hưởng tới phần của người khác
- ⚠️ `apps/mobile/src/features/booking/trip-builder-screen.tsx` của **Thắng**: thêm đọc tham số Tripi, dùng lại `hotelDraft`, `flightDraft` và luồng chọn phòng có sẵn; không đổi luồng tạo đơn hay tính giá. Cần Thắng duyệt.
- ⚠️ `apps/mobile/src/features/assistant/assistant-cards.tsx` của **chị Trang**: thêm vẽ nút. Cần chị Trang duyệt.
- ⚠️ `apps/web/src/features/assistant/` (Tripi web của **Dũng**, `apps/web` của **Thành**): thêm thẻ `booking`, nút Chọn và link đặt. Cần Dũng hoặc Thành duyệt.
