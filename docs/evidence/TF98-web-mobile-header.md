# TF98 — Web trên điện thoại, PR 1: header gọn, tự ẩn, hàng nút đăng bài, Reels không mở sẵn bình luận

- Notion: (chưa có link) · Nhánh: `thanh/TF98-web-mobile-shell` · Người làm: Thành (dùng AI: có) · Ngày: 2026-11-20

## Đã làm
- **Header một hàng dưới 768px** (`apps/web/src/features/shell/mobile-header.css`, import trong `app/layout.tsx` sau `globals.css`): thanh phẳng full-width cao 56px (+1px viền), dính trên cùng; ẩn menu 4 mục và giỏ hàng; nút chữ "Đăng nhập" thành nút tròn 36px icon người (chữ vẫn trong link nên trình đọc màn hình đọc "Đăng nhập"); giữ Tripi, chuông, avatar. Trang chủ dùng nền đặc + logo tối vì header dính trôi qua nội dung trắng. Thêm `export const viewport` với `viewportFit: 'cover'` cho `env(safe-area-inset-*)`. Không sửa `header-account.tsx`, `ota-navigation.tsx`, `cart-link.tsx`.
- **Tự ẩn header khi cuộn** (`features/shell/header-auto-hide.tsx`, logic thuần `header-visibility.ts`): cuộn xuống > 8px thì ẩn, lên > 8px thì hiện; không ẩn khi chưa qua chiều cao header, khi menu trong header mở hoặc focus ở trong header; đổi trang thì hiện lại. Attribute `data-header-hidden` gắn trong effect nên không lệch hydration. Cảm hứng khoá cuộn body nên header luôn hiện ở đó.
- **Hàng nút ô đăng bài** (`features/social/feed/social-feed.module.css`): `.composerBottomRow` thành container; khi hàng hẹp hơn 480px nhóm nút được co, chữ nút chỉ ẩn với mắt (giữ cho trình đọc màn hình, tooltip giữ nguyên), nút Đăng không co. Selector giới hạn trong `.composerActionGroup` vì tab gợi ý ("Dành cho bạn/Thịnh hành") dùng lại class `.composerTagBtn`. Ô đăng bài trang cá nhân (`profile-composer.tsx`) dùng chung class nên cũng hết tràn.
- **Reels không mở sẵn bình luận** (`features/social/live-posts.tsx`): dưới 1024px panel bình luận là bottom sheet che hết video; nay mặc định mở theo `useIsWideScreen()` (như bảng tin Bài viết), giữ lựa chọn của người dùng, vào từ thông báo bình luận (`focusCommentId`) vẫn mở sẵn. Thêm `resolvePanelOpen` trong `use-wide-screen.ts`.

## Đối chiếu "Xong khi"
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Header < 768px một hàng ~56px | Có | Đo CDP: 57px ở 390/360/320 (trước 145/123/139); `mobile-header.test.ts` |
| Ẩn nav + giỏ, Đăng nhập thành icon người, giữ Tripi + chuông + avatar | Có | `mobile-header.test.ts`; ảnh 390 sau |
| Cuộn xuống ẩn, lên hiện, không ẩn khi menu mở/focus | Có | `header-visibility.test.ts` (6 test); đo CDP 390: xuống 900 ẩn, lên 5px giữ, lên 50px hiện, focus header thì hiện |
| Nút Đăng của ô đăng bài nằm trong màn | Có | Đo: right 275/315/345 ở 320/360/390 (trước 496); `composer-row-style.test.ts` |
| Reels không mở sẵn bình luận trên màn hẹp | Có (test) / cần thử tay | `use-wide-screen.test.ts`; API công khai chặn CORS từ localhost nên chưa thấy Reels có bài khi đo |
| Không cuộn ngang | Có | `scrollWidth === innerWidth` ở 7 trang × 4 khổ |
| Desktop ≥ 768px không đổi | Có | 768: chiều cao header 119px, nav, vị trí nút Đăng (623–729) giống trước; ảnh 768 trước/sau giống nhau; 1280 không tự ẩn |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --affected --continue`:
  - `@tripflix/web` lint: 0 lỗi, 28 cảnh báo (bằng trước khi sửa); typecheck pass; test 61 file / 430 test pass (có `instagram-left-dock.test.tsx`).
  - `@tripflix/mobile#test` fail: `ERR_UNKNOWN_FILE_EXTENSION ".ts"` vì Node trên máy là v22.17.1 (repo yêu cầu ≥ 22.22). Không liên quan TF98, `apps/mobile` không bị sửa.
- Đo bằng Chrome headless + `Emulation.setDeviceMetricsOverride` (mobile: true), dev server cổng 3110, chưa đăng nhập, 390×844, 360×800, 320×640, 768×1024 cho `/`, `/search`, `/flights`, `/inspiration`, `/inspiration?view=reels`, `/u/<id>`, `/login`: không trang nào cuộn ngang, không phần tử tương tác nào vượt mép phải.

## Cách kiểm lại
1. `pnpm --filter @tripflix/web dev`, mở DevTools chế độ thiết bị 390×844.
2. Trang chủ: header một hàng, cuộn xuống ẩn, cuộn lên hiện; bấm chuông/avatar khi đang cuộn thì header không ẩn.
3. `/inspiration`: hàng nút ô đăng bài chỉ còn icon, nút "Đăng bài" nằm trong khung.
4. `/inspiration?view=reels` (cần dữ liệu bài): vào lần đầu không thấy khung bình luận che video; bấm nút bình luận thì mở. Màn ≥ 1024px vẫn mở sẵn như cũ.
5. Đổi sang 768px trở lên: header viên thuốc như cũ.

## Ảnh / video
- Ảnh trước/sau 390 và 768 đính trong PR (không commit ảnh). Theo RULES §10 cần thêm ảnh chụp trên Chrome Android thật.

## Ảnh hưởng tới phần của người khác
- `app/layout.tsx` (nhiều người sửa, thiết kế header viên thuốc của Trang): chỉ thêm import CSS, `viewport`, `<HeaderAutoHide />`. Header mobile đổi từ viên thuốc sang thanh phẳng — cần Trang đồng ý; kiểu khung gom trong một khối đầu `mobile-header.css` để đổi lại viên thuốc thu nhỏ nhanh.
- `profile-composer.tsx` (Binbonk5): không sửa file, nhưng dùng chung class nên hàng nút trên trang cá nhân cũng đổi theo ở màn hẹp.
- Dưới 768px menu 4 mục bị ẩn khỏi header; thanh đáy thay thế thuộc PR 2. Nếu PR 1 lên staging một mình, điện thoại chỉ còn link Khách sạn/Vé máy bay/Cảm hứng ở footer.
