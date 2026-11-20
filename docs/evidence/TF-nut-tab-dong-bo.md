# Evidence: TF-nut-tab-dong-bo — Đồng bộ kiểu segmented tabs trên web

- **Người làm:** Lê Quang Thành · **Tài liệu mẫu:** `.recommendModeTabs` (`social-feed.module.css`)

## Đợt 1 — Phần anh Thành phụ trách & chip Reels (`thanh/TF-nut-tab-dong-bo`)

### 1. Bộ dùng chung (`apps/web/src/features/shared/segmented-tabs.module.css`)
- `.tabs`: `padding: 4px`, `border-radius: 14px`, `background: var(--color-surface-muted)`, `grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 8px; box-sizing: border-box;`
- `.tabsGlass`: `background: var(--water-glass, transparent); backdrop-filter: blur(10px);`
- `.tabsAuto`: `display: flex; width: fit-content; max-width: 100%; overflow-x: auto; scrollbar-width: none;` (nút `.tab` đặt `flex: 0 0 auto; padding-inline: 14px`).
- `.tabsDarkAnchor` + `.tabsDark`: biến thể tối trong suốt trên video (`rgba(15, 23, 42, 0.55)`, `backdrop-filter: blur(8px)`, `container-type: inline-size`, giữ chữ co `clamp(10.5px, 3.2cqi, 12px)`), nút chọn nền trắng `var(--color-background)` chữ mực `var(--color-ink)`.
- `.tab` / `.tabCompact` + `[aria-selected='true'], [aria-pressed='true'], .tabActive`: trạng thái chọn dùng `var(--color-ink)` nền, `var(--color-background)` chữ; focus ring `:focus-visible`; tôn trọng `prefers-reduced-motion: reduce`.

### 2. Danh sách nơi đã đổi / giữ nguyên (kèm chủ code)
1. **Tab gợi ý Bài viết (`social-feed-view.tsx:~884`, `social-feed.module.css:31–42` — anh Thành):** đổi sang `segmentedTabs.tabs + tabsGlass + styles.recommendModeTabs`, `segmentedTabs.tab`, bỏ inline style màu cứng.
2. **Tab Lịch trình / Chi phí (`itinerary-sidebar-panel.tsx:135–158`, `social-feed.module.css:620–622` — anh Thành):** đổi sang `segmentedTabs.tabs + styles.itineraryTabsRow` và `segmentedTabs.tab + tabCompact` (chỉ đổi đúng hàng tab, không đụng khối trống).
3. **Trang lịch trình chuyến đi (`social/trip-plan/trip-plan-view.tsx:234–265` — anh Thành):** **KHÔNG đổi** — vùng `.actions` chỉ gồm nút Lưu (`aria-pressed={isSaved}`) và nút Chia sẻ, không phải segmented tabs đơn chọn.
4. **Trang cá nhân (`social/public-profile.tsx:148–166, 213–228`, `public-profile.module.css:98–100, 240–248` — `git log`: Hoàng Đức Dũng `f3b3699`):** đổi cả hàng tab chính (`Videos / Bài viết / Đã lưu`) và nhóm lọc mục đã lưu (`Bài viết / Video`, `role="group"`, `aria-pressed`) sang `segmentedTabs.tabs + tabsAuto` và `segmentedTabs.tab`.
5. **Kết quả tìm kiếm (`social/search-results-grid.tsx:84–120`, `search-results-grid.module.css:53–56` — `git log`: Dũng / anh Thành):** đổi cả tab loại kết quả và tab sắp xếp bài viết (`tabCompact`) sang `segmentedTabs.tabs + tabsAuto`, dùng `max-width: min(1280px, 100%)` để cuộn ngang gọn trên 390px.
6. **Trạng thái kiểm duyệt (`social/moderation-status.tsx:130–145`, `moderation-status.module.css:24–26` — anh Thành):** đổi `decisions / reports` sang `segmentedTabs.tabs + tabsAuto` và `segmentedTabs.tab`.
7. **Chip gợi ý trên video Reels (`social/live-posts.tsx:2145–2175` — `git blame`: Lê Anh Duy ở TF108):** đổi từ inline styles sang `segmentedTabs.tabsDarkAnchor` + `segmentedTabs.tabs + tabsDark` + `segmentedTabs.tab` (giữ nguyên vị trí `top: 14px`, `container-type: inline-size`, `clamp(...cqi...)`, `role="tab"`, handler). **Cần anh Thành báo Duy đã chuẩn hoá style chip Reels sang CSS module chung.**

### 3. Kết quả kiểm tra Đợt 1
- `pnpm turbo run lint typecheck test --filter=./apps/web --force`: `oxlint` **27 warnings, 0 errors**; `next typegen && tsc --noEmit` **0 errors**; `vitest run` **85 files passed (85), 550 tests passed (550)**.
- CDP cổng `3210` (`1440×900` và `390×844`): ảnh `before-*` và `after-*` lưu tại `D:\HCMUT\vinAI\vsf\ota-tripflix\tripflix\.orchestrator\nut-tab\dot1\` (riêng `/account/moderation` yêu cầu đăng nhập nên trang trống tab; `/inspiration` và `/inspiration?q=da%20lat` chụp đầy đủ và đã xác nhận fix tràn ngang trên 390px xuống đúng `330px`).

---

## Đợt 2 — Phần đồng đội đã đồng ý (`thanh/TF-nut-tab-dong-bo-2`, worktree `wt-fe-tabs2`)

### 1. Danh sách đã đổi (đúng dạng tab/segmented đơn chọn)
1. **Chọn Một chiều / Khứ hồi trên form tìm vé (`flights/flight-search-form.tsx:72–90`, `flights/flights.module.css:2183–2186` — chủ gốc: Lê Thị Thùy Trang `ed7a12c`, gần nhất Bảo/Duy):**
   - Đổi `<fieldset className={styles.tripTabs}>` sang `segmentedTabs.tabs + tabsAuto + styles.tripTabs`, nút dùng `segmentedTabs.tab + tabCompact` (`32px`, đồng chiều cao thanh tìm kiếm). Giữ `min-inline-size: 0` trên `.tabs` để `<fieldset>` không nở tràn ngang trên màn hẹp.
2. **Chọn điểm đến xem trước trên Trang chủ (`discovery/ota-home-previews.tsx:113–126`, `discovery/ota-home.module.css:814–817` — chủ gốc: Lê Thị Thùy Trang `358b395`):**
   - Đổi `<fieldset className={styles.chips}>` (`Nha Trang / Hội An / Đà Nẵng`) sang `segmentedTabs.tabs + tabsAuto + styles.chips`, nút dùng `segmentedTabs.tab`, giữ `margin: 24px auto 20px; border: 0;` và scroll animation.

### 2. Danh sách giữ nguyên (không phải tab đơn chọn — không ép)
1. **`discovery/live-search-screen.tsx:266–295` (chủ: Lê Thị Thùy Trang / Thắng):** danh sách gợi ý địa điểm autocomplete 2 dòng (`place.name` + `place.subtitle`) trong popover `.suggestions`, không phải thanh tab.
2. **`discovery/stay-result-filters.tsx:107–152` (chủ: Lê Thị Thùy Trang):** bộ lọc nằm trong thanh bên hẹp ~240px gồm chip ngân sách toggle tắt được (`filterChoices` xuống dòng), lưới 3 cột hạng sao (`ratingChoices`) và danh sách sắp xếp dọc vạch trái (`sortChoices`); giữ nguyên để không vỡ bố cục sidebar lọc.
3. **`hotels/hotel-reviews.tsx:115–134` (chủ: Lê Thị Thùy Trang):** cụm chip nhãn đánh giá (`Tất cả nhãn` + các nhãn có `{count}`, xuống dòng `flex-wrap`, bấm lại để bỏ lọc).
4. **`flights/flight-results.tsx:782–802` (chủ: Lê Thị Thùy Trang / Duy):** `.cabinTabs` là thẻ chọn hạng vé 2 dòng (`span` tên hạng + `small` giá tiền hoặc trạng thái hết vé `[data-unavailable]`), không ép vào nút tab 1 dòng `white-space: nowrap`.

### 3. Kết quả kiểm tra Đợt 2
- `pnpm turbo run lint typecheck test --filter=./apps/web --force`: `oxlint` **27 warnings, 0 errors**; `next typegen && tsc --noEmit` **0 errors**; `vitest run` **85 files passed (85), 551 tests passed (551)** (đã cập nhật `segmented-tabs-style.test.ts` kiểm tra cả Đợt 2).
- CDP cổng `3220` (`1440×900` và `390×844`): chụp `/flights`, `/search`, `/` vào `D:\HCMUT\vinAI\vsf\ota-tripflix\tripflix\.orchestrator\nut-tab\dot2\` (`before-*` và `after-*`; đã tắt dev server khi xong). Xác nhận `[Một chiều] [Khứ hồi]` trên `/flights` và `[Nha Trang] [Hội An] [Đà Nẵng]` trên `/` hiển thị đúng thanh segmented mới trên cả desktop và mobile.
- **Việc cần báo đồng đội:** báo **Duy** (chip Reels ở `live-posts.tsx`, Đợt 1) và **Trang / Thắng** (`flight-search-form.tsx`, `ota-home-previews.tsx`, Đợt 2) đã đồng bộ sang `segmented-tabs.module.css`.
