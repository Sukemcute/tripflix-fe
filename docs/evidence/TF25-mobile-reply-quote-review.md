# TF25 — Kiểm tra khung trích dẫn trên mobile

Ngày 19/11/2026. Theo dõi góp ý cho [PR #303](https://github.com/Sukemcute/tripflix-fe/pull/303).

## Kết quả đã chạy

| Kiểm tra | Kết quả |
| --- | --- |
| `pnpm --filter @tripflix/mobile test` | 3 pass, 0 fail, 0 skip. |
| `pnpm turbo run test --filter=@tripflix/mobile --force` | Turbo chạy thật task `@tripflix/mobile:test` (0 cache hit). 3 pass, 0 fail, 0 skip. |
| Typecheck mobile | Pass với `node node_modules/typescript/bin/tsc --noEmit -p apps/mobile/tsconfig.json` từ gốc repo. |
| Lint ba file mobile thay đổi | 0 lỗi. Còn cảnh báo `react(set-state-in-effect)` có sẵn trong `live-comments.tsx`. |

Ba test kiểm tra điều kiện hiện quote, nối reply vào cuối trang đã tải mà giữ cursor, và chống trùng khi tải thêm trang. Chạy local trên Node 26.3.1. Workflow CI dùng Node 24 và đã gọi `turbo run test`; thêm script trong package mobile là đủ để Turbo đưa task vào lần chạy CI phù hợp. Chưa có kết quả CI từ xa cho nhánh này.

## Android — chờ kiểm tra và bổ sung ảnh/video

- Mở reply trực tiếp và reply lồng, kiểm tra chỉ reply lồng có khung.
- Chạm khung có trích dẫn, kiểm tra cuộn đúng câu và tô sáng khoảng 1,5 giây. Thử cả khung không còn hiển thị và đích chưa tải.
- Bật TalkBack, kiểm tra tên nút, nội dung trích dẫn, gợi ý thao tác và vùng chạm.
- Gửi reply khi bàn phím mở, kiểm tra gửi một lần, reply ở cuối và không trùng khi tải trang sau.
- Phần panel cần Trang kiểm tra riêng trên Android: Back khi bàn phím mở/đóng, chuyển trang cá nhân rồi quay lại, thanh tab và kích thước panel khi bàn phím hiện/ẩn.

Chưa có máy Android kết nối hoặc emulator trong phiên làm việc này. Chưa có ảnh/video Android và chưa xác nhận kết quả các bước trên.
