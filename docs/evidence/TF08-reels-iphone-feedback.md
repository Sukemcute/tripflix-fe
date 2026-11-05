# Reels — phản hồi iPhone / Expo Go

Ngày kiểm tra: 05/11/2026. Phần Reels được đối chiếu với code tại `96f1c97`.

- Nhánh: `trang/TF08-reels-iphone-ux`, tạo từ `origin/develop` tại `3006946`.
- Phạm vi và quyền commit/push/merge: người dùng đã yêu cầu trong chat. Không có link task Notion được cung cấp.
- Chỉ đưa thay đổi Reels vào PR; giữ nguyên các thay đổi Web/commerce khác trong workspace gốc. Giữ các export auth mới trên `develop`.

## Thay đổi

- Chỉ bật `refreshing` khi người dùng kéo làm mới. Refetch nền không bật RefreshControl.
- Tim/lưu cập nhật cache feed và chi tiết bài theo tài khoản, không refetch feed. Hủy request cũ trước optimistic update; hoàn tác riêng trường thay đổi khi lỗi, giữ nguyên phân trang, thứ tự bài và nguồn video. Có thông báo lỗi gọn và nút thử lại.
- Panel thực tế là `ReelCommentsPanel`; PanResponder trong `ReelComments` thuộc giao diện demo khác. Gắn gesture vào panel thực tế bằng Gesture Handler 3 + Reanimated đã có sẵn trong dự án; không thêm dependency native.
- Kéo ở toàn bộ header để đóng. Danh sách chỉ bắt gesture đóng nếu lượt chạm bắt đầu ở đầu danh sách và kéo xuống; kéo lên/ngang hoặc bắt đầu khi đang cuộn giữa danh sách nhường cho ScrollView. Kéo ngắn bật lại, kéo xa hoặc flick đủ nhanh đóng. Animation dùng transform trên UI thread và tôn trọng Reduce Motion.
- Ghim composer dưới panel; header và nút đóng luôn ngoài vùng cuộn.
- Thu gọn nội dung còn tác giả và tối đa hai dòng chữ; “Xem thêm / Thu gọn”, vùng cuộn giới hạn cho nội dung dài, đường dẫn bài đầy đủ khi mở rộng.
- Giữ video 350 ms để tạm ẩn caption, thanh tương tác và header; thả tay hiện lại, không toggle phát/dừng. Có accessibility hint và ẩn các control khỏi accessibility khi đang giữ.
- Chưa thêm tim bình luận thật, chờ API backend. Tính năng demo cũ vẫn độc lập.

## Kết quả tự động

- Mobile: lint và TypeScript đều đạt, không cảnh báo mới.
- API client trên develop mới nhất: lint, TypeScript và 42 test đạt, gồm 6 test cache Reels mới; i18n đạt 2 test.
- Kiểm tra trước commit: `TURBO_SCM_BASE=origin/develop pnpm turbo run lint typecheck test build --affected`: 14/14 task đạt, gồm build Web/Admin.
- `node tools/check-boundaries.mjs`: đạt.
- Playwright / Expo web / Chromium: tim và lưu không phát sinh request feed hoặc đổi bounding box của reel; rollback và thử lại sau 503; mở/thu gọn mô tả dài; giữ/thả không toggle playback; panel, composer ghim, cuộn và gesture đóng ở viewport 320×640, 390×844, 430×932. Không có browser runtime error.
- Fixture HTTP chỉ dùng để kiểm tra UI/cache; không ghi dữ liệu backend. HLS fixture bị chặn có chủ ý nên ảnh có trạng thái lỗi trình phát. Đây không phải bằng chứng phát HLS thành công trên iOS.
- Script: `tests/e2e/reels/feedback.cjs`, page object: `tests/pages/reels-page.cjs`. Có thể đặt `MOBILE_PREVIEW_URL`, `PLAYWRIGHT_PACKAGE`, `PLAYWRIGHT_CHROMIUM_PATH`, `REELS_EVIDENCE_DIR` theo môi trường.
- Kết quả có thể đọc tại `docs/evidence/reels-iphone-feedback/verification.json`. Ảnh `01-collapsed.png`, `02-expanded.png`, `03-comments.png` lưu local ở `%TEMP%/tripflix-reels-feedback/`, không commit ảnh theo RULES.md.

## Cần xác nhận trên iPhone

1. Đang xem reel đầu hoặc reel sau, thích/lưu rồi bỏ thích/bỏ lưu; video giữ nguyên vị trí, không xuất hiện spinner làm mới. Kéo làm mới chủ động vẫn hoạt động.
2. Mở bình luận, cuộn giữa danh sách rồi kéo xuống: danh sách cuộn. Về đầu, bắt đầu lượt kéo xuống mới: panel đóng. Kéo header đóng dù danh sách đang ở giữa. Kéo ngắn, flick nhanh, đổi hướng giữa gesture và mở lại panel.
3. Mở bàn phím, gửi/sửa bình luận, thử lỗi mạng rồi gửi lại; input và nút gửi phải ở trên bàn phím, draft giữ khi request lỗi. Kiểm tra nút đóng, backdrop và VoiceOver escape.
4. Mô tả dài, cỡ chữ hệ thống lớn; mở rộng, cuộn, thu gọn. Giữ/thả video rồi vuốt sang reel tiếp theo: overlay hiện lại và video không bị pause ngoài ý muốn.

Chưa chạy trên thiết bị iPhone hoặc bản release; cảm giác gesture, bàn phím native và hiệu năng phát video cần kiểm tra tại đó.
