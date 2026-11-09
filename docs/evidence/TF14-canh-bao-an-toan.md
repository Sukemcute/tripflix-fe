# TF14 — Hiện cảnh báo an toàn trong khối tóm tắt AI (mobile, web)

- Jira: [SCRUM-18](https://tripflix.atlassian.net/browse/SCRUM-18) · Nhánh: `trang/TF14-canh-bao-an-toan` · Người làm: Trang (dùng AI: có) · Ngày: 2026-11-08

## Đã làm
- Mobile `features/feed/post-summary.tsx` và web `features/social/post-summary.tsx`: khi `hasSafetyWarnings`, hiện khối "Lưu ý từ cộng đồng" (nền vàng nhạt) phía trên đoạn tóm tắt, dùng chuỗi i18n `summary.safety` có sẵn.
- Chỉ dựa vào `safety.warnings` (đã công khai); `pendingWarnings` bị core lọc ở GET công khai.
- Chưa làm: hiện loại cảnh báo (ngộ độc, tai nạn…) và link tới bình luận gốc (`categories`, `commentIds` đã có trong API).

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Có cảnh báo an toàn thì hiện rõ cho người dùng | Có | khối `summary-safety` (mobile), `role="note"` (web) |

## Kết quả kiểm tra
- `turbo run typecheck lint test` cho web, mobile, api-client: 7/7 task pass, api-client 91 test pass; prettier sạch.

## Cách kiểm lại
1. Bài có tóm tắt với `safety.warnings` khác rỗng → mở "Tóm tắt từ cộng đồng" → thấy khối "Lưu ý từ cộng đồng".

## Ảnh / video
- Web (khổ 1280 px và 390 px): ảnh đính kèm trong PR #62. Chạy web của nhánh với stack local (`next dev -p 3101`, API thật qua gateway), riêng response `GET ai-summary` được giả lập có `safety.warnings` vì dữ liệu local chưa có bài nào có cảnh báo.
- Mobile: chưa chụp, cần chạy Expo.

## Ảnh hưởng tới phần của người khác
- Không.
