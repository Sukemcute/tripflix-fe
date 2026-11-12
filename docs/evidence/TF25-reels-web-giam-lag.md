# TF25 — Reels web: giảm lag khi lướt lâu và giữ khung ổn định

- Jira: [SCRUM-29](https://tripflix.atlassian.net/browse/SCRUM-29) · Nhánh: `thanh/TF25-reels-web-giam-lag` · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-12

## Bối cảnh
Lướt Reels web một lúc thì giật: DevTools cho thấy segment `seg_xxx.ts` của video cũ vẫn tải, DOM tăng theo số bài đã lướt, CPU vọt 50–100% mỗi lần đổi bài.

## Đã làm
- **Giới hạn số bài render** (`getReelRenderMode`): chỉ bài đang xem và bài kế tiếp có `<video>` (`preload="auto"`); cách 1–2 bài chỉ hiện poster; xa hơn là khung rỗng giữ chiều cao để cuộn/snap theo chỉ số vẫn đúng. Lướt 5 hay 100 bài thì số bài render đầy đủ vẫn là 5.
- **Giải phóng video khi rời khỏi**: trước khi gỡ thẻ video thì `pause()`, xoá `src`, `load()` để ngắt tải segment, trả bộ đệm và bộ giải mã ngay.
- **Giảm chi phí vẽ**:
  - Bỏ `backdrop-filter` trên lớp phủ đè video đang phát (hashtag, thẻ lộ trình, nút lên/xuống, âm lượng…) – trước đây GPU làm mờ lại mỗi khung hình video – và trên hai sidebar (nền phía sau trơn nên không đổi gì về hình).
  - Nền mờ video vẽ ở 1/4 kích thước rồi phóng to (ít hơn 16 lần điểm ảnh phải làm mờ), dùng poster 360px, lớp riêng; chỉ bật cho bài đang xem và hai bài sát cạnh.
  - Khung tải bình luận: một vệt sáng trượt bằng `transform` thay cho 24 thanh chạy `background-position`.
- **Sidebar Lịch trình không tự ẩn**: theo lựa chọn đóng/mở của người dùng; bài không có lịch trình hiện trạng thái "Chưa có lịch trình", khung video không còn co giãn khi lướt.
- **Mặc định đóng sidebar Lịch trình ở Reels** cho khung video rộng; tab Bài viết vẫn mở sẵn trên màn rộng. Lựa chọn đóng/mở của người dùng giữ khi chuyển tab.
- Loader hai chấm khi tải video đã thử rồi hoàn tác (chưa ưng ý giao diện).

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| DOM không tăng theo số bài đã lướt | Có | `reel-post.test.ts` › lướt 100 bài thì số bài render đầy đủ vẫn cố định; Performance monitor: DOM nodes đứng yên khi lướt ~30 bài |
| Video cũ ngừng tải segment khi lướt qua | Có | effect giải phóng video trong `MediaTrackItem` |
| Giảm chi phí vẽ khi lướt | Có | `live-posts.module.css`, `comment-skeleton.module.css`, `social-feed.module.css` |
| Khung video không co giãn khi lướt qua bài thiếu lịch trình | Có | `showLeftPanel` theo lựa chọn người dùng, kiểm bằng tay |

## Kết quả kiểm tra
- Sau khi merge `origin/develop` (2026-11-12): `pnpm turbo run lint typecheck test --filter=@tripflix/web --filter=@tripflix/api-client --filter=@tripflix/app-core --filter=@tripflix/mobile --filter=@tripflix/i18n` — 14/14 task; web 38, api-client 183, app-core 89, i18n 2 test pass; lint 0 lỗi (không có warning ở file đã sửa).
- Performance monitor khi lướt ~30 bài: DOM nodes ổn định quanh 4.000–5.000 (cả trang), JS heap 27–35 MB được dọn đều.

## Cách kiểm lại
1. Mở `/inspiration?view=reels`, DevTools → Performance monitor, lướt ~30 bài: DOM nodes không tăng dần.
2. Tab Network lọc `.ts`: lướt qua một video thì segment của nó dừng tải.
3. Mở sidebar Lịch trình rồi lướt qua bài không có lịch trình: sidebar hiện "Chưa có lịch trình", khung video giữ nguyên kích thước.

## Ảnh / video
- Không đính kèm (theo yêu cầu).

## Ảnh hưởng tới phần của người khác
- Không. Chỉ sửa `apps/web/src/features/social`. Đã merge `develop` mới nhất, không conflict.
