# BE-09 đợt 2 — Admin xem bằng chứng video

Nhánh `trang/TF32-be09-khung-hinh`, từ develop sau FE #290.

Admin hiển thị trạng thái lấy mẫu, số frame đã có verdict trên tổng số, thời lượng, khoảng cách lấy mẫu lớn nhất, timestamp và nút mở HLS đúng mốc. Giao diện nói rõ sampling có thể bỏ sót cảnh và chưa quét OCR/âm thanh. Một frame chưa có kết quả không được diễn đạt là sạch. Playback dùng phiên/cookie hiện có của Web và `hls.js` cùng version catalog.

Đã qua 63 Admin tests, typecheck/build, 292 API client tests và kiểm tra ranh giới FE. Playwright chạy trên Edge với Core/Redis/OpenAI thật, xác nhận 3/3 frame, video sẵn sàng tại 2,950 giây, desktop/mobile 390 px không tràn. Ảnh nghiệm thu: [desktop](2026-11-19-be09-video-desktop.png), [mobile](2026-11-19-be09-video-mobile.png). JSON chi tiết ở workspace `outputs/be09-video-acceptance/result.json`.

Do không có AWS credentials, browser nhận file FFmpeg thật qua route QA cho URL CDN và AI adapter đọc đúng file đó; chưa xác nhận CloudFront/CORS thật. Bài fixture được xóa sau kiểm tra. Đưa Admin lên sau migration, worker và Core của cùng nhánh.
