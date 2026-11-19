# TF25 — Đưa nút "+" (Tạo bài) ra giữa dock trái tab Cảm hứng

- Notion: (chưa có link) · Nhánh: `thanh/TF25-nut-dang-bai-giua-dock` · Người làm: Thành (dùng AI: có) · Ngày: 2026-11-19

## Đã làm
- Dời nút "+" từ cuối lên vị trí thứ 4: Tìm kiếm, Bài viết, Reels, **+**, Đang theo dõi, Đã lưu. Hành vi, aria-label, handler giữ nguyên.
- Nút "+" vẫn coral trơn, cùng vùng bấm 44px như các icon khác; chỉ thêm `margin-block: 4px` (dock dọc) và `margin-inline: 4px` (thanh ngang màn hẹp ≤ breakpoint hiện có) để cách hai icon bên cạnh rộng hơn vài px.
- Đổi import `@/features/discovery/inspiration-keyword` thành đường dẫn tương đối để file dock import được trong Vitest (web chưa có alias `@/`). Không đổi hành vi.
- Thêm test render tĩnh kiểm thứ tự nút.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Thứ tự mới, "+" ở giữa (vị trí 4) | Có | `instagram-left-dock.test.tsx` (tab posts và reels) |
| "+" cùng kích thước, không bóng/gradient/blur | Có | CSS `.dockCreateBtn` chỉ đổi margin |
| Hành vi, aria-label giữ nguyên | Có | JSX block chuyển nguyên vẹn; test kiểm aria-label |
| Dock ngang màn hẹp: "+" ở giữa | Có | cùng DOM order; `.dockCreateBtn` margin ngang trong media query |

## Kết quả kiểm tra
`pnpm turbo run lint typecheck test --filter=@tripflix/web`: lint 0 lỗi, 28 cảnh báo (không tăng); typecheck pass; test 43 file, 308 test pass.

## Cách kiểm lại
1. Chạy lệnh trên.
2. Mở tab Cảm hứng, xem dock trái; thu hẹp cửa sổ để xem dock ngang.

## Ảnh / video
- Không (theo giao việc).

## Ảnh hưởng tới phần của người khác
- Không: `git blame` cho thấy toàn bộ dock và CSS là code của Thành (3 commit TF25).
