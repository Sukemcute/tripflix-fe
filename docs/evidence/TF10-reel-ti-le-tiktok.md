# TF10 — Tỉ lệ reel theo TikTok, caption, đăng bài chỉ có caption

- Notion: (chưa có link) · Nhánh: `bao/TF10-reel-ti-le-tiktok` · Người làm: Bảo (dùng AI: có) · Ngày: 2026-11-12

## Đã làm

- Thanh tab: có đệm trên để icon không chạm mép, icon 24, chữ 10, nút tạo ô ngang 44×30.
- Cột hành động reel:
  - Icon 28 theo chuẩn 390pt, tự co giãn theo `getReelScale`.
  - Bỏ cờ báo cáo; vẫn báo cáo được ở trang chi tiết bài.
  - Cả cột nút nằm trên dòng tác giả (đáy cột chạm đỉnh dòng tác giả), chừa góc dưới phải cho tính năng sau.
  - Cột không nhảy theo caption khi mở hoặc thu gọn: chỉ đo lại khi hiệu ứng thu gọn đã xong.
- Chữ trên reel:
  - Tác giả 16 đậm, avatar 26. Caption 14/19, rộng 3/4 màn hình.
  - "Xem lộ trình" cao 30, chữ 13.
- Caption thu gọn tối đa 3 dòng, "… Xem thêm" ngay cuối dòng 3.
  - Mở rộng tối đa 1/3 màn hình, quá thì cuộn trong khung.
  - Web không có `onTextLayout` nên ước lượng chỗ cắt theo số ký tự.
- Đăng bài chỉ còn ô caption:
  - Core vẫn bắt buộc `title`, nên app lấy dòng đầu caption (tối đa 100 ký tự) làm tiêu đề: `getPostTitleFromCaption`.
  - Reel không tách tiêu đề in đậm. Bài cũ ghép "tiêu đề · nội dung": `getPostCaption`.

## Kết quả kiểm tra

- `pnpm turbo run lint typecheck test --filter=@tripflix/mobile --filter=@tripflix/app-core`: đạt.
  - app-core 88 test.
  - Mobile lint còn 1 cảnh báo có sẵn ở `reels-screen.tsx`.
- Expo web, khung iPhone 14 Pro Max 430×932, đo DOM:
  - Thanh tab cao 52, icon cách mép trên 6.
  - Đáy cột nút = đỉnh dòng tác giả (y=747).
  - Caption kết thúc ở 3/4 bề ngang.
  - Theo dõi mỗi 30ms qua một lần mở rồi thu gọn: nút chia sẻ đứng yên ở y=505 trong hơn 280 lần đo.
  - Màn đăng bài không còn ô "Tiêu đề".

## Cách kiểm lại

1. Chạy BE local và `pnpm exec expo start --web` trong `apps/mobile`, mở ở khung 430×932.
2. Reel:
   - Caption dài hiện 3 dòng kèm "… Xem thêm".
   - Bấm "Xem thêm" thì mở tối đa 1/3 màn hình; "Thu gọn" thì cột icon đứng yên.
3. Đăng bài (đăng nhập): chỉ có ô caption; bài đăng xong có tiêu đề là dòng đầu caption.

## Ảnh / video

- Ảnh chụp Expo web trong phiên làm việc. Ảnh Android thật cần chụp bổ sung.

## Ảnh hưởng tới phần của người khác

- Có: `apps/mobile` (Trang) — reel, thanh tab, màn đăng bài.
  - Hằng số cỡ chữ và icon đặt riêng trong file reel và thanh tab; token dùng chung `mobile-scale` không đổi.
- Không đổi API.
