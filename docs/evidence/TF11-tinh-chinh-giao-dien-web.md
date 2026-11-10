# TF11 — Tinh chỉnh giao diện web: hiệu ứng button, footer, thẻ trang chủ, khung tìm phòng

- Notion: [TF11](https://app.notion.com/40dcb9b9e5c281708194d0561df200cd) · Nhánh: `bao/TF11-tinh-chinh-giao-dien-web` · Người làm: Quốc Bảo (dùng AI: có) · Ngày: 2026-11-06

## Đã làm
- **Hiệu ứng loang cho button** (`features/shared/button-ripple.tsx`, `globals.css`): rê chuột vào thì lớp màu tròn lan ra từ chỗ con trỏ. Áp cho `primary-button`, `secondary-button` và class `ripple-button` (CTA trang chủ, nút footer). Màu theo bảng màu: nút đen loang Teal `#00B2A3`, nút xanh loang Coral `#FF5A3C`, nút Coral loang Ink, nút phụ loang Sea Mist; khi loang chữ chuyển Ink cho đủ tương phản. Tắt chuyển động khi người dùng chọn giảm chuyển động. "Tìm phòng tại …" cùng màu Teal Ink với "Tìm phòng trống".
- **Làm chậm animation toàn web:** nhân thời gian và độ trễ của mọi `transition`/`animation` trong CSS lên 1,6 lần (52 giá trị, 7 file).
- **Trang đăng nhập:** mascot to hơn (tối đa 280px), đặt tuyệt đối ở góc dưới phải nên thẻ giữ chiều cao cũ; tự co khi cột hẹp để không đè danh sách lợi ích.
- **Footer:** bỏ dòng "Đặt chỗ và thanh toán…" và hàng "Về đầu trang" riêng. Thẻ "Hẹn bạn ở chuyến đi tới" có Tripi nằm ghế biển (nhấp nhô nhẹ), nhãn ghim "Tripi gửi bạn", băng dính washi giữ ảnh; nút đổi thành "Về đầu trang".
- **Thẻ bài viết** (trang chủ, Cảm hứng): tên địa điểm thành thẻ ghim kiểu nhãn hành lý. Ở trang chủ cả thẻ bấm được (link tiêu đề phủ toàn thẻ), lượt thích có icon tim Coral, bình luận có icon vàng.
- **Thẻ khách sạn trang chủ:** hạng sao thành thẻ ghim Coral, số trắng đậm, sao vàng.
- **"Gom cảm hứng":** bỏ chấm bi, thêm dấu chìm bản đồ tròn (`home-world.svg`, 7%) chiếm khoảng 2/3 thẻ.
- **"Có phòng cho chuyến đi sắp tới":** chia 50/50, ảnh mờ dần vào nền thẻ ở mép trái (desktop).
- **Khung tìm phòng trang chủ:** "Bộ lọc thêm" lên cuối hàng tab; các ô lọc trượt ngang ra trong khoảng trống của hàng tab và thu lại, không che nút "Tìm phòng trống", không đẩy trang (dưới 1100px thì xuống dòng riêng). Bỏ dòng giới thiệu và dòng gợi ý nhập địa điểm ở trang chủ (trang `/search` giữ nguyên); hàng tab thấp lại.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Button có hiệu ứng loang đúng bảng màu | Có | Rê chuột thật vào "Về đầu trang": toạ độ loang đúng chỗ con trỏ; màu loang thực tế của 5 CTA trang chủ khớp bảng (Teal `#00B2A3` / Coral `#FF5A3C`) |
| Không button nào bị lệch hay cắt chữ | Có | Rà `/`, `/search`, `/login`, `/inspiration`, `/flights`: không button nào đổi `position` hay tràn chữ |
| Mascot đăng nhập to hơn, không làm thẻ cao thêm | Có | Chiều cao thẻ = nội dung + 276px, bằng bản gốc |
| Footer gọn, có Tripi mới và "Về đầu trang" | Có | Footer cao 263px, không còn hàng thông báo; nút trỏ `#top` |
| Bộ lọc thêm không đẩy trang, không che nút tìm | Có | Hàng tab cao cố định 44px; ô lọc nằm trong hàng tab |

## Kết quả kiểm tra
`pnpm turbo run lint typecheck test --filter=@tripflix/web... --filter=@tripflix/mobile` sau khi merge develop: xem mục Kiểm tra trong PR.

## Cách kiểm lại
1. `tripflix-be`: `pnpm stack:be`; `tripflix-fe`: `pnpm --filter @tripflix/web dev`.
2. Mở `http://localhost:3100/` (cửa sổ rộng hơn 1100px): rê chuột vào các nút; bấm "Bộ lọc thêm"; xem thẻ bài viết, thẻ khách sạn, footer.
3. Mở `http://localhost:3100/login` xem mascot.

## Ảnh / video
- Đính kèm trong PR.

## Ảnh hưởng tới phần của người khác
- `apps/web` (chủ Thành): `globals.css`, `layout.tsx`, `auth-shell.tsx`, các file `features/discovery/*`, `features/social/live-posts.tsx`.
- Có sửa CSS/JSX do Trang và Thắng viết theo yêu cầu của Bảo: thời gian animation ở 7 file CSS; màu hover của CTA trang chủ (`ota-hero`, `ota-home`); footer (`ota-shell.module.css` — CSS `.footerBase` không còn dùng nhưng chưa xoá vì >20 dòng code của Trang).
- Không sửa `StayResultFilters` của TF10.
