# TF25 — Reels web: khung rộng thích ứng kiểu TikTok Web

- Jira: [SCRUM-29](https://tripflix.atlassian.net/browse/SCRUM-29) · Nhánh: `thanh/TF25-reels-web-khung-rong` · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-12

## Đã làm
- **Khung giữa rộng**: bỏ `aspect-ratio: 9/16` của `.mediaStageFrame`, khung lấp toàn bộ cột giữa giữa hai sidebar, giữ bo góc và nền tối.
- **Video giữ tỷ lệ gốc, góc vuông**: `object-fit: contain`, `border-radius: 0` cho video và poster chờ. Video dọc chừa hai bên, video ngang trải theo chiều ngang, phần trống là nền mờ từ poster sẵn có.
- **Cụm lên/xuống trong khung, sát mép phải**: tâm cụm trùng giữa chiều cao khung; khung thấp thì đẩy lên vừa đủ (`min()`) để không chồng cột tương tác; khung dưới 600px cao thì ẩn (vẫn chuyển bài bằng cuộn và phím mũi tên).
- **Cột tương tác góc dưới phải**: Thích, Bình luận, Lưu, Chia sẻ bỏ nền tròn, giữ vùng bấm 44px, thêm bóng đổ để rõ trên video sáng; giữ nguyên handler và trạng thái active. Bỏ avatar tác giả khỏi cột (ảnh mẫu không có; đường vào trang chi tiết vẫn có ở cụm nút góc trên phải).
- **Chú thích, hashtag, thẻ lộ trình góc dưới trái**: rộng tối đa 600px để dễ đọc, chừa 104px bên phải cho cột tương tác; thanh tiến độ thụt vào hai bên, bo tròn.
- **Đóng/mở sidebar chuyển mượt**: lưới luôn 5 cột (sidebar, khoảng cách, khung, khoảng cách, sidebar), cột đóng về 0px nên `transition: grid-template-columns` nội suy được (trước đây đổi số cột nên nhảy cóc). Chỉ đổi CSS nên video không mount lại, không phát lại từ đầu.
- **Màn hẹp (< 1024px)**: giữ khung 9:16 như cũ.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Khung rộng lấp vùng giữa, video góc vuông, không méo | Có | `.mediaStageFrame`, `.mediaVideoElement` trong `live-posts.module.css` |
| Lên/xuống canh giữa độc lập, tương tác góc dưới phải không nền | Có | `.navArrowsCluster`, `.stageSideDock`, `.verticalActionCircle` |
| Chú thích không đè cột tương tác | Có | `.stageBottomOverlay` padding phải 104px, nội dung tối đa 600px |
| Đóng/mở sidebar chuyển mượt, video không phát lại | Có | lưới 5 cột cố định, chỉ đổi CSS |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/web`: 3/3 task thành công, 19 test pass, lint 0 lỗi (không có warning ở file đã sửa).

## Cách kiểm lại
1. Chạy web, mở `/inspiration?view=reels` trên màn ≥ 1024px.
2. Xem một Reel dọc và một Reel ngang: video không bị cắt, góc vuông, nằm giữa khung.
3. Đóng/mở sidebar Lịch trình và Bình luận: khung co giãn mượt, video phát tiếp không bị dừng.
4. Thu chiều cao cửa sổ: cụm lên/xuống không đè cột tương tác.

## Ảnh / video
- Không đính kèm (theo yêu cầu).

## Ảnh hưởng tới phần của người khác
- Không. Chỉ sửa `apps/web/src/features/social/live-posts.tsx` và `live-posts.module.css`.
