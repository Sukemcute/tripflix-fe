# TF25 — Reels web khung rộng, sidebar mới và hoàn thiện tab Cảm hứng

- Jira: [SCRUM-29](https://tripflix.atlassian.net/browse/SCRUM-29) · Nhánh: `thanh/TF25-reels-web-khung-rong` · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-12

## Đã làm

### Reels web
- **Khung rộng thích ứng kiểu TikTok Web**: khung giữa lấp vùng giữa hai sidebar; video `object-fit: contain`, góc vuông, giữ tỷ lệ gốc (dọc chừa hai bên có nền mờ từ poster, ngang không bị cắt). Màn < 1024px giữ khung 9:16.
- **Cột tương tác đi theo từng video**: mỗi Reel có cột Thích/Bình luận/Lưu/Chia sẻ riêng (`ReelActionRail`), không nền tròn, số sát icon; cụm Lên/Xuống cố định trong khung, canh giữa và tự đẩy lên khi khung thấp để không chồng cột tương tác.
- **Thanh tiến độ mượt**: cập nhật mỗi khung hình bằng `requestAnimationFrame` qua ref thay cho `setState` theo `timeupdate` (~4 lần/giây), không render lại cả viewer.
- **Chú thích, hashtag, thẻ lộ trình** góc dưới trái, rộng tối đa 600px.
- **Đóng/mở sidebar mượt**: lưới luôn 5 cột, cột đóng về 0px nên `grid-template-columns` nội suy được; video không mount lại.

### Sidebar (dùng chung Reels và tab Bài viết)
- **Lịch trình**: ảnh hero tràn viền có gradient, tên và chip ngày/chi phí đè lên ảnh; tab dạng viên thuốc; timeline có số ngày trong vòng tròn coral nối bằng đường kẻ.
- **Bình luận**: header cùng kiểu, avatar màu theo tên (`getAvatarTone`), bình luận hiện dần khi tải xong; giữ kiểu không khung và đường kẻ phản hồi như cũ.
- **Ô nhập kiểu TikTok**: avatar và nút gửi nằm ngoài, viên thuốc viền mảnh nền sáng nhẹ; bỏ viền focus teal của `globals.css` lộ ra trong viên thuốc.
- **Chọn emoji**: nút mặt cười trong ô nhập mở bảng emoji (96 emoji hay dùng + hàng dùng gần đây lưu trên trình duyệt); chèn đúng vị trí con trỏ, vẫn gõ được khi bảng mở, con trỏ không rời ô nhập. Không thêm thư viện.
- Hai sidebar cùng nền kính mờ, bo góc, bóng; màu lấy từ token.

### Tab Bài viết
- **Sửa vỡ bố cục**: panel bình luận dùng chung class với Reels từng bị gắn `grid-column: 5`; nay chỉ đặt cột khi nằm trong lưới Reels.
- **Màn < 1024px**: Lịch trình và Bình luận mở thành bottom sheet (trước đây bị ẩn hẳn, bấm không có gì xảy ra); Lịch trình chỉ mở sẵn trên màn rộng (`useIsWideScreen`).
- **Hiệu ứng đóng/mở sidebar**: lưới 5 cột cố định + `usePresence` giữ sidebar thêm một nhịp khi đóng để mờ dần, trượt ra; bottom sheet trượt lên/xuống. Tắt khi người dùng chọn giảm chuyển động.
- **Cuộn mượt khi lăn chuột ngoài cột bài viết**: trượt về đích bằng `requestAnimationFrame` thay cho cộng thẳng `scrollTop` (nhảy cóc); bỏ qua cả thẻ `<dialog>` để không cuộn bảng tin phía sau hộp xem ảnh.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Khung Reels rộng, video góc vuông không méo | Có | `.mediaStageFrame`, `.mediaVideoElement` (`live-posts.module.css`) |
| Cột tương tác theo từng video, thanh tiến độ mượt | Có | `ReelActionRail`, effect `requestAnimationFrame` trong `MediaTrackItem` |
| Sidebar mới đồng bộ hai màn | Có | `itinerary-sidebar-panel.tsx`, `.rightPanel`; `avatar-tone.test.ts` |
| Chọn emoji khi bình luận | Có | `emoji-picker.tsx`; `emoji-picker-data.test.ts` |
| Tab Bài viết đúng bố cục, có bottom sheet trên màn hẹp, đóng/mở mượt | Có | `social-feed.module.css`, `use-presence.ts`, `use-wide-screen.ts` |
| Cuộn ngoài cột bài viết mượt | Có | `smooth-wheel-scroll.test.ts` |

## Kết quả kiểm tra
- Sau khi merge `origin/develop` (2026-11-12): `pnpm turbo run lint typecheck test --filter=@tripflix/web --filter=@tripflix/api-client --filter=@tripflix/app-core --filter=@tripflix/mobile --filter=@tripflix/i18n` — 14/14 task thành công; web 34, api-client 176, app-core 86, i18n 2 test pass; lint 0 lỗi (không có warning ở file đã sửa).
- `usePresence` chưa có test tự động vì web chưa có thư viện test hook React; đã kiểm bằng tay trên trình duyệt.

## Cách kiểm lại
1. Mở `/inspiration?view=reels` (≥ 1024px): xem Reel dọc và ngang, lướt bằng touchpad, đóng/mở hai sidebar.
2. Mở `/inspiration` (tab Bài viết): đóng/mở sidebar, lăn chuột ở vùng trống hai bên cột bài viết; thu cửa sổ < 1024px rồi bấm Lịch trình, Bình luận.
3. Ở panel bình luận: bấm nút mặt cười, chọn vài emoji, gõ tiếp, nhấn Esc.

## Ảnh / video
- Không đính kèm (theo yêu cầu).

## Ảnh hưởng tới phần của người khác
- Không. Chỉ sửa `apps/web/src/features/social` và thêm key vào `packages/i18n/src/api.ts`. Đã merge `origin/develop` mới nhất, không conflict.
