# SCRUM-167 — Thiết kế lại lời chào, bubble và thẻ Tripi (mobile)

- Jira: https://tripflix.atlassian.net/browse/SCRUM-167 · Nhánh: `trang/SCRUM-167-thiet-ke-lai-chat-tripi` · Người làm: Trang (dùng AI: có) · Ngày: 18/11/2026

## Đã làm
Chỉ đổi presentation; không đổi API, dữ liệu, luồng gửi/nhận, lưu lịch sử hay hành động trên thẻ.

- **Đang suy nghĩ**: thay vòng xoay + "Tripi đang chuẩn bị gợi ý…" bằng Tripi ảnh động "đang tìm", bong bóng 3 chấm nhảy và câu trạng thái đổi dần ("Tripi đang lục bản đồ…", "Đang xem reel hợp gu bạn…"…). Header đổi chấm trạng thái sang vàng và ghi "Đang suy nghĩ…". Giảm chuyển động: chấm đứng yên, ảnh tĩnh, câu không đổi.
- **Lời chào gọn**: một Tripi (ảnh động chào), một câu chào + một câu hỏi, ba gợi ý (giữ nguyên nhãn và nội dung gửi). Bỏ eyebrow viết hoa và đoạn mô tả để bớt tầng.
- **Tin nhắn**: chữ 15/22 (trước ~12/16). Bong bóng bo tròn, avatar Tripi chỉ ở tin đầu của một lượt. Thẻ, nút đăng nhập và gợi ý nằm thành khối riêng dưới lời giải thích, không ép vào bong bóng hẹp. Gợi ý có nhãn "Hỏi tiếp Tripi". Tin mới trượt nhẹ lên (tắt khi giảm chuyển động).
- **Lộ trình**: timeline dọc theo ngày. Mỗi ngày một nhãn, mỗi mốc có huy hiệu buổi (Sáng/Chiều/Tối kèm icon), tên điểm đậm, quãng đường + phút; đường nét đứt nối các mốc. Tiêu đề có tóm tắt "2 ngày · 5 điểm dừng". Lộ trình của reel ("Ngày 1" + "hoạt động · nơi") đọc được cùng cách; dòng lạ hiện nguyên văn.
- **Thời tiết**: mỗi ngày một hàng có icon trời, nhiệt độ lớn, chip % mưa. **Checklist** có dấu tick, **so sánh** giữ nút Chọn, **phòng/vé/bài** là khối riêng có giá + mũi tên.
- Logic tách dữ liệu thẻ đặt ở `packages/app-core/src/assistant-card-format.ts` (thuần, có test), không đổi dữ liệu gốc.

## Đối chiếu tiêu chí
| Tiêu chí (Jira) | Đạt | Bằng chứng |
|---|---|---|
| Câu trả lời dài + 5 thẻ có nhịp quét rõ, không cần nheo mắt | Có | `verify-assistant-chat-design.cjs` bước "trả lời dài + 5 thẻ"; ảnh `*-e-long-5-cards.png` |
| Ảnh trước/sau 375/390/430 với nội dung dài và các trạng thái | Có (web Expo) | Trước: 4 màn ở 390; sau: chào, đang nghĩ, lộ trình, thời tiết, dài + 5 thẻ ở 375/390/430 |
| Hành động, dữ liệu, đường quay lại không hỏng | Có | Gợi ý mở đầu, gửi, Chọn/Hoàn tác/Xem reel/Đặt theo lộ trình, mở phòng/vé giữ nguyên code điều hướng; script kiểm đủ chữ/dữ liệu hiện ra |
| Bàn phím thật thấy ô nhập và tin mới; đổi cỡ chữ không che thẻ/nút | Chưa kiểm trên máy thật | Bố cục ô nhập/KeyboardAvoidingView không đổi |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`: 22/22 task thành công. app-core 206 test (6 test mới cho `assistant-card-format`). Lint mobile 0 lỗi, cảnh báo có sẵn ở file khác.
- `node tools/verify-assistant-chat-design.cjs` (Expo web, AI giả lập SSE): pass ở 375 (giảm chuyển động), 390, 430; không tràn ngang, không lỗi runtime.

## Cách kiểm lại
1. `cd apps/mobile && npx expo start --web --port 8090`.
2. `MOBILE_PREVIEW_URL=http://localhost:8090 PLAYWRIGHT_PACKAGE=<playwright> node tools/verify-assistant-chat-design.cjs`.

## Giới hạn
- Chưa chụp/quay trên Android thật (RULES mục 10) và chưa thử bàn phím thật, cỡ chữ lớn của hệ thống.
- `tools/verify-assistant-mobile.cjs` chờ câu trả lời demo (bản không có AI); bản hiện tại luôn gọi AI nên script này cần AI chạy thật. Chỉ đổi dòng chờ eyebrow sang câu chào mới.
- Giá trên thẻ phòng/vé vẫn chưa ghi đơn vị/kỳ ở: thuộc SCRUM-132, không làm trong task này.

## Ảnh / video
- Ảnh trước/sau do script sinh ra, đính trong PR; không commit ảnh vào repo.

## Ảnh hưởng tới phần của người khác
- `apps/mobile` của Trang. `packages/app-core` (thêm file + 1 dòng export), `packages/i18n/src/assistant.ts` (chỉ thêm khoá; web không đổi). Không đụng AI, BE.
