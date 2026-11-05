# TF14 — Card tóm tắt bình luận với Tripi

- Cập nhật: **2026-11-06** · Nhánh: `trang/TF14-giao-dien-tom-tat-ai`.
- Yêu cầu cuối: **chỉ hiển thị đoạn summary, không cần phần chi tiết**.
- Giữ mascot Tripi của Tripflix và luồng BE hiện tại.

## Giao diện cuối

- Card mặc định nằm ở đầu bình luận, có Tripi và nút **Tóm tắt bằng AI**.
- Chỉ gọi GET summary khi bấm nút; không tự tải khi mở bình luận hoặc focus, không polling.
- Kết quả chỉ còn header Tripi, số bình luận được tổng hợp và đoạn summary đầy đủ. Không cắt nội dung bằng giới hạn dòng.
- Bỏ nút xem chi tiết, ô khen/chê, bộ lọc, chủ đề, so sánh video, phần nguồn bình luận và các thông tin phụ.
- Giữ đóng/mở lại từ cache, loading/hủy, trạng thái chưa có hoặc chưa đủ dữ liệu và lỗi/thử lại. Không làm mất bản nháp bình luận.
- Backend vẫn tổng hợp ở background; nút frontend chỉ đọc bản đã lưu. Không thay backend/worker hoặc hợp đồng API.

## File thay đổi

- `apps/mobile/src/features/feed/post-summary.tsx`: card chỉ hiện summary.
- `apps/web/src/features/social/post-summary.tsx`, `post-summary.module.css`: giao diện tương ứng và bỏ style chi tiết.
- `packages/api-client/src/post-summary.ts`: bỏ state mở rộng, lọc và evidence khỏi hook trải nghiệm.
- `packages/i18n/src/summary.ts`: câu giới thiệu ngắn gọn.
- `tools/verify-ai-summary.cjs`: kiểm tra tiêu chí mới, xác nhận không có chi tiết và không gọi API evidence.
- Gỡ callback cuộn evidence đã thêm ở lượt trước khỏi `LiveComments` và sheet; giữ các phần bình luận và điều hướng có sẵn khác.

## Kiểm tra

- `pnpm turbo run lint typecheck test --affected`: **20/20 task thành công**, **98 test đạt** (api-client 61, app-core 34, i18n 2, tokens 1; một phần dùng Turbo cache).
- `node tools/check-boundaries.mjs`: không vi phạm.
- `git diff --check`: đạt.
- UI QA qua `node tools/verify-ai-summary.cjs`: **13 nhóm kịch bản đạt** trên web, mobile detail và sheet bình luận Reels qua Expo web. Kiểm tra chỉ hiện summary dù API có dữ liệu pros/cons/topics; không có nút chi tiết/bộ lọc/evidence và không gọi flat comments. Kiểm tra thêm tải/hủy, cache, không polling/focus refetch, 404 và các status, lỗi/thử lại, giữ bản nháp và web 320px.
- API/session/video QA được mô phỏng; mobile kiểm tra bằng Expo web 390×844, chưa xác minh Android native hoặc Core + Redis + LLM thật.

## Ảnh và cách kiểm lại

Ảnh lưu ngoài repo tại `C:/Users/ADMIN/.codex/tmp/tripflix-ai-summary-only-evidence/`: `reels-01-default.png`, `reels-02-loading.png`, `reels-03-summary.png`, các ảnh web/mobile tương ứng và `verification.json`.

Chạy web ở 3100, Expo web ở 8083, sau đó:

```powershell
$env:PLAYWRIGHT_PACKAGE='C:/Users/ADMIN/.codex/tmp/tripflix-web-qa/node_modules/playwright'
$env:PLAYWRIGHT_CHROMIUM_PATH='C:/Users/ADMIN/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'
$env:SUMMARY_EVIDENCE_DIR='C:/Users/ADMIN/.codex/tmp/tripflix-ai-summary-only-evidence'
$env:TRIPFLIX_MOBILE_WEB_URL='http://localhost:8083'
node tools/verify-ai-summary.cjs
```

## Giải conflict với develop (2026-11-06)

- Gộp `origin/develop` tại `01c2aef` vào nhánh task; conflict duy nhất ở `apps/web/src/features/social/live-comments.tsx`.
- Giữ giao diện bình luận mới của develop: ô viết phía trên, sửa tại chỗ, avatar, trả lời lồng nhau, phân trang và lỗi. Bổ sung lại import/card AI ở đầu luồng gốc; không lặp card trong trả lời và không lặp tiêu đề bình luận của trang chi tiết.
- Cập nhật fixture QA theo trang chi tiết mới: `hashtags`, thời gian đăng và `reactionCounts`. Thêm kiểm tra mở/đóng trả lời vẫn chỉ có một card AI và không tự gọi lại summary.
- `pnpm turbo run lint typecheck test --affected`: 20/20 task thành công, 98 test đạt (13 task dùng cache). Kiểm tra boundaries và diff đạt.
- Chạy lại `node tools/verify-ai-summary.cjs` trên web: 6/6 nhóm kịch bản đạt, gồm summary, trả lời, cache, loading/hủy, trạng thái lỗi/thử lại và 320px. Không có lỗi JavaScript runtime.
- Ảnh sau merge và `verification.json`: `C:/Users/ADMIN/.codex/tmp/tripflix-merge-develop-summary/`.
