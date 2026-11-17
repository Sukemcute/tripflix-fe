# TF23 — App gửi sự kiện xem Reels và bấm đặt từ Reels (phần FE của Phong)

- Jira: SCRUM-27 · Nhánh: `phong/TF23-su-kien-xem-reels` · Người làm: Phong (dùng AI: có) · Ngày: 2026-11-16, kiểm lại 2026-11-17
- BE tương ứng: nhánh `phong/TF23-su-kien-xem-reels` của `tripflix-be` (`POST /api/v1/feed/events`). Merge BE trước.

## Đã làm
- `packages/api-client/src/feed-events.ts`:
  - `FeedEventQueue`: gom sự kiện, gửi khi đủ 20; lỗi mạng hay 5xx thì giữ lại (cùng `eventId`), BE trả 4xx thì bỏ lô; giữ tối đa 200 sự kiện mới nhất; bỏ qua id không phải uuid (Reels mẫu).
  - `ReelViewClock`: chỉ cộng thời gian lúc đang phát, lướt dưới 1 giây không tính, đổi bài hay app vào nền thì chốt một lượt xem.
- `apps/mobile/src/features/feed/feed-events.ts`: một hàng đợi cho cả app, gửi mỗi 10 giây và khi app vào nền; mã khách `X-Anon-Id` sinh một lần, lưu trong SecureStore (web chưa gửi).
- `reels-screen.tsx`: đếm giờ xem của reel đang hiện, chỉ khi màn đang mở, app ở nền trước, có mạng, không tạm dừng, không ở màn khởi động; Reels mẫu không gửi.
- `trip-plan-sheet.tsx`: nút "Đặt" gửi `booking_click` kèm `hotelId`.
- Sinh lại client `core-api` cho endpoint mới; chỉ giữ phần feed, bỏ thay đổi sinh kèm của discovery (không thuộc task).

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| App gửi lượt xem thật của Reels | Có | `feed-events.test.ts` › ReelViewClock (2 test) |
| Gửi theo lô, không mất khi lỗi mạng ngắn, không gửi lại lô sai mãi | Có | `feed-events.test.ts` › FeedEventQueue (4 test) |
| App gửi sự kiện bấm đặt từ lộ trình trên Reels | Có | `trip-plan-sheet.tsx`; kiểm trên máy thật sau khi BE lên staging |

## Kết quả kiểm tra
- 17/11, sau khi ghép vào `develop` `3359cb2` (giải xung đột `reels-screen.tsx` với TF82 #191, giữ cả hai đoạn); sinh lại client từ OpenAPI của nhánh BE, phần `core-api` không đổi: `pnpm turbo run lint typecheck test --affected` 22/22 tác vụ đạt; api-client 233 test đạt; lint mobile 12 cảnh báo, bằng develop (không có cảnh báo mới).

## Cách kiểm lại
1. `pnpm --filter @tripflix/api-client exec vitest run src/feed-events.test.ts`.
2. Sau khi BE lên staging: cài app, xem một reel hơn 15 giây rồi lướt sang bài khác, đợi 10 giây; trên server `dc exec -T redis redis-cli XREVRANGE stream:app-events + - COUNT 5` thấy `content.post.viewed`.

## Chưa làm
- `X-Anon-Id` cho mọi request (để đăng nhập gộp gu khách, `access.user.guest_merged`): cần sửa `packages/api-client/src/http.ts` và luồng đăng nhập, để task riêng.
- Lưu hàng đợi xuống máy khi tắt app.
- Đổi màn Reels sang endpoint xu hướng của Duy: chờ Duy làm xong.

## Ảnh / video
- Không đổi giao diện.

## Ảnh hưởng tới phần của người khác
- `apps/mobile` (Trang): thêm `feed-events.ts`, sửa 2 file feed (thêm 8 dòng, không đổi hành vi hiển thị). Cần báo Trang.
- `packages/api-client`: thêm file mới, sửa `index.ts` (chỉ thêm export) và code sinh.
