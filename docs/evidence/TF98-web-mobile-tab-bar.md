# TF98 — Web trên điện thoại, PR 2: thanh điều hướng đáy, sheet Đặt chỗ, ⊕ đăng bài, dock Cảm hứng ngang

- Notion: (chưa có link) · Nhánh: `thanh/TF98-web-mobile-tab-bar` · Người làm: Thành (dùng AI: có) · Ngày: 2026-11-20
- **Phụ thuộc PR 1** (`thanh/TF98-web-mobile-shell`, evidence `TF98-web-mobile-header.md`): merge PR 1 trước rồi mới merge PR này.

## Đã làm
- **Thanh đáy 5 mục** (`apps/web/src/features/shell/mobile-tab-bar.tsx`, `.module.css`, `mobile-tab-icons.tsx`; hàm thuần `mobile-tabs.ts`): Trang chủ · Đặt chỗ · ⊕ · Cảm hứng · Tôi. Chỉ hiện dưới 768px bằng CSS (không `matchMedia`) nên không lệch hydration; không dùng `useSearchParams` ở layout gốc (đọc query lúc bấm ⊕). Ẩn ở `/login`, `/register`, `/forgot-password`, `/dat-lai-mat-khau`, `/xac-thuc-email`, `/onboarding`, `/checkout/*`, `/payments/*` (cùng danh sách `isAssistantHidden`, có ghi chú giữ đồng bộ) và khi trang hiện khung đăng nhập toàn màn (`.auth-fullscreen`). "Tôi" → `/u/<id mình>`; chưa đăng nhập → `/login` (kèm `returnTo` nếu `readSafeReturnTo` cho phép). Chữ trong `packages/i18n/src/shell.ts` (`vi.shell`).
- **Chừa chỗ**: `mobile-header.css` đặt `--mobile-tab-bar-space: calc(56px + env(safe-area-inset-bottom))` trên `body` khi có thanh đáy và `padding-bottom` cho body (trừ trang toàn màn và Cảm hứng, nơi khung tự chừa chỗ). Mọi chỗ dùng `var(--mobile-tab-bar-space, 0px)` nên desktop và trang ẩn thanh đáy không đổi.
- **Sheet Đặt chỗ** (`features/shell/booking-sheet.tsx`): Khách sạn `/search`, Vé máy bay `/flights`; đã đăng nhập thêm Giỏ hàng `/cart` (kèm số món, aria-label "Giỏ đặt chỗ, N món") và Chuyến đã đặt `/bookings`. Dùng lại `useHeaderPopover`: bấm ngoài / Esc (trả focus về nút) / chọn mục / đổi trang thì đóng.
- **⊕ đăng bài**: tới `/inspiration?compose=vlog` (đang ở Reels: `?view=reels&compose=video`); `features/social/inspiration-view.tsx` mở `ComposerModal` có sẵn rồi `router.replace` bỏ tham số nên Back/F5 không mở lại. Chưa đăng nhập → `/login?returnTo=…`.
- **Dock Cảm hứng** (`features/social/feed/social-feed.module.css`, khối `max-width: 767px`): từ thanh đáy thứ hai thành hàng ngang 44px trên cùng khung, ẩn nút tạo bài; khung và drawer tìm kiếm chừa chỗ thanh đáy. Không sửa `instagram-left-dock.tsx`; dock trái desktop giữ nguyên. Không cần sửa `globals.css` (#content) như kế hoạch dự kiến: padding đáy của khung đã đủ (đo ở dưới).
- **Lớp nổi ở đáy**: mỗi file 1 rule dưới 768px — toast đăng bài (`composer/publish-toast.module.css`), toast thông báo (`notifications/web-notifications.css`, giữ mốc 88px cũ nếu cao hơn), thanh giỏ hàng trang khách sạn (`checkout/cart.module.css`).

## Đối chiếu tiêu chí
| Tiêu chí | Đạt | Bằng chứng |
|---|---|---|
| Thanh đáy đúng 5 mục, ⊕ ở giữa, đánh dấu mục đang ở | Có | `mobile-tab-bar.test.tsx`; đo CDP (bảng dưới) |
| Ẩn ở login/checkout/onboarding… | Có | `mobile-tabs.test.ts` (`isMobileTabBarHidden`); đo `/login` không có thanh |
| Đặt chỗ mở sheet 4 mục (2 mục khi chưa đăng nhập) | Có | `booking-sheet.test.tsx`; đo 390 `/flights`: mở ở y 669–788, Esc đóng + trả focus, chọn Khách sạn → `/search` |
| ⊕ mở pop-up đăng bài ở Cảm hứng, Back không mở lại | Có (chưa đăng nhập) / cần thử tay (đã đăng nhập) | `mobile-tabs.test.ts` (`buildComposeHref`, `removeComposeParam`); đo: ⊕ từ `/` → `/login?returnTo=%2Finspiration%3Fcompose%3Dvlog`, từ Reels → `…view%3Dreels%26compose%3Dvideo`; mở `/inspiration?compose=vlog` → URL thành `/inspiration` |
| "Tôi" → trang cá nhân | Có | `mobile-tab-bar.test.tsx` |
| Dock Cảm hứng hàng ngang, ẩn nút tạo bài, desktop giữ dock trái | Có | `dock-mobile-style.test.ts`; `instagram-left-dock.test.tsx` không sửa vẫn pass; đo dock y 65–109 ở 390, 768 dock trái |
| Nội dung không bị thanh đáy che | Có | Đo: khung Cảm hứng kết thúc 788 (390) / 584 (320) = mép trên thanh; footer cách đáy ≥ chiều cao thanh ở mọi trang |
| Toast, CartBar nằm trên thanh đáy | Có (CSS) / cần thử tay | `overlays-above-tab-bar.test.ts` |
| Không cuộn ngang; 768 giống trước | Có | Bảng đo |

## Kết quả kiểm tra
- `pnpm turbo run lint typecheck test --filter=@tripflix/web`: lint 0 lỗi / 28 cảnh báo (bằng mốc cũ), typecheck pass, **66 file / 488 test pass**. `@tripflix/i18n` lint + typecheck pass.
- Đo CDP: Chrome headless + `Emulation.setDeviceMetricsOverride` (mobile: true), dev server cổng 3110, chưa đăng nhập, 14 trang × 4 khổ (390×844, 360×800, 320×640, 768×1024): `/`, `/search`, `/flights`, `/hotels/<id>`, `/inspiration`, `/inspiration?view=reels`, `/u/<id>`, `/trips/<id>`, `/cart`, `/bookings`, `/account`, `/login`, `/coming-soon`, `/dieu-khoan-su-dung`.

  | Khổ | Cuộn ngang | Thanh đáy | Footer khi cuộn hết | Ghi chú |
  |---|---|---|---|---|
  | 390×844 | không (14/14) | 5 mục, y 788–844 ở 10 trang | cách đáy 101px ≥ 56px | Cảm hứng/Reels/trips: dock ngang y 65–109, khung kết thúc 788 |
  | 360×800 | không (14/14) | 5 mục, y 744 | 101px ≥ 56px | như trên |
  | 320×640 | không (14/14) | 5 mục, y 584 | 101px ≥ 56px | khung Cảm hứng kết thúc 584 |
  | 768×1024 | không (14/14) | không có | — | header 119px, dock trái y 155–1012 như trước PR |

  Không có thanh đáy ở `/login`; ở `/cart`, `/bookings`, `/account` khi chưa đăng nhập (trang hiện khung đăng nhập toàn màn) — đúng ý định. Không phần tử tương tác nào vượt mép phải. API công khai chặn CORS từ localhost nên trang Cảm hứng không có bài khi đo.

## Cách kiểm lại
1. `pnpm --filter @tripflix/web dev`, DevTools chế độ thiết bị 390×844.
2. Trang chủ, Khách sạn, Vé máy bay, trang cá nhân: thanh đáy 5 mục, mục đang ở tô cam; cuộn hết trang thấy footer đủ.
3. Bấm Đặt chỗ: bảng mở trên thanh; Esc, bấm ra ngoài, chọn mục đều đóng. Đăng nhập rồi mở lại: có Giỏ hàng (số món) và Chuyến đã đặt.
4. Đã đăng nhập: bấm ⊕ ở trang chủ → Cảm hứng mở khung soạn bài; Back → về trang chủ, không mở lại. Ở Reels bấm ⊕ → khung soạn video.
5. `/login`, `/checkout/<id>`: không có thanh đáy.
6. Đăng bài xong: toast nằm trên thanh đáy. Trang khách sạn chọn phòng: thanh giỏ hàng nằm trên thanh đáy.
7. ≥ 768px: không có thanh đáy, dock Cảm hứng bên trái như cũ.

## Ảnh / video
- Ảnh 390 và 768 đính trong PR (không commit ảnh). Theo RULES §10 cần thêm ảnh chụp trên Chrome Android thật.

## Ảnh hưởng tới phần của người khác
- `checkout/cart.module.css` (**Thắng**): thêm 1 rule `.bar { bottom: var(--mobile-tab-bar-space, 0px) }` dưới 768px. Cần báo Thắng.
- `notifications/web-notifications.css` (**Dũng/Binbonk5**): thêm 1 rule `.notification-toasts { bottom: max(88px, …) }` dưới 768px (641–767px đổi từ 24px lên 88px). Cần báo Dũng.
- `app/layout.tsx` (nhiều người sửa): thêm `<MobileTabBar />` sau `<OtaFooter />`.
- `packages/i18n/src/vi.ts`: chỉ thêm nhóm `shell`, không đổi khoá cũ.
- Danh sách trang ẩn thanh đáy trùng `isAssistantHidden` (`assistant-widget.tsx`, Bảo): không sửa file của Bảo, chỉ ghi chú giữ đồng bộ.
