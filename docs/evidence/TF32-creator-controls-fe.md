# TF32 — Trạng thái chờ duyệt, bộ lọc chủ bài và menu bài viết

- Phạm vi: yêu cầu trực tiếp của người dùng trong chat; tiếp tục luồng kiểm duyệt TF32.
- Nhánh nguồn: `feature/creator-comment-controls`; nhánh PR: `trang/TF32-bo-loc-chu-bai`.
- Ngày: 18/11/2026. Dùng AI: có.

## Thay đổi và nghiệm thu

- [Held cho tác giả và bộ lọc bình luận](2026-11-18-held-creator-controls.md): chức năng, cách thử, kết quả test và giới hạn native.
- [Menu tùy chọn bài viết](2026-11-18-post-options-menu.md): menu theo quyền, sửa/quyền xem/xóa/báo cáo, kiểm tra Web với API thật.
- Web: 170 test đạt. API client: 244 test đạt. Mobile: 4 test held/hidden và 2 test quyền menu đạt; Android bundle/typecheck đạt.
- Đã xem ảnh Web 1440px/390px. Chưa kiểm tương tác trên Android/iOS thật; không coi bundle là nghiệm thu thiết bị.

## Ảnh hưởng

Web (Thành), Mobile (Trang), API client và i18n. Không thêm thư viện. FE phụ thuộc các endpoint comment controls trong PR BE tương ứng; triển khai BE/migration trước khi thử đầy đủ tính năng mới.

Phần CTA đặt combo lộ trình đang được chỉnh riêng trong workspace không nằm trong PR này.
