# TF31 — Tripi trên mobile: reel đang xem, nhớ chuyến đi, thẻ mới

- Notion: TF31 · Nhánh: `bao/TF31-tripi-v3-mobile` · Người làm: Bảo (dùng AI: có) · Ngày: 2026-11-16
- Phụ thuộc hợp đồng của tripflix-ai nhánh `bao/TF31-tripi-v3-ngu-canh` (`ChatRequest.trip`, sự kiện SSE `trip`). Chỉ thêm trường, app cũ vẫn chạy.

## Đã làm

### `packages/api-client`
- Sinh lại client ai-service: `ChatRequest` có `contextPostId`, `trip`.
- `sendAssistantMessage` giữ chữ ký. Đọc thêm:
  - `suggestions`, `trip`, `done.degraded`;
  - `lines`, `source` của thẻ.
- Lượt bị từ chối (409/429/503) thành `AssistantError { code, retryAfterSeconds, isLoginRequired }`.

### `packages/app-core/src/assistant-chat.ts`
- **Lưu phiên:** chỉ người đăng nhập, 7 ngày, tối đa 10 lượt. Chỉ đọc lại phiên của đúng người đó.
- **Lịch sử gửi server:** kèm `kind` của Tripi. Bỏ các tin do app tự thêm.

### `apps/mobile/src/features/assistant`
- `openDialog(origin, postId)`:
  - bóng Tripi trên reel và tấm lộ trình truyền `postId`;
  - mở ở chỗ khác thì không gắn reel.
- **Provider:**
  - gửi `trip`, `contextPostId` và nhận `trip` mới mỗi lượt;
  - đổi người dùng hoặc đăng xuất thì xoá phiên;
  - khách vừa đăng nhập thì giữ phiên đang dở rồi bắt đầu lưu.
- **Transport:**
  - khách gọi được;
  - `GUEST_LIMIT_REACHED` → tin mời đăng nhập có nút mở `/login?returnTo=/assistant`;
  - 409/429/503 → tin báo rõ;
  - lỗi không khoá ô nhập.
- **Thẻ:**
  - thời tiết, checklist, lộ trình, tóm tắt hiện từng dòng và dòng nguồn (Open-Meteo.com);
  - thẻ lộ trình có nút "Xem reel" (khi reel có trong feed) và "Đặt theo lộ trình";
  - thẻ không biết loại thì bỏ qua;
  - chip gợi ý bấm là gửi.
- `assistant-store.ts`: lưu như giỏ hàng (SecureStore trên app, `localStorage` trên web).

### `packages/i18n`
- Chữ cho: hết lượt khách, đang trả lời câu trước, nhắn quá nhanh, đang đông, nguồn, các nút.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Gửi `contextPostId`, `trip`, `history[].kind` | Đạt | `assistant-transport.ts`, `assistant-chat.test.ts` (`buildAssistantHistory`) |
| Đọc thẻ mới, gợi ý, `trip`, mã lỗi | Đạt | `packages/api-client/src/assistant.test.ts` (4 test) |
| Khách không lưu, người đăng nhập lưu 7 ngày, đổi người thì xoá | Đạt (test logic) | `assistant-chat.test.ts`: đúng người, quá hạn, hỏng, tối đa 20 tin |
| Khách hết lượt có nút đăng nhập | Code xong | `assistant-chat.tsx`; chưa chụp ảnh |
| Ảnh Expo Web, Android | **Chưa** | Xem mục Ảnh / video |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`: 16/16 task thành công.
  - api-client: 210 test pass.
  - app-core: 147 test pass.
  - web: 90 test pass.
  - i18n: 2 test pass.
- Lint không có lỗi; không có cảnh báo mới ở file của task.
- Typecheck mobile: file kiểu route sinh tự động `.expo/types/router.d.ts` (bị git bỏ qua) đang cũ từ nhánh khác, nên báo lỗi `/my-trips`. Không phải lỗi của task. `expo start` sẽ sinh lại file này; CI không có file này.

## Cách kiểm lại
1. Chạy:
   - tripflix-be: `pnpm stack:be`;
   - tripflix-ai: `uv run uvicorn app.main:app --port 8000`;
   - tripflix-fe: `pnpm --filter @tripflix/mobile web`.
2. Mở một reel, bấm bóng Tripi, hỏi "reel này đi mấy ngày", rồi "ngày 2 đi đâu". Kết quả đúng: thẻ lộ trình có dòng từng ngày.
3. Hỏi "thời tiết ở đó thứ Bảy". Kết quả đúng: thẻ thời tiết có dòng "Nguồn: Open-Meteo.com".
4. Khi chưa đăng nhập, dùng hết lượt khách. Kết quả đúng: hiện nút "Đăng nhập". Đăng nhập xong quay lại, phiên vẫn còn.

## Ảnh / video
- **Chưa có.** Expo Web chạy được, nhưng khung trình duyệt dùng để chụp không gọi được core (`localhost:8080`) và AI (`:8000`): mọi request đều `Failed to fetch`, trong khi `curl` từ máy vẫn gọi được.
- Cần chụp lại trên trình duyệt thường hoặc máy ảo Android trước khi mở PR (RULES §10 FE).

## Ảnh hưởng tới phần của người khác
- Có:
  - `apps/mobile` (chị Trang): `features/assistant/*`; `features/feed/reel-social-overlay.tsx` và `trip-plan-sheet.tsx`, mỗi file 1 dòng truyền `postId`.
  - `packages/api-client`, `packages/i18n`, `packages/app-core`: chỉ thêm, không đổi chữ ký đang dùng.
- Đã soạn tin báo, chờ chị Trang đồng ý trước khi mở PR.
