# TF82 — App: video Reels lỗi thì xin lại cookie CloudFront rồi tải lại

- Jira: SCRUM-103 (TF82) · Nhánh: `phong/TF82-app-403-refresh` · Người làm: Phong (dùng AI: có) · Ngày: 2026-11-17

## Đã làm
- Lý do: khoá video trên CloudFront đã bật từ 17/11. App xin cookie trước khi hết hạn 30 phút (#184), nhưng chưa xin lại khi video lỗi như web (#188). Nếu app nằm nền lâu hơn hạn cookie (6 giờ) hoặc đồng hồ máy lệch, video sẽ lỗi cho tới khi người dùng tắt hẳn app.
- `packages/app-core/src/reels.ts`, hàm mới `shouldRefreshPlaybackForReel`: Reel đang xem báo lỗi thì xin cookie mới. Mỗi Reel chỉ xin một lần, để lỗi không do cookie (video hỏng) không làm app xin cookie lặp mãi.
- `apps/mobile/src/features/feed/reels-screen.tsx`: khi Reel đang xem lỗi, gọi `refresh` của `usePlaybackSession`, xong thì tăng `retry` của Reel đó (giống nút "Thử lại"). `use-player-pool` đọc cookie lúc gắn nguồn, nên lần tải lại dùng cookie mới.
- expo-video không cho biết mã HTTP của lỗi, nên app không phân biệt được 403 với lỗi khác. Vì vậy mới giới hạn mỗi Reel một lần.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| App xin lại cookie khi player gặp lỗi | Có | `reels.test.ts`: `shouldRefreshPlaybackForReel` |
| Không xin lặp khi lỗi không do cookie | Có | `reels.test.ts`: "đã xin cho Reel này rồi mà vẫn lỗi" |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected`: 22/22 tác vụ đạt. app-core `reels.test.ts` 20/20 (3 test mới). Không có cảnh báo lint mới; 2 cảnh báo `set-state-in-effect` trong `reels-screen.tsx` có sẵn từ trước.
- Chưa thử trên máy: trường hợp cookie hết hạn khó tạo lại khi hạn là 6 giờ.

## Cách kiểm lại
1. `pnpm --filter @tripflix/app-core exec vitest run src/reels.test.ts`
2. Trên máy thật: đặt `MEDIA_PLAYBACK_TTL_SEC=300` trên staging rồi tạo lại core-api. Mở Reels, cho app vào nền hơn 5 phút rồi mở lại. Video đang xem lỗi một lúc, sau đó tự phát lại, không cần bấm "Thử lại". Thử xong thì đặt lại `21600`.

## Ảnh / video
- Không đổi giao diện.

## Ảnh hưởng tới phần của người khác
- `apps/mobile` (Trang): thêm một effect trong `reels-screen.tsx`, không đổi phần cũ.
- `packages/app-core`: thêm một hàm, không đổi export cũ.
