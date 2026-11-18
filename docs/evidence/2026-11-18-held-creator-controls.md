# Nghiệm thu held cho tác giả và bộ lọc bình luận

Ngày: 18/11/2026. Nhánh: `feature/creator-comment-controls`.

## Chỗ để thử trên Web

Mở `http://localhost:3100`, đăng nhập rồi vào **Cảm hứng**.

1. Mở bình luận của bài do mình đăng. Trên điện thoại cần bấm nút bình luận của bài.
2. Mở **Quản lý bình luận** ở đầu khung bình luận.
3. Nhập từ khóa, mỗi dòng một mục, rồi bấm **Lưu thay đổi**. Ví dụ `đặt cọc`.
4. Dùng tài khoản khác bình luận có cụm `ĐẶT CỌC`. Người bình luận thấy nội dung và nhãn chờ chủ bài duyệt; khách không thấy bình luận này, số đếm công khai không tăng.
5. Chủ bài mở **Bình luận cần bạn duyệt**, chọn **Cho hiển thị** hoặc **Từ chối**. Hàng chờ làm mới khi mở và mỗi 10 giây trong khi mở.
6. Bỏ chọn **Cho phép bình luận** và lưu. Tài khoản khác thấy thông báo đã tắt; API cũng chặn đăng mới. Bản nháp đang gõ được giữ lại khi bật lại.

Nếu nền tảng đồng thời đang giữ/ẩn/gỡ bình luận, hàng chờ giải thích hạn chế đó. **Cho hiển thị** của chủ bài không bỏ quyết định nền tảng.

## Held dành cho tác giả

- Đăng bài bị luật nhanh giữ: toast ghi **Bài viết đang được kiểm tra, chưa hiển thị công khai.** Không chèn bài held vào cache feed công khai.
- Vào **Tài khoản → Bài đăng của tôi** (`/account?tab=mine`) để tìm lại bài và trạng thái held.
- Bình luận held hiển thị nội dung riêng và lý do (nền tảng kiểm tra/chủ bài giữ/chủ bài từ chối). Chỉ cho tác giả xóa; không cho thích, trả lời hay báo cáo trong trạng thái này.
- Sửa bài đã có lấy trạng thái thật từ API; không gọi publish lại nếu bài đã qua bước draft.

## Mobile

- Luồng đăng trực tiếp và tiến trình upload nền dùng trạng thái API thật để hiển thị held.
- Tab **Tôi → Đang kiểm tra** cho tác giả tìm lại bài held sau khi đóng màn đăng bài; tab chỉ có trên hồ sơ của mình.
- Mở bài của mình, vào phần bình luận → **Quản lý bình luận** để bật/tắt, sửa keyword và duyệt hàng chờ.
- Composer giữ draft khi chủ bài tắt. Bình luận held có nội dung, lý do và quyền xóa tương tự Web.

## Kết quả kiểm tra

| Kiểm tra | Kết quả |
|---|---|
| Web unit tests | 170 đạt |
| API client unit tests | 244 đạt |
| Mobile held/hidden component tests | 4 đạt; render React với native UI stub |
| Typecheck Web, Mobile, API client | Đạt |
| Web/Mobile/API client lint | Không lỗi; repo còn warning |
| Kiểm tra ranh giới FE và diff whitespace | Đạt |
| Live Web/API local | Đạt với API thật, hai tài khoản và khách |
| Responsive Web | Đã xem ảnh 1440px và 390px; không tràn ngang |
| Android JS/Hermes export | Đạt; không tương đương chạy trên thiết bị |

Script tái kiểm: `tools/verify-creator-comment-controls-live.cjs`. Dùng Playwright và Edge trên máy, `CREATOR_QA_PASSWORD` từ seed local; script lấy mã đăng nhập từ Mailpit local và không ghi mật khẩu, token hoặc OTP vào báo cáo. Script tạo bài QA riêng và xóa trong finally. Chạy nhiều lần liên tiếp có thể chạm giới hạn gửi OTP của tài khoản seed.

Ảnh và kết quả local ở thư mục workspace `outputs/creator-comments-20261118`: `creator-controls-1440.png`, `creator-controls-390.png`, `author-held-post.png`, `author-held-account.png`, `result.json`.

## Giới hạn nghiệm thu

Web/BE đã chạy kiểm tra tương tác thực tế. Mobile đã kiểm type, component và Android bundle; chưa chạy trên Android/iOS thật hoặc emulator trong phiên này. Cần kiểm thêm bàn phím, cuộn hàng chờ, Switch và back navigation trên thiết bị trước khi coi nghiệm thu native hoàn tất.

Chưa triển khai các phần P1/P2 ngoài yêu cầu này: lọc spam/offensive riêng của chủ bài, duyệt tất cả, giới hạn audience bình luận, OCR/ASR/video moderation toàn thời lượng và chế tài tài khoản.
