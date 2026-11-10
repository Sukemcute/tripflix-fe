# TF31 — Nối chat Tripi trên mobile với trợ lý AI

- Notion: TF31 · Nhánh: `bao/TF31-noi-chat-tripi-mobile` · Người làm: Quốc Bảo (dùng AI: có) · Ngày: 2026-11-10

## Đã làm
- `packages/api-client`: `sendAssistantMessage` gọi `POST /chat` của AI service, đọc luồng SSE thành câu trả lời và thẻ gợi ý. Tách `httpRaw` từ `http.ts` (gắn token, tự refresh khi 401) để đọc phản hồi dạng stream; gửi `credentials: 'omit'` vì AI không dùng cookie. Sinh lại client `ai-service` (`ChatRequest`).
- `apps/mobile`: adapter `assistant-transport.ts` nối khung chat Tripi (Trang làm) với AI; chưa đăng nhập thì Tripi nhắc đăng nhập thay cho lỗi chung.
- Khung chat: tin nhắn của Tripi mang thêm thẻ. Thẻ video hiện như Reels (ảnh bìa lấy từ feed); bấm vào thì thu nhỏ chat và nhảy tới đúng reel ở tab Reels, đủ nút tim, bình luận, lưu, chia sẻ. Thẻ nơi ở và lịch trình mở trang chi tiết.
- `reels-screen.tsx`: nhận tham số `reel` (id bài), tải thêm feed tối đa 5 trang rồi cuộn tới reel đó.
- Biến môi trường mới `EXPO_PUBLIC_AI_URL` (ghi trong `.env.example`).

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Chat Tripi trả lời thật từ AI | Có | Expo web: "Tim khach san o Da Nang" → 5 khách sạn kèm giá |
| Hiện thẻ video phù hợp | Có | "muon di Da Lat san may" → thẻ "Săn mây Đà Lạt 4h sáng…" có ảnh bìa |
| Bấm thẻ mở đúng reel ở giao diện Reels | Có | Reels nhảy tới reel Săn mây Đà Lạt (tim 109, bình luận 3, lưu 42, chia sẻ 19) |
| Chưa đăng nhập thì báo rõ | Có | AI trả 401 → Tripi nhắc đăng nhập |

## Kết quả kiểm tra
`pnpm turbo run lint typecheck test --filter=@tripflix/mobile --filter=@tripflix/api-client --filter=@tripflix/i18n`: 8/8 task pass; api-client 108 test pass (có `assistant.test.ts`), i18n 2 test pass.

## Cách kiểm lại
1. Chạy BE (`pnpm stack:be`) và AI service (`uv run uvicorn app.main:app --port 8000` trong `tripflix-ai`, nhánh `bao/TF31-tro-ly-goi-y`).
2. `cd apps/mobile`, đặt `EXPO_PUBLIC_API_URL=http://localhost:8080`, `EXPO_PUBLIC_AI_URL=http://localhost:8000`, chạy `pnpm exec expo start --web --port 3100` (phải cổng 3100 vì CORS của core).
3. Đăng nhập `member@tripflix.local`, vào Reels, bấm bóng Tripi, nhắn "muon di Da Lat san may", bấm thẻ video.

## Ảnh / video
- Đính kèm trong PR.

## Ảnh hưởng tới phần của người khác
- Có: `apps/mobile` (chủ: Trang) — `assistant-provider.tsx`, `assistant-chat.tsx` (khung chat Tripi), `reels-screen.tsx`. Chỉ thêm, kiểu cũ vẫn chạy. Người dùng báo đã được chị Trang đồng ý.
- `packages/api-client/src/http.ts`: tách hàm, `http()` giữ nguyên hành vi.
- Phụ thuộc hợp đồng `/chat` ở repo `tripflix-ai` (nhánh `bao/TF31-tro-ly-goi-y`).
