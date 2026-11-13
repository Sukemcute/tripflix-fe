# TF25 — Trang Cảm hứng không dài lố khung nhìn sau khi đổi header

- Jira: [SCRUM-29](https://tripflix.atlassian.net/browse/SCRUM-29) · Nhánh: `thanh/TF25-cam-hung-tran-duoi` · Người làm: Lê Quang Thành (dùng AI: có) · Ngày: 2026-11-13

## Bối cảnh
Sau khi header đổi sang viên bo tròn (PR #146), đáy trang Cảm hứng lộ một thanh ngang và các panel bị cắt. Đo trên web dev (1700×900): khung trang đã tính theo chiều cao header mới (106px) nhưng `#content` trong `globals.css` vẫn cố định `100dvh − 81px` theo header cũ, nên `<main>` dài hơn khung nhìn 25px.

## Đã làm
- `inspiration-view.tsx` đặt `--feed-header-height` ở thẻ gốc (`<html>`) thay vì ở khung trang, để `#content` và khung trang dùng chung một số đo; gỡ biến khi rời trang.
- Đo bằng mép dưới header cộng lề dưới, thay cho chiều cao cộng cứng 24px.
- `globals.css`: `#content` của trang Cảm hứng dùng `calc(100dvh − var(--feed-header-height, 106px))`, bỏ số cứng 81px.
- Giữ nguyên header của Trang và dock hiện tại.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Trang không dài lố khung nhìn, không còn thanh ngang ở đáy | Có | Đo qua CDP trên web dev: chiều cao `body` = khung nhìn ở 1700×900, 1700×760 (Reels), 820×900, 390×800 |
| `<main>` và khung trang kết thúc cùng chỗ | Có | Như trên: `main` và khung trang cùng mép dưới ở cả 4 kích thước |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/web`: 3/3 task, 71 test pass, lint 0 lỗi; không có warning ở file đã sửa.

## Cách kiểm lại
1. Mở `/inspiration` và `/inspiration?view=reels`, thu phóng chiều cao cửa sổ: đáy trang không có dải nền thừa, panel không bị cắt ngang.
2. Đổi bề rộng dưới 900px (header xuống hai hàng): trang vẫn vừa khung nhìn.

## Ảnh / video
- Không đính kèm (theo yêu cầu).

## Ảnh hưởng tới phần của người khác
- `globals.css`: chỉ sửa luật `#content` của trang Cảm hứng (Thành viết ngày 11/11). `inspiration-view.tsx`: sửa đoạn đo header Trang thêm ở PR #146 (đổi nơi đặt biến và cách đo, giữ tên biến). Cần báo Trang.
