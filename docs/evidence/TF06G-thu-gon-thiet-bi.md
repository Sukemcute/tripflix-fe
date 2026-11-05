# TF06G — Web: thu gọn danh sách thiết bị đang đăng nhập

- Notion: <dán link task TF06G> · Nhánh: `dung/TF06G-thu-gon-thiet-bi` · Người làm: Hoàng Đức Dũng (dùng AI: có) · Ngày: 2026-11-06
- Không đổi API BE.

## Vấn đề

Thẻ "Thiết bị đang đăng nhập" ở `/account` liệt kê mọi phiên còn hạn (30 ngày). Tài khoản đăng nhập nhiều lần (nhiều máy, nhiều trình duyệt, hoặc qua API) có danh sách dài vô hạn: ở máy dev, `superadmin@` có 55 phiên, `moderator@` 31 phiên, đẩy các nút "Đăng xuất mọi thiết bị" xuống rất xa.

## Đã làm

- Tiêu đề thẻ có nhãn tổng số ("7 thiết bị").
- Sắp xếp: thiết bị hiện tại đứng đầu, sau đó theo lần hoạt động gần nhất.
- Chỉ hiện 5 thiết bị (gồm thiết bị hiện tại); còn lại ẩn sau nút "Xem thêm N thiết bị" / "Thu gọn" (`aria-expanded`, `aria-controls`). Đăng xuất một thiết bị thì số và nút cập nhật theo.
- Khoá chữ mới `deviceCount`, `showMoreDevices`, `showFewerDevices`; CSS `.device-count`, `.device-toggle` chỉ dùng biến trong `packages/tokens`.
- Dữ liệu dev: đã "Đăng xuất mọi thiết bị" (`POST /auth/logout-all`) cho 3 tài khoản seed trên máy dev để dọn phiên test; không đổi dữ liệu trong repo.

## Đối chiếu "Xong khi"

| Tiêu chí                                            | Đạt | Bằng chứng             |
| --------------------------------------------------- | --- | ---------------------- |
| Danh sách không dài vô hạn, vẫn xem được đủ khi cần | Có  | Kiểm thật (2), (4)–(6) |
| Biết tổng số thiết bị, thiết bị hiện tại đứng đầu   | Có  | Kiểm thật (1), (3)     |
| Đăng xuất từng thiết bị vẫn chạy, số cập nhật       | Có  | Kiểm thật (7)          |
| Màn hẹp không tràn                                  | Có  | Kiểm thật (8) ở 390px  |

## Kết quả kiểm tra

Chạy ngày 2026-11-06, Node 24.22.1, pnpm 10.32.1:

```
pnpm turbo run lint typecheck test --affected → 20/20 task pass, 0 cảnh báo lint
node tools/check-boundaries.mjs → "Luật FE: không có vi phạm."
```

Kiểm thật bằng Chrome (playwright-core, script để ngoài repo) trên web `:3100` → gateway `:8080` → core-api thật, tài khoản test mới có 6 phiên tạo qua API (tên thiết bị khác nhau) + 1 phiên web: **8/8 PASS**.

```
(1) tiêu đề ghi tổng số thiết bị (7 thiết bị)
(2) chỉ hiện 5 thiết bị
(3) thiết bị hiện tại đứng đầu
(4) nút "Xem thêm 2 thiết bị", aria-expanded=false
(5) bấm → hiện đủ 7, nút đổi thành "Thu gọn", aria-expanded=true
(6) bấm "Thu gọn" → còn 5
(7) đăng xuất một thiết bị → còn 6, nút "Xem thêm 1 thiết bị"
(8) màn 390px: 5 thiết bị, có nút xem thêm, không tràn ngang
```

## Cách kiểm lại

1. BE, FE chạy như README; đăng nhập cùng một tài khoản ở hơn 5 trình duyệt / cửa sổ ẩn danh.
2. Mở `/account`: thấy "N thiết bị", 5 thiết bị và nút "Xem thêm".

## Ảnh / video

- Đính kèm trong PR: trước (danh sách dài), thu gọn, mở hết, màn hẹp 390px. Không commit ảnh vào repo.

## Ảnh hưởng tới phần của người khác

- Có: `apps/web/src/app/globals.css`, `packages/i18n` (chủ: Thành) — chỉ thêm lớp CSS và khoá chữ. `account-security.tsx` là phần của Dũng (TF06A).
