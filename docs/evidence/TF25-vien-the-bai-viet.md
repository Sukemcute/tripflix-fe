# TF25 — Viền thẻ Bài viết khi hover

- Phạm vi: brief `codex-fe-ui.md` và yêu cầu trực tiếp trong chat; không có link Notion được cung cấp.
- Nhánh: `thanh/TF25-vien-bai-viet-va-tripi`, base `fb0e210`.
- Worktree: `D:\HCMUT\vinAI\vsf\ota-tripflix\tripflix\wt-fe-ui`.
- Người làm: Thành (dùng AI: có). Ngày: 2026-11-19.

## Đã làm

- Chỉ sửa `apps/web/src/features/social/feed/social-feed.module.css`: viền container trong suốt khi nghỉ, hiện màu `--color-border` khi hover; không còn viền coral riêng của bài đang mở bình luận.
- Chặn hai lớp trang trí `.clippedPostHighlight` và `.hoveredPostShadow` trong CSS module của social. Giữ nguyên component/observer của Bảo và global CSS của Trang.
- Bỏ `:focus-within` khỏi trạng thái hover của container; focus chuột không tạo outline trên nút/link trong thẻ.
- Giữ dấu `:focus-visible` 2px màu `--color-text-muted` trên nút/link. Nút ảnh có outline inset để không bị phần tử cha `overflow: hidden` cắt mất.
- Giữ chiều rộng border 1px nên hover không làm nhảy layout. Không thêm neon/glow/blur/gradient/bóng màu hoặc thư viện.
- Các selector chỉ thuộc PostCard/FeedHighlightFrame của tab Bài viết. Không sửa Reels, globals, TSX hoặc file Tripi.

## Nguồn và lịch sử đã xác minh

Các dòng gốc dưới đây thuộc base `fb0e210`:

- `post-card.tsx:113`–118 gắn `postCardActiveComment` theo `isCommentActive`; article không có tabIndex. `tabIndex={-1}` ở avatar chỉ bỏ link trùng khỏi thứ tự Tab.
- `social-feed.module.css:1485`–1500: `:focus-within`, selector active có độ ưu tiên cao hơn và quy tắc giấu border khi vẽ khung ngoài được Bảo (`Quoc Bao`) thêm/đổi trong `db37cf5`, 2026-11-18 17:26:50 +0700. Màu coral active đã có từ commit `2c84e30` của Thành, 2026-11-17.
- `feed-highlight-frame.tsx:51`–59 dùng hover hoặc focus-within để giữ bóng; `:62`–75 vẽ khung cho bài active khi bị cắt bởi vùng cuộn. File này do Bảo thêm trong `db37cf5`.
- Global focus tại `globals.css:46`–54 do Trang thêm trong `0365a03` / `ed7a12c` ngày 05–06/11; áp dụng cho control, không tạo viền article. Không sửa global CSS.

## Đối chiếu tiêu chí

| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Chỉ viền container hiện khi hover | Có | Kiểm browser idle, mouse focus, active/inactive hover |
| Không có khung nổi khi mở bình luận hoặc cuộn | Có | Trường hợp clipped có `data-highlight-framed=true` nhưng hai lớp overlay đều display none |
| Giữ bàn phím truy cập được | Có | Tab vào nút ảnh: focus-visible true, outline 2px, offset -3px; đã xem ảnh |
| Không sửa globals/component người khác/Tripi/Reels | Có | Diff source chỉ có CSS module social |
| Tái hiện lỗi trước sửa | Có | Browser chạy CSS gốc fail đúng assertion border trong suốt khi nghỉ: actual là coral alpha 0.5; có ảnh before |
| Lint, typecheck, test web | Có | Kết quả dưới đây |
| Production build | Chưa đạt do mạng | next/font không tải được Pacifico từ Google Fonts, ngoài phần CSS sửa |

## Kết quả kiểm tra

Sau khi worktree có node_modules do orchestrator cài, chạy binary đã cài, không tải thêm gói:

| Lệnh | Cwd | Kết quả |
|---|---|---|
| `node node_modules/oxlint/bin/oxlint -c ../../.oxlintrc.json src` | apps/web | Exit 0, không error; 27 warning trong TSX hiện có, không sửa các file đó |
| `node node_modules/next/dist/bin/next typegen` | apps/web | Pass |
| `node node_modules/typescript/bin/tsc --noEmit` | apps/web | Pass |
| `node node_modules/vitest/vitest.mjs run --maxWorkers=2` | apps/web | 38 file, 253 test pass; 21,48 giây |
| `node tools/check-boundaries.mjs` | repo | Pass: không vi phạm luật FE |
| `git diff --check` | repo | Pass |
| Browser regression trên Next dev của worktree | URL localhost:3126/inspiration?view=posts | 7 tình huống pass: idle, click/focus chuột, Tab, hover bài active, reduced motion, clipped, hover bài không active |
| `node node_modules/next/dist/bin/next build` | apps/web | Fail do không kết nối được Google Fonts để tải Pacifico, import từ `features/discovery/ota-home-motion.tsx`; không sửa font/config ngoài phạm vi |

Browser dùng ngữ cảnh riêng không có phiên đăng nhập và giả lập public API trong browser; không thay source app hoặc gọi API ghi. Bản CSS gốc được dùng tạm để tái hiện lỗi, sau đó khôi phục chính xác bản sửa và chạy lại toàn bộ 7 tình huống đạt. Script và JSON kiểm tra được lưu cùng ảnh trong thư mục results bên dưới. Các kiểm tra unit/lint/typecheck chạy trên mã TS không đổi; sau bổ sung CSS cho focus nút ảnh đã chạy lại browser regression trên CSS cuối.

Công cụ CUA/node_repl lỗi khởi tạo kernel. Chrome headless riêng cũng bị lỗi tiến trình GPU trong sandbox. Kiểm tra browser thực hiện qua DevTools của trình duyệt sẵn có, tạo context riêng và tự dispose context sau mỗi lượt; không điều khiển các tab có sẵn của người dùng.

## Cách kiểm lại

1. Trong worktree, chạy web bằng `node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3126` từ apps/web.
2. Mở `/inspiration?view=posts`: hover một bài, click hashtag/nút rồi đưa chuột ra ngoài, Tab vào nút/link, cuộn bài đang mở bình luận qua mép khung.
3. Chỉ container đang hover có border; focus bàn phím chỉ hiện dấu ở control. Hai span trang trí không hiển thị, kể cả khi có data-highlight-framed.
4. Chạy lại các lệnh lint/typecheck/test ở trên hoặc script pnpm tương ứng.
5. Production build cần chạy lại ở môi trường kết nối được Google Fonts; chưa xác minh bản CSS production do giới hạn này.

## Ảnh / video

Ảnh không commit vào repo. Thư mục evidence thực tế:

`C:\Users\THINKPAD\AppData\Local\Temp\claude\cd4ce3a0ac4d2d61\40a7f02d-0a75-435d-a27d-6bd492676079\scratchpad\results`

- `tf25-post-card-before.png`: CSS gốc, viền coral hiện khi chưa hover/focus.
- `tf25-post-card-idle.png`: sau sửa, không viền khi nghỉ.
- `tf25-post-card-mouse-focus.png`: click chuột rồi rời thẻ, không khung focus.
- `tf25-post-card-keyboard-focus.png`: dấu focus nhẹ trên nút ảnh khi Tab.
- `tf25-post-card-hover.png`: chỉ viền container khi hover.
- `tf25-post-card-clipped.png`: cuộn cắt bài, không có khung nổi giả.
- `tf25-post-card-browser-check.mjs`, `tf25-post-card-browser-checks.json`: script/giá trị browser để kiểm lại.

## Ảnh hưởng tới phần của người khác

- Đã chặn phần trang trí do Bảo thêm qua CSS module social đúng quyền brief cho phép; không sửa `feed-highlight-frame.tsx` hoặc `globals.css` của Trang.
- Tripi chỉ được khảo sát; đề xuất cụ thể nằm trong `results/codex-fe-ui.md`, chưa áp dụng và chưa sửa file của Bảo.
- Không push, PR, merge hoặc ghi GitHub/Notion theo yêu cầu phiên này.
