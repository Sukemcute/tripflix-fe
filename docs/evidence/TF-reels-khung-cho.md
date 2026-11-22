# TF-reels-khung-cho — Giữ khung Reels trong lúc chờ

- Nhánh: `thanh/TF-reels-khung-cho` · Ngày: 2026-11-20 · Người làm: Thành (dùng AI: có).
- Notion: brief không cung cấp liên kết.

## Đã làm

- Trạng thái chờ session, danh sách và chuyển mode dùng khung chung `mediaStageFrame`, có shimmer nhẹ, `aria-busy` và `LoadingDots` ở giữa. Chip nằm trong khung và vẫn nhận thao tác. Khi lỗi/rỗng dùng khung cùng kích thước, không shimmer, giữ chip và nút thử lại.
- Dự trữ vị trí cột sidebar khi chưa có bài để khung chờ khớp bố cục bài đầu. Giữ nguyên luồng tìm kiếm/đã lưu và điều khiển vuốt, track, scroll snap, điều hướng.
- `getReelStageState` có test các trạng thái; test tĩnh kiểm tra class chung, chip, `aria-busy`, shimmer và reduced motion.

## Kiểm tra

- Web lint 0 lỗi / 28 cảnh báo; `next typegen` + `tsc --noEmit` pass; Vitest 75 file / 514 test pass. Sau đó chạy lại 4 test của hai file test mới: pass.
- `corepack pnpm turbo run lint typecheck test --filter=./apps/web` không chạy được: sandbox từ chối ghi cache Corepack. Đã chạy trực tiếp các binary web tương ứng trong node_modules.
- Chrome CDP device emulation, app thật ở 3130: giữ request gợi ý pending qua `Fetch` mà không giả dữ liệu; bấm chip thứ hai bằng CDP mouse thành công ở cả bốn khổ. Khung có `aria-busy=true`. Khi bỏ giữ request trên 390×844, đã thấy màn lỗi và nút Thử lại đọc được, chip vẫn trong khung.

| Khổ | Chip trước: x, y (px) | Chip sau: x, y (px) | Khung chờ sau: x, y, rộng × cao (px) |
|---|---|---|---|
| 1440×900 | 558,52; 132 | 358,52; 132 | 133,59; 118; 848,80 × 770 |
| 1280×720 | 478,52; 177 | 306,20; 177 | 127,20; 163; 755,59 × 545 |
| 1024×768 | 350,52; 177 | 212,39; 177 | 116,95; 163; 562,08 × 593 |
| 390×844 | 45,73; 133 | 45,73; 133 | 28; 119; 334 × 659 |

- Không có feed thật ở cổng 3130 để đo chuyển tiếp sang video thật. Khi bỏ class bổ sung của placeholder trong DOM để đối chiếu CSS của `mediaStageFrame`, tọa độ và kích thước khung/chip không đổi (0px) ở bốn khổ; đây là đối chiếu CSS, chưa chứng minh chuyển tiếp dữ liệu thực. Cần thử lại trên 3100 có backend cho phép CORS, gồm F5 và đổi chip khi đã có video.
- Dev server 3130 đã dừng. Ảnh trước/sau, ảnh lỗi và JSON tại `.orchestrator/reels-khung-cho/`; ảnh không commit vào repo.

## Ảnh hưởng tới phần của người khác

- Thanh chip TF108 do Duy thêm (`c750129`): giữ nguyên nút và handler, thay nơi chứa lúc chờ/lỗi/rỗng. Anh Thành cần báo Duy review thao tác đổi mode trong các trạng thái và vị trí sau khi dữ liệu thật về.
