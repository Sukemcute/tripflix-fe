# TF31 — Mascot Tripi Rive sinh động

- Notion: không được cung cấp · Nhánh: `trang/TF31-mascot-rive` · Người làm: Trang (dùng AI: có) · Ngày: 2026-11-10

## Đã làm

- Bổ sung bộ mascot Tripi mở rộng, rig tách lớp và nguồn Rive có thể tái tạo.
- Đưa mascot Rive lên hero trang chủ với idle, chớp mắt, vẫy tay, nháy mắt và cười.
- Giữ mascot tĩnh cũ ở footer và tôn trọng `prefers-reduced-motion`.
- Chuyển sang Rive Canvas với WASM cục bộ; giữ ảnh fallback tới khi khung Tripi thật xuất hiện để splash miễn phí không lộ nền đen.
- Đồng bộ hai biểu cảm mới vào catalog mascot của web, mobile và admin.

## Đối chiếu "Xong khi"

| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Mascot xuất hiện trong vùng nhìn thấy đầu trang | Có | Kiểm tra Playwright ở viewport 1440×900 và 390×844 |
| Mascot tự chuyển động tự nhiên | Có | Hai ảnh chụp mascot cách nhau 500 ms có hash khác nhau; click tạo khung phản ứng khác |
| Không lộ splash Rive nền đen | Có | Kiểm tra trạng thái mỗi 150 ms: không reveal sớm, độ phủ fallback + canvas tối thiểu bằng 1 |
| Footer giữ mascot cũ | Có | Footer không có canvas và dùng `action-vacation.png` |
| Có fallback và reduced motion | Có | Ảnh WebP hiển thị khi Rive lỗi hoặc người dùng giảm chuyển động |

## Kết quả kiểm tra

- `pnpm turbo run lint typecheck test --affected`: đạt 20/20 tác vụ.
- 229 test đạt sau khi merge `origin/develop`: api-client 143, app-core 73, web 10, i18n 2, tokens 1.
- Lint không có lỗi; còn các cảnh báo có sẵn trong web và admin, không thuộc thay đổi mascot.
- `git diff --check`: đạt.
- Playwright runtime: `.riv` và `rive.wasm` trả HTTP 200; idle và click đều thay đổi khung hình.

## Cách kiểm lại

1. Chạy `pnpm --filter @tripflix/web dev`.
2. Mở `http://localhost:3100` và quan sát Tripi ở hero trong lúc tải và sau khi Rive sẵn sàng.
3. Chờ Tripi tự chớp mắt/vẫy tay, sau đó hover hoặc bấm để xem phản ứng.
4. Cuộn tới footer và xác nhận mascot tĩnh cũ vẫn được giữ.
5. Bật `prefers-reduced-motion: reduce` và xác nhận chỉ hiển thị ảnh fallback.

## Ảnh / video

- Gallery nguồn: `docs/mascot/generated-2026-11-10/index.html`.
- Ảnh desktop và mobile đã được kiểm tra local; không commit ảnh evidence theo quy định repo.

## Ảnh hưởng tới phần của người khác

- Có: cập nhật catalog mascot dùng chung cho web, mobile và admin; không đổi chữ ký component hoặc hợp đồng API.
