# TF-tripi-chat-gon — Khung chat Tripi gọn và hàng Reels ba cột

- Nhánh: `thanh/TF-tripi-chat-gon` · Ngày: 2026-11-20 · Người làm: Thành (dùng AI: có).
- Notion: brief không cung cấp liên kết.

## Đã làm

- Tin nhắn từ 15px / 1.5 / padding 12px 16px thành 14px / 1.45 / 10px 14px; các khoảng cách và chữ phụ được thu gọn, chữ phụ tối thiểu 12px. Biến kích thước đặt tại panel.
- Reels dùng grid ba cột, thẻ tỷ lệ 2:3; hơn ba thẻ xuống hàng, ít hơn ba thẻ vẫn giữ bề rộng một cột. Giữ logic và đường dẫn mở Reel.

## Kiểm tra

- Web lint: 0 lỗi, 28 cảnh báo; `next typegen` và `tsc --noEmit` pass; Vitest 73 file / 510 test pass, có test CSS `assistant-compact-style.test.ts`.
- Corepack không thể cài offline do quyền ghi cache; kiểm tra trên worktree dùng binary từ bộ phụ thuộc có sẵn qua junction tạm, không chạy đúng lệnh `pnpm turbo` trong brief.
- Chrome CDP device emulation trên **fixture tĩnh dùng CSS thực** (không dùng `--window-size`):

| Khổ | Hàng trước / sau (px) | Bong bóng sau (px) | Một thẻ sau (px) |
|---|---:|---:|---:|
| 1440×900 | 336 / 316,52 | 316,52 | 100,17 |
| 1280×720 | 336 / 316,52 | 316,52 | 100,17 |
| 390×844 | 308 / 293,55 | 293,55 | 92,52 |
| 360×800 | 278 / 268,95 | 268,95 | 84,31 |

- Trước: nội dung ba thẻ rộng 376px nên hàng phải cuộn; sau: ba thẻ vừa hàng, panel và vùng tin nhắn không cuộn ngang trong fixture. Fixture một và bốn thẻ xác nhận bề rộng một cột không đổi và thẻ thứ tư xuống hàng.
- Dev server riêng 3120 đã dừng. Turbopack không resolve được bộ phụ thuộc qua junction; thử webpack thì trang trả 500 do selector `:global([data-water-cursor])` có sẵn tại `ota-home-motion.module.css:165` không phải selector thuần. Vì vậy chưa thể kiểm tra chat thật, hành vi bấm mở Reel hoặc chụp ứng dụng đang chạy; cần anh Thành thử tay trong môi trường cài đặt bình thường.

## Ảnh và số đo

- Ảnh trước/sau và `measurements.json` nằm ngoài repo tại `.orchestrator/tripi-chat-gon/`, tên `before-<khổ>.png` và `after-<khổ>.png`. Ảnh là fixture, không phải dữ liệu chat thật.

## Ảnh hưởng tới phần của người khác

- CSS Tripi là phần của Bảo; chỉ đổi bố cục/trình bày, không đổi logic. Anh Thành cần báo Bảo để review, nhất là mức chữ, việc xuống hàng và kiểm tra trên điện thoại.
