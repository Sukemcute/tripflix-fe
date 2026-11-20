# Admin UI/UX Redesign — Audit & Kế hoạch triển khai

> **File sống**: cập nhật mục "Tiến độ" sau mỗi giai đoạn. Session mới chỉ cần đọc file này + `RULES.md` là tiếp tục được.
> Phạm vi: `apps/admin` (Next.js 16.4, Tailwind v4, TanStack Query, Recharts). Không đổi API, business logic, phân quyền.

## 0. Tiến độ (cập nhật mục này đầu tiên)

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| P0 | Audit + kế hoạch (file này) | ✅ Xong — **đã duyệt 2026-11-20** (quyết định ở mục 8) |
| P1 | Nền tảng: token admin, primitives, route group, AdminShell, nav | ✅ Xong, đã commit `a5e6c8f` (nhánh `trang/TF-admin-ui-redesign`) |
| P2 | Thành phần dữ liệu: MetricStrip, DataTable, FilterToolbar, Pagination, ConfirmDialog, state UI | ✅ Xong (commit trên nhánh) |
| P3 | DetailDrawer + chuyển chi tiết Đơn hàng / Hành vi người dùng / Chi phí AI / Trace | ✅ Xong (commit trên nhánh) |
| P4 | Kiểm duyệt (trang rủi ro nhất): tách file, CaseDrawer, PostDrawer, bulk bar | ✅ Xong (commit trên nhánh) |
| P5 | Tổng quan + các trang hệ thống (Analytics, Search, Jobs, Inventory, Alerts) | ✅ 2026-11-20 |
| P6 | Hoàn thiện: responsive, a11y, dọn CSS cũ, evidence | ⬜ |

**Quy tắc checkpoint**: mỗi giai đoạn kết thúc bằng báo cáo (ảnh + kết quả lint/typecheck/test) và **dừng chờ người dùng nói "tiếp tục"** trước khi sang giai đoạn sau.

**Nhật ký** (thêm dòng mới ở cuối mục 9).

**Cách tiếp tục ở session mới**: đọc mục 0, 9 → mở giai đoạn đang dở ở mục 6 → chạy lại baseline kiểm tra (mục 7) trước khi sửa tiếp.

---

## 1. Giới hạn của bản audit này (nói thẳng)

- Audit dựa trên **đọc mã nguồn** toàn bộ shell, nav, Kiểm duyệt (hàng chờ + modal), Đơn hàng, Nhân sự, Hành vi người dùng, Tổng quan, Jobs, Lịch trống, khung Theo dõi tìm kiếm + **ảnh chụp cũ 17/11** (`outputs/admin-redesign/`). **Chưa chạy app thật** nên ảnh có thể lệch mã hiện tại. P1 bắt đầu bằng chụp baseline mới.
- **Chưa đọc sâu**: `SystemSummary`, nội dung Analytics/AI usage/Search monitor chi tiết, Appeals/Scans/Log/OCR, thân modal ca kiểm duyệt (dòng 1050–1275), màn login. Sẽ audit tại đầu giai đoạn tương ứng và ghi bổ sung vào mục 9.

## 2. Ràng buộc từ RULES.md (ảnh hưởng kế hoạch)

| Luật | Hệ quả |
|---|---|
| §10: `apps/admin`, `packages/ui-web` thuộc **Thành** | Redesign đụng gần như toàn bộ phần của Thành → **cần Thành biết/đồng ý** trước P1. Để giảm va chạm, thành phần mới đặt trong `apps/admin/src/ui/`, **không sửa `packages/ui-web`, `packages/tokens`**. |
| §4: thêm thư viện phải hỏi | Kế hoạch **không thêm dependency**: drawer dùng `<dialog>` native (repo đã dùng), bảng tự viết nhẹ, chart giữ Recharts. |
| §3: xoá >20 dòng phải hỏi, báo ⚠️ | Danh sách cần duyệt xoá ở mục 8. Không xoá gì trước khi duyệt. Code cũ giữ bằng lớp tương thích tới P6. |
| §4: chữ UI trong `packages/i18n` | Chuỗi mới đặt trong `packages/i18n`. Chuỗi cứng sẵn có trong `moderation-workspace.tsx` chỉ chuyển khi file đó được đụng tới (P4). |
| §5: đổi giao diện phải có ảnh evidence | Ảnh 1440 / 1024 / 390 mỗi giai đoạn; `docs/evidence/<mã>-admin-ui-redesign.md` ở P6. |
| §2: nhánh `<tên>/<mã>-<mô-tả>` từ `develop` | Nhánh hiện tại `trang/TF-use-post-video-payload` **không liên quan** (có 1 file untracked của người khác). Cần mã ticket → tạo nhánh mới từ `develop`. |

---

## 3. Audit

Mức: **P0** = chặn trải nghiệm / sai hành vi · **P1** = ảnh hưởng lớn · **P2** = chất lượng.

### 3.1 Kiến trúc & điều hướng

| # | Mức | Phát hiện | Bằng chứng |
|---|---|---|---|
| A1 | P0 | **Mỗi route tự dựng lại cả shell.** 11 `app/*/page.tsx` đều render `PlaceholderPage → AdminWorkspace`; không có layout chung. Chuyển trang = unmount sidebar, tải lại `me` + `stats`, nháy `LoadingState`, mất vị trí cuộn sidebar. | `app/*/page.tsx`, `features/shell/live-workspace.tsx` |
| A2 | P1 | `AdminWorkspace` (333 dòng) gộp auth gate, phân quyền, sidebar, topbar, header trang và một **chuỗi ternary 15 nhánh** chọn trang theo `label`. Tên `PlaceholderPage` gây hiểu lầm (đã là trang thật). | `live-workspace.tsx:230–317` |
| A3 | P1 | **Nhóm menu sai nghiệp vụ.** 3 nhóm (Vận hành/Nền tảng/Quản trị); "Quản trị" là thùng rác 7 mục trộn Tồn kho, Đơn hàng, Nhân sự, Số liệu, Chi phí AI, Hành vi người dùng, Báo cáo. Nhóm khai báo cứng bằng danh sách `href` trong component, tách khỏi `nav.ts`. | `live-workspace.tsx:68–72`, `nav.ts` |
| A4 | P1 | **Icon trùng**: 14 mục chỉ dùng 9 icon; icon `analytics` dùng cho 4 mục (Số liệu, Theo dõi tìm kiếm, Job tìm kiếm, Job gợi ý), `users` 2 lần, `reports` 2 lần → không phân biệt nhanh được. | `nav.ts` |
| A5 | P2 | `nav.ts` chứa trường `owner` (tên thành viên team: "Dũng", "Trang"…) — dữ liệu nội bộ, không dùng để hiển thị. | `nav.ts` |
| A6 | P1 | **"Cập nhật hh:mm" hiển thị ở mọi trang nhưng lấy từ `moderation stats`** → trang Đơn hàng, Nhân sự cũng ghi giờ của số liệu kiểm duyệt (gây hiểu sai). | `live-workspace.tsx:312–316` |
| A7 | P1 | **4 lớp tiêu đề lặp** mỗi trang: breadcrumb topbar + eyebrow uppercase "KHÔNG GIAN VẬN HÀNH" + H1 30px + đoạn mô tả. Chiếm ~170px trước khi thấy nội dung. | `live-workspace.tsx:285–306`, ảnh overview |
| A8 | P2 | Query `['moderation','stats']` (shell) và `['moderation','stats', user.id]` (Kiểm duyệt) **khác key** → 2 request poll trùng nhau trên trang Kiểm duyệt. | `live-workspace.tsx`, `moderation-workspace.tsx:116` |
| A9 | P2 | Trang Audit và Báo cáo cùng render `OperationsLog` (chỉ khác nút xuất CSV) — trùng chức năng, hai mục menu. **Giữ cả hai route** (không xoá chức năng), nhóm gần nhau. | `live-workspace.tsx:313` |
| A10 | P2 | `module-content.tsx` (151 dòng, dữ liệu demo cứng) **không còn được import ở đâu** → mã chết. | grep: 0 tham chiếu |

### 3.2 Tương tác xem chi tiết (vấn đề người dùng nêu — 6 kiểu khác nhau)

| Trang | Hiện tại | Vấn đề |
|---|---|---|
| Kiểm duyệt › hàng chờ | `<dialog>` modal giữa màn hình, 3 sub-tab (Thông tin/Báo cáo/Lịch sử) | Che toàn bộ danh sách; không prev/next; đóng xong mất ngữ cảnh duyệt liên tục; CSS riêng `.mod-modal-*` |
| Kiểm duyệt › Quản lý bài viết | Khối chi tiết **nối dưới bảng** + `scrollIntoView` | Đúng cái lỗi "cuộn xuống mới thấy" (ảnh `held-post-1440.png`: chi tiết nằm ở y≈900) |
| Đơn hàng | `OrderDetailPanel` **nối dưới danh sách, không cuộn tới** | Bấm "Mở" ở hàng thứ 15 thì chi tiết hiện ngoài màn hình, người dùng tưởng không có gì xảy ra |
| Hành vi người dùng | Dialog rộng 4xl (bản sao `OperationsDialog` "để khỏi sửa component chung") | Trùng component; 4 nhóm Metric + 2 bảng + danh sách trong 1 dialog cuộn dài |
| Chi phí AI › trace | Dialog riêng | Kiểu thứ 4 |
| Analytics › trace | Khối nối dưới trang (`analytics-workspace.tsx:524`) | Kiểu thứ 5; waterfall nằm cuối trang |

Chung: **không có trạng thái trong URL** (chỉ trang login dùng `searchParams`) → F5 / Back / chia sẻ link mất hồ sơ đang mở và bộ lọc; không prev/next; không bảo vệ thay đổi chưa lưu (lý do/ghi chú trong modal kiểm duyệt, form tồn kho); dialog tự khôi phục focus nhờ native nhưng không có quy ước chung.

### 3.3 Bảng, bộ lọc, hành động

| # | Mức | Phát hiện |
|---|---|---|
| T1 | P0 | **Nhân sự: lọc vai trò/trạng thái chỉ áp dụng lên trang hiện tại** (`items.filter` sau khi server đã phân trang theo `query,page`) → lọc "Moderator" ở trang 1 có thể ra rỗng dù trang 3 còn nhiều. Hành vi gây hiểu sai (cần quyết định, xem Câu hỏi #6). |
| T2 | P1 | **5 hệ CSS bảng** song song: `.admin-table-scroll table`, `.ops-table`, `.mod-cases-table`, `styles.table` (post), module CSS của analytics/search. Cùng một loại dữ liệu hiển thị khác nhau. |
| T3 | P1 | Điều khiển **giả**: "Sắp xếp: Mức rủi ro giảm dần ▾" là chữ tĩnh trông như dropdown (`moderation-workspace.tsx` ~dòng 770). Không bảng nào có sort thật / `aria-sort`. |
| T4 | P1 | Hàng không bấm được; chỉ có nút ở cột cuối ("Xem chi tiết ↗", "Mở"). Trạng thái đơn hàng/người dùng là chữ trần, không badge. |
| T5 | P1 | **3 kiểu phân trang**: "Tải thêm" (cursor), prev/next theo trang, "Xem thêm"; đếm khác nhau. |
| T6 | P1 | Bộ lọc: `<select>` native label trên đầu, mỗi trang một layout (`admin-filters`, `mod-filter-bar`, `mod-subnav` aside…); Đơn hàng phải bấm nút "Tìm"; không có chip bộ lọc đang bật, không "xoá bộ lọc", không lưu URL. |
| T7 | P1 | Kiểm duyệt: **8 tab ngang** + aside lọc phụ + toolbar bulk + bảng = 4 tầng điều hướng. Chọn bulk mất khi đổi tab. Nút hành động có 6 kiểu (`mod-bulk-btn`, `mod-mini-tab`, `admin-primary/secondary`, `staff-btn-create-modal`, nút Tailwind rời, `Button` ui-web hầu như không dùng). |
| T8 | P2 | `Section` chi tiết đơn hàng render bảng **không có tiêu đề cột** (mỗi hàng là mảng chuỗi) → đọc không biết cột là gì. |
| T9 | P2 | `aria-selected` đặt trên `<tr>` ngoài `role=grid` (không hợp lệ); tab ở Kiểm duyệt/Nhân sự dùng `aria-pressed` thay vì `tablist`; chỉ AI usage có điều hướng phím mũi tên. |

### 3.4 Thị giác & hệ thống thiết kế

| # | Mức | Phát hiện | Số liệu |
|---|---|---|---|
| V1 | P0 | **3 hệ style chồng nhau**: Tailwind trong TSX + `legacy-features.css` (1481 dòng, class toàn cục `mod-*`, `staff-*`, `admin-*`) + `operations.css` (594 dòng) **ghi đè legacy bằng `.ops-content …` và `!important`** + 8 CSS Modules. | ≈ 4.700 dòng CSS; 10 `!important`; 25 `style={{}}` riêng `moderation-workspace.tsx` |
| V2 | P1 | **Thẻ dày đặc & lồng nhau**: `Panel` (viền + shadow + header nền xám + thanh teal) · `Metric` (viền + `border-t-4` + số 36px) · `.mod-monitor-card` · `.admin-data` · `.mod-table-panel` · `.mod-subnav-card`. Trang Kiểm duyệt: 4 KPI card + 1 khối tổng hợp + tab + aside card + panel bảng; chi tiết bài viết có card trong card (ảnh). |
| V3 | P1 | **Bán kính bo 10 giá trị** (4,5,6,7,8,10,12,14,16,999px) + `rounded-md/lg/xl/full`; shadow ở nút (`translateY(-1px)` + shadow khi hover) và card. |
| V4 | P1 | **Chữ quá nhỏ & quá đậm**: nhiều chỗ 9–10px (`text-[10px]`, badge ADMIN 9px, nhãn nhóm 10px `text-text-subtle` ≈ 2.6:1 **không đạt tương phản**). Chỉ có 2 file font (regular 400, bold 600–900) → mọi nhãn/hierarchy dùng 400 hoặc 700. Eyebrow **VIẾT HOA + tracking rộng** cho tiếng Việt có dấu → khó đọc. |
| V5 | P1 | **Số KPI 36px ×4 thẻ** lặp ở Tổng quan, Kiểm duyệt, Nhân sự, Jobs; Nhân sự có 2/4 chỉ số là "trên trang hiện tại" (ít giá trị quyết định). Tổng quan: biểu đồ thanh Recharts chỉ có **2 cột** (Bài viết/Bình luận) — trang trí. |
| V6 | P2 | Token màu dùng khá tốt (chỉ ~30 hex cứng, chủ yếu trong `admin-icons.tsx`), nhưng **thiếu tầng ngữ nghĩa** (status success/warning/danger/info, surface cấp 0/1/2, line). Ví dụ `--color-warning` = vàng `#FFC531` không dùng được làm chữ. |
| V7 | P2 | Ký tự thay icon: `▶` (logo), `☰`, `×`, `✕`, `↗` (dùng cho **cả liên kết nội bộ** và "Đăng xuất ↗"). Icon tự vẽ trong `admin-icons.tsx`. |
| V8 | P2 | Loading là 3 khối xám giống nhau; Empty là ô vuông viền; Error mỗi nơi một kiểu (`AdminApiError` + `.admin-error`). |

### 3.5 Điểm tốt cần giữ

Skip-link, `aria-current`, `<dialog>` native (focus trap + Esc), focus-visible teal, `prefers-reduced-motion`, drawer menu mobile, polling + realtime, RBAC theo `MODERATOR_PAGES`, token màu thương hiệu, bộ test 20 file (format/range/lease…), BFF proxy.

---

## 4. Chiến lược thiết kế

### 4.1 Nguyên tắc

1. **Không-gian-làm-việc, không phải bộ sưu tập thẻ.** Nền phẳng; phân tách bằng đường kẻ mảnh và khoảng cách, không bằng khung. Tối đa **một cấp** bề mặt viền (bảng/toolbar). Cấm card lồng card.
2. **Một cách xem chi tiết**: danh sách → **drawer phải**. Modal chỉ cho xác nhận / form ngắn. Trang riêng chỉ khi thật sự phức tạp (Tồn kho, Theo dõi tìm kiếm).
3. **Mật độ vừa phải**: hàng bảng 40px (compact 32px), chữ thân 13px/20, tối thiểu 12px, số liệu `tabular-nums`.
4. **Màu có chức năng**: teal-ink = đang chọn/liên kết/focus; coral = *một* nút chính mỗi vùng; trạng thái bằng badge ngữ nghĩa; còn lại là trung tính.
5. **Số liệu chỉ khi dẫn tới hành động** (bấm vào lọc/đi tới hàng chờ).

### 4.1b Direction theo skill unslop (heydamir/unslop, CC BY 4.0 — ghi nguồn)

Áp dụng **quy tắc** của skill làm kiểm tra chất lượng cho thiết kế đã duyệt (không cài plugin, không đổi cấu trúc đã duyệt). Năm dòng định hướng:

- **Product**: bảng điều hành nội bộ cho moderator/superadmin Tripflix (nền tảng khám phá chuyến đi cho giới trẻ): duyệt nội dung, theo dõi đơn hàng, giám sát hệ thống.
- **Character**: chính xác, yên tĩnh, dày thông tin nhưng dễ quét; thương hiệu chỉ lộ ở logo và một điểm nhấn.
- **World**: giấy trắng + xám trung tính hơi lạnh (mặt biển/đá), đường kẻ mảnh; không nền màu.
- **Moments**: chỉ ba chỗ có màu giàu: huy hiệu "khẩn cấp", nút hành động chính, dấu chọn đang hoạt động.
- **Signature**: hàng đang chọn có vạch teal 2px bên trái + drawer phải; số liệu mono-tabular; nhãn câu thường (không viết hoa rải chữ).

Điều chỉnh rút ra từ checklist unslop (so với bản đầu của kế hoạch):
1. **4px grid**; hàng bảng 36 (compact 32), nút/ô nhập 32–36; sidebar **240**, header trang **56**; padding panel 16, trang 24.
2. **Bo góc 4 / 8 / 12**: huy hiệu & keycap 4 · nút, input, hàng, toolbar 8 · drawer, dialog 12 (bỏ mức 6/10).
3. **Một màu nhấn hóa chất**: coral chỉ cho nút chính (tối đa 1/vùng) và badge khẩn cấp; teal chỉ cho focus ring + vạch chọn; **mục đang chọn = nền bậc bề mặt + đường kẻ mảnh** (không tô nền teal).
4. **Không đổ bóng** ở nút/thẻ; shadow chỉ cho drawer/popover: `0 8px 24px rgba(0,0,0,.06)`. Đường kẻ mảnh 6–10% độ đục.
5. **Chuyển động**: chỉ `transition-colors/opacity/transform`; **một easing** `cubic-bezier(0.22,1,0.36,1)`; hover/press 120–180ms, drawer/menu 160–220ms; bỏ `translateY(-1px)` khi hover, `animate-pulse` vòng lặp.
6. **Chữ**: nhãn 12/16, thân 13–14/20, tiêu đề trang 20/28; **câu thường, bỏ eyebrow uppercase**; `tabular-nums`; **không dấu chấm cuối** tiêu đề/nhãn/nút; không dấu `!`; mũi tên `↗` chỉ cho liên kết ngoài. *Lệch có chủ đích*: skill khuyên 400/500/600, ta chỉ có 400/700 (đã quyết **không thêm font**) → dùng 400 là chính, 700 rất ít, phân cấp bằng cỡ + màu.
7. **Icon**: một bộ line 16px, stroke 1.5, mỗi mục menu một icon, bỏ ký tự `▶ ☰ × ✕`.
8. **Thẻ số liệu**: nhãn + số + thay đổi có so sánh nếu có dữ liệu; không sparkline/icon trang trí.

### 4.2 Token admin (lớp ngữ nghĩa, đặt trong `apps/admin/src/ui/admin.css`, tham chiếu token thương hiệu có sẵn — không sửa `packages/tokens`)

| Nhóm | Giá trị đề xuất |
|---|---|
| Bề mặt | `canvas` = `--color-surface` (nền app) · `panel` = trắng (vùng làm việc) · `subtle` = `--color-surface-muted` (header bảng, hover) |
| Đường kẻ | `line` = `--color-border` · `line-strong` (focus/ chọn) = teal-ink 40% |
| Chữ | `ink` · `muted` (`--color-text-muted`, ≥4.5:1) · **bỏ `text-subtle` cho chữ** (chỉ dùng cho icon/placeholder) |
| Trạng thái | success = teal-ink trên `sea-mist` · warning = `#8A5A00`-tông chữ trên `sun-soft` (cần tính contrast) · danger = `coral-ink`/`danger` trên `coral-tint` · info/neutral = slate |
| Bán kính | **chỉ 3 mức**: 4px (badge/keycap) · 8px (nút, input, hàng, toolbar) · 12px (drawer/dialog) |
| Đổ bóng | chỉ drawer & popover (1 mức); **bỏ shadow ở card/nút** |
| Chữ | thân 13–14/20 · bảng 13 · meta/nhãn 12/16 · tiêu đề trang 20/28 · tiêu đề mục 13. Trọng lượng: 400 là chính, 700 rất ít (không thêm font) |
| Kích thước | sidebar 240px · header trang 56px · hàng bảng 36px (compact 32) · input/nút 32–36px · drawer 440 / 640 / 800px |
| Chuyển động | `cubic-bezier(0.22,1,0.36,1)`; hover 120–180ms; drawer/menu 160–220ms; tôn trọng reduced-motion |

### 4.3 Kiến trúc layout

```
┌ Sidebar 232 ┐ ┌ Main ───────────────────────────────────────────────┐
│ Logo        │ │ PageHeader (sticky 52): Tiêu đề · meta · [Hành động]│
│ Nhóm ▾      │ │ MetricStrip (tuỳ trang): 1 dải, chia bằng vạch dọc  │
│  mục…       │ │ FilterToolbar: tìm · bộ lọc · chip · đếm kết quả    │
│ Nhóm ▾      │ │ Vùng dữ liệu chính (DataTable / workspace)          │
│ ───         │ └───────────────────────────────┬─────────────────────┘
│ ●Live ⟳ User│            DetailDrawer (phải, overlay) ◄── mở theo ?id=
└─────────────┘
```

- **Bỏ topbar + breadcrumb + eyebrow**: tiêu đề nằm ở `PageHeader` (1 lớp, h1 18–20px, mô tả ngắn chuyển thành tooltip/dòng meta nếu cần). Trạng thái realtime + nút làm mới + menu người dùng chuyển xuống chân sidebar; < 1024px có thanh trên mỏng (menu + logo).
- **Route group `app/(console)/layout.tsx`** chứa `AdminShell` **bền vững** giữa các trang (giải A1). URL **không đổi**. `login` và `auth/handoff` ở ngoài group. Auth gate + `RoleGuard` theo trang thay cho chuỗi ternary (giải A2). *(Cần đọc `node_modules/next/dist/docs` trước khi làm — AGENTS.md cảnh báo Next 16.4 khác kiến thức cũ.)*
- "Cập nhật lúc" lấy từ `dataUpdatedAt` của **query của chính trang** (giải A6).

### 4.4 Điều hướng đề xuất (giữ nguyên 14 route, đổi nhóm, mỗi mục một icon riêng)

| Nhóm | Mục (route) | Vai trò thấy |
|---|---|---|
| *(không tiêu đề)* | Tổng quan `/` | moderator, superadmin |
| **Nội dung** | Kiểm duyệt `/moderation` (badge hàng chờ) · Cảnh báo `/alerts` (badge) · Nhật ký kiểm toán `/audit` · Báo cáo `/reports`¹ | moderator: 3 mục đầu; superadmin: +Báo cáo |
| **Thương mại** | Đơn hàng & Thanh toán `/orders` · Lịch trống & giá `/inventory` | superadmin |
| **Người dùng** | Hành vi người dùng `/user-activity` · Phân quyền & Nhân sự `/staff` | superadmin |
| **Hệ thống** | Số liệu & Giám sát `/analytics` · Theo dõi tìm kiếm `/search-monitor` · Job tìm kiếm `/search-jobs` · Job gợi ý `/recommend-jobs` · Chi phí AI `/ai-usage` | moderator: Theo dõi tìm kiếm + 2 Job; superadmin: tất cả |

¹ Giữ nguyên quyền hiện tại (`MODERATOR_PAGES`): Báo cáo chỉ superadmin. Nguồn nhóm/quyền/icon gom về **một mảng cấu hình** `adminNavGroups` trong `nav.ts` (bỏ `owner` — Câu hỏi #7). Nhóm thu gọn được, nhớ trạng thái (localStorage, có try/catch); nhóm chứa route đang mở luôn mở.

### 4.5 Ma trận chi tiết: drawer / modal / trang

| Ngữ cảnh | Bề mặt | Cỡ | Ghi chú |
|---|---|---|---|
| Hồ sơ kiểm duyệt (nội dung, báo cáo, lịch sử, bằng chứng video/OCR) | Drawer | **Wide 800** | Tab Thông tin / Báo cáo / Lịch sử (giữ tab "Lịch sử" hiện có — điểm nối cho Phase 2 sản phẩm); footer cố định: Ẩn / Gỡ / Bác bỏ + lý do |
| Bài viết (Quản lý bài viết) | Drawer | Standard 640 | Thay khối nối dưới bảng; bỏ `scrollIntoView` |
| Đơn hàng | Drawer | **Wide 800** | Tab: Tổng quan · Mặt hàng & khách · Thanh toán & hoàn tiền · Lịch sử; mỗi bảng có **tiêu đề cột** |
| Hành vi người dùng | Drawer | Wide 800 | Tab: Tổng quan · Hoạt động · Chi phí AI; thay `UserActivityDialog` |
| Trace Chi phí AI | Drawer | Wide 800 | |
| Trace Analytics (waterfall) | Drawer | Wide 900 | |
| Khiếu nại / Scan lỗi | Hàng + menu hành động; xác nhận bằng modal; chi tiết (nếu có) = drawer Compact 480 | | Đọc kỹ ở P4 |
| Nhân sự: khoá/mở/cấp/thu hồi, tạo nhân sự | **Modal** (ConfirmDialog / form ngắn) | | Dùng lại logic `OperationsDialog` |
| Tồn kho: lịch + chỉnh sửa hàng loạt ngày | **Trang đầy đủ** (có lý do: lưới lịch + form lớn) | | Thanh hành động dính "Áp dụng" |
| Theo dõi tìm kiếm | Trang đầy đủ (công cụ truy vấn) | | |

**Hành vi `DetailDrawer`** (xây trên `<dialog>`, không thêm thư viện):
- **≥1024px: không-modal, overlay bên phải** (không đẩy layout → vị trí cuộn danh sách giữ nguyên; vẫn bấm được hàng khác để đổi hồ sơ). **<1024px: modal toàn màn hình** (focus trap).
- Header cố định: tiêu đề + mã + `StatusBadge` + hành động chính + prev/next (`←`/`→` nút, `J`/`K` phím tắt khi focus ở danh sách/drawer) + nút đóng. Thân cuộn riêng. Footer cố định khi có hành động.
- `Esc` đóng (không đóng khi đang mở select/popover/ConfirmDialog con); đóng → **trả focus về đúng hàng** đã mở; hàng đang chọn có chỉ báo (vạch trái teal + nền nhạt).
- **ID hồ sơ trong URL** (`?id=`; không tạo history mới khi chuyển prev/next → dùng `replaceState`) cùng bộ lọc/tab (`?tab=&q=&status=`): F5, Back, chia sẻ link đều giữ ngữ cảnh. Chuyển tab trang không mất lựa chọn bulk (giải T7).
- `isDirty` → hỏi xác nhận khi đóng/chuyển hồ sơ (lý do/ghi chú kiểm duyệt, form tồn kho).
- Trạng thái loading (skeleton theo hình), error có nút thử lại, hồ sơ không còn tồn tại.
- **Điểm mở rộng** cho Phase 2 sản phẩm (không triển khai): `tabs` nhận danh sách section đăng ký; `DataTable` có slot `rowMarker`; `StatusBadge` map tone mở rộng được.

### 4.6 Bảng & bộ lọc

- `DataTable`: cột khai báo (`header`, `cell`, `align`, `width`, `hideBelow`), hàng 40px, chữ số căn phải `tabular-nums`, cắt chữ dài + tooltip, **hàng bấm được** (cả hàng mở drawer; ô đầu là nút thật cho bàn phím/screen reader, `aria-current` cho hàng chọn), checkbox + `BulkBar` dính trên cùng khi có chọn, tiêu đề cột dính, trạng thái loading/empty/error chuẩn. Sort **chỉ** khi API hỗ trợ tham số sắp xếp (sẽ kiểm trong `api-client`); nếu không thì hiển thị nhãn tĩnh "Sắp theo mức rủi ro", **không giả dropdown** (giải T3).
- `FilterToolbar` một hàng 32px: ô tìm (debounce, tìm ngay không cần nút) · lọc nhanh (segmented/select gọn) · "Bộ lọc" (popover cho lọc phụ) · chip bộ lọc đang bật + "Xoá hết" · bên phải: số kết quả. Trạng thái lọc ↔ URL.
- Phân trang thống nhất: `Pagination` (theo trang: "21–40 / 134") và `LoadMore` (cursor: "Hiển thị 40 / 134 · Tải thêm").
- Hành động: nút chính (coral, tối đa 1/vùng) · phụ (viền mảnh) · ghost · nguy hiểm (chữ/viền danger, luôn qua ConfirmDialog) · `ActionMenu` (⋯) cho hành động hàng · `BulkBar` cho hàng loạt.

### 4.7 Tổng quan (dashboard) — chỉ dùng dữ liệu đã có

Trả lời: *Cần xử lý gì? Gì thay đổi? Đi đâu tiếp?*
1. **Dải "Cần xử lý"** (MetricStrip, mỗi ô là liên kết tới hàng chờ đã lọc): Chờ duyệt · Khẩn cấp · Khiếu nại · Scan lỗi. Superadmin: thêm dải hệ thống (từ `SystemSummary`, đọc ở P5).
2. **Hai cột**: trái "Hàng chờ ưu tiên" (bảng 5 dòng, bấm → `/moderation?id=…`); phải "Tình trạng hệ thống" (danh sách worker với chấm trạng thái) + cơ cấu hàng chờ dạng thanh tỉ lệ (bỏ biểu đồ Recharts 2 cột).
3. **Thao tác gần đây** (5 dòng, dạng timeline gọn) → "Xem nhật ký".
Bỏ 4 thẻ số 36px.

### 4.8 Thành phần (đặt trong `apps/admin/src/ui/`, kebab-case)

`admin-shell`, `sidebar-nav`, `page-header`, `metric-strip`, `data-table`, `filter-toolbar`, `status-badge`, `detail-drawer`, `confirm-dialog`, `empty-state`, `loading-state` (skeleton), `error-state`, `form-field` (+`input`,`select`), `action-menu`, `tabs` (có điều hướng mũi tên — tổng quát hoá từ `ai-usage-tabs`), `pagination`, `button`, `icons` (tập icon riêng cho từng mục menu).
Chuyển giao an toàn: `features/shell/operations-ui.tsx` (`Panel`, `Metric`, `EmptyState`, `LoadingState`) giữ nguyên tên export nhưng **bên trong dùng thành phần mới** → các trang chưa migrate không vỡ; xoá ở P6 sau duyệt.

### 4.9 `StatusBadge` — ánh xạ (chỉ dùng enum đã có trong i18n/API, không phát minh)

| Miền | Tone |
|---|---|
| Kiểm duyệt: chờ duyệt / đã duyệt / đã ẩn / đã gỡ / khẩn cấp (≥ `urgentSeverity`) | warning / success / neutral / danger-nhạt / danger |
| Bài viết: draft / published / held / hidden / removed / deleted | neutral / success / warning / neutral / danger-nhạt / neutral |
| Đơn hàng (`ORDER_STATUSES`) + payment `needsReview` | theo `getStatusLabel` hiện có; cần review = warning |
| Job outcome: succeeded / failed / running / skipped | success / danger / info / neutral |
| Worker: ok / attention / offline | success / warning / danger |
| Người dùng: active / locked; vai trò: member / moderator / superadmin | success / danger-nhạt; neutral / info / brand |

Badge = chấm + nhãn (không chỉ dựa màu).

---

## 5. Trang theo trang (tóm tắt layout)

| Trang | Bố cục mới |
|---|---|
| Tổng quan | Mục 4.7 |
| Kiểm duyệt | Header + **MetricStrip hợp nhất** (Chờ duyệt · Khẩn cấp · Quá hạn · Sắp đến hạn · Scan lỗi — gộp 4 thẻ KPI + khối "operations"; đoạn chính sách → popover ⓘ) · **6 tab** (Hàng đợi · Khiếu nại · Scan cần phục hồi · OCR ảnh bìa · Nhật ký · Bài viết) — 4 trạng thái chờ/đã duyệt/đã ẩn/đã gỡ thành **segmented** trong toolbar của "Hàng đợi" (Câu hỏi #5) · aside lọc phụ thành chip trong toolbar · bảng + BulkBar · CaseDrawer |
| Cảnh báo | Danh sách dòng có chấm mức độ, bấm → trang đã lọc |
| Nhật ký / Báo cáo | Một `DataTable` + LoadMore; Báo cáo có nút Xuất CSV ở header; bấm dòng → drawer Compact (chi tiết dòng log) |
| Đơn hàng | Tab Bất thường / Tra cứu (tablist đúng chuẩn) → bảng có badge → drawer Wide |
| Tồn kho | Trang workspace: thanh chọn sản phẩm/khoảng ngày + lưới lịch + thanh hành động dính |
| Hành vi người dùng | MetricStrip? (không — chỉ biểu đồ hoạt động gọn) + toolbar khoảng thời gian + bảng + drawer |
| Nhân sự | Bỏ 4 Metric; tab Người dùng / Vai trò dạng tabs chuẩn; toolbar tìm + lọc (xử lý T1) + nút "Tạo nhân sự" (primary); ActionMenu hàng; modal xác nhận |
| Số liệu / Chi phí AI / Theo dõi tìm kiếm / Jobs | Gỡ viền-thẻ dày, dùng PageHeader + Tabs + vùng phẳng; chart giữ Recharts nhưng đổi màu/trục theo token; mỗi job một khối phân cách bằng đường kẻ |

---

## 6. Các giai đoạn triển khai

Mỗi giai đoạn: **làm → kiểm tra (7) → báo cáo → chờ duyệt**.

### P1 — Nền tảng & Shell
- **Làm**: `ui/admin.css` (token ngữ nghĩa) · `button`, `status-badge`, `input/select/form-field`, `tabs`, `icons` · `nav.ts` → `adminNavGroups` (nhóm/quyền/icon) · route group `(console)` + `AdminShell` + `RoleGuard` + `PageHeader` · tách auth gate/ternary khỏi `AdminWorkspace` · "cập nhật lúc" theo trang. Nội dung trang cũ vẫn hiển thị trong khung mới.
- **File chính**: `app/layout.tsx` (không đổi), `app/(console)/layout.tsx` (mới), 11 `page.tsx` (di chuyển vào group, nội dung 1 dòng), `features/shell/live-workspace.tsx` (rút gọn), `nav.ts`, `ui/*` (mới), `packages/i18n/src/admin-operations.ts` (nhãn nhóm mới). **Chủ: Thành.**
- **Xong khi**: 14 route hiển thị trong shell mới; chuyển trang **không** unmount sidebar; quyền moderator/superadmin y hệt (test); mobile menu hoạt động; không còn H1 lặp; lint/typecheck/test xanh; ảnh baseline-trước/sau.

### P2 — Thành phần dữ liệu
- **Làm**: `metric-strip`, `data-table`, `filter-toolbar`, `pagination/load-more`, `confirm-dialog`, `action-menu`, `empty/loading/error-state`, hook `useUrlState`. Migrate trang đơn giản: **Cảnh báo, Nhật ký/Báo cáo, Nhân sự, Đơn hàng (danh sách), Hành vi người dùng (danh sách)**.
- **Xong khi**: các trang trên dùng `DataTable`/`FilterToolbar`; có test cho `useUrlState`, định dạng; bộ lọc Nhân sự xử lý theo quyết định #6.

### P3 — DetailDrawer & chi tiết
- **Làm**: `detail-drawer` (mục 4.5) + test hành vi (Esc, khôi phục focus, URL, dirty guard, prev/next) → chuyển: **Đơn hàng → Hành vi người dùng (thay `UserActivityDialog`) → Chi phí AI trace → Analytics trace**.
- **Xong khi**: mở chi tiết ở hàng bất kỳ không cuộn trang; đóng trả đúng hàng + giữ cuộn/bộ lọc/trang; F5 giữ hồ sơ; dialog trùng lặp được thay.

### P4 — Kiểm duyệt (rủi ro cao)
- **Trước khi bắt đầu**: kiểm các nhánh/worktree đang mở đụng `features/moderation` (có `tf-admin-contrast`, `tripflix-fe-moderation-pr`, `outputs/admin-moderation-off-platform-…`) để tránh xung đột; đọc phần chưa audit (thân modal, Appeals, Scans, Log, OCR). **Tách `moderation-workspace.tsx` (1376 dòng)** thành file theo tab trước, rồi mới đổi giao diện.
- **Làm**: tab hợp nhất, MetricStrip, `CaseDrawer` (Thông tin/Báo cáo/Lịch sử + footer quyết định + khoá "lease" hiện có), `PostDrawer`, `BulkBar`, URL state; cập nhật `tools/verify-moderation*.cjs` cho selector mới (**cập nhật chứ không nới lỏng** kiểm tra).
- **Xong khi**: tất cả hành động hiện có (ẩn/gỡ/khôi phục/bác bỏ, bulk, appeals, scans, lease, OCR) hoạt động y hệt (test + verify script chạy thật); chi tiết không cần cuộn xuống; test `review-lease-state`, `moderation-*` vẫn xanh.

### P5 — Tổng quan & trang hệ thống
- **Làm**: Tổng quan (4.7); Tồn kho; Số liệu; Chi phí AI; Theo dõi tìm kiếm; Jobs — gỡ card dày, áp token, giảm CSS Module (search-monitoring 950 dòng, analytics 516 dòng).
- **Xong khi**: không còn `Metric` 36px / `Panel` kiểu cũ; số liệu vẫn từ API gốc.

### P6 — Hoàn thiện
- Responsive 1440/1280/1024/768/390 · rà a11y (phím, focus, tương phản, tablist, `aria-*`) · gỡ lớp tương thích + CSS cũ (**sau duyệt**, mục 8) · `docs/evidence/<mã>-admin-ui-redesign.md` + ảnh · cập nhật mục 0/9.

---

## 7. Kiểm tra mỗi giai đoạn

1. `pnpm turbo run lint typecheck test --affected` (kết quả thật, ghi số test).
2. Chạy app thật `pnpm --filter @tripflix/admin dev` (cổng 3200); chụp 1440/1024/390 (Playwright qua `PLAYWRIGHT_PACKAGE`, kênh msedge — như `tools/verify-*.cjs`).
3. Kịch bản tay theo giai đoạn: điều hướng + quyền 2 vai trò; mở/đóng drawer, Esc, focus, F5, prev/next; bulk; trạng thái loading/empty/error.
4. a11y: kiểm bằng bàn phím + đọc cây truy cập của Playwright; tương phản tính tay cho token mới.
5. So ảnh trước/sau; ghi vào mục 9.

---

## 8. Quyết định & phê duyệt

**Đã chốt 2026-11-20** (người dùng duyệt thiết kế + trả lời):
1. Nhánh: `trang/TF-admin-ui-redesign` (theo đề xuất, không có mã ticket; cùng kiểu với nhánh `trang/TF-use-post-video-payload`), tạo từ `origin/develop`.
2. Thành phần mới ở `apps/admin/src/ui/`; **đã báo Thành**.
3. Kiểm duyệt 8 tab → 6: **đồng ý**.
4. Nhân sự: **giữ** lọc vai trò/trạng thái và gắn nhãn "trên trang này".
5. Môi trường verify: **stack local** (Docker + tài khoản QA seed); không thêm `@axe-core/playwright`.
6. **Đã duyệt xoá**: `features/shell/module-content.tsx` (mã chết, 0 tham chiếu) và trường `owner` trong `nav.ts`. Việc xoá `legacy-features.css`, `operations.css`, lớp tương thích ở P6 vẫn **hỏi lại lúc đó**.
7. Font: **không thêm**.
8. Drawer không-modal ≥1024px, checkpoint sau mỗi giai đoạn: theo mặc định đề xuất.
9. Dùng quy tắc skill unslop (mục 4.1b).

Bảng gốc (để tham chiếu):

| # | Câu hỏi | Mặc định đề xuất |
|---|---|---|
| 1 | **Mã ticket / tên nhánh** (nhánh hiện tại không liên quan; có file untracked của người khác) | Tạo `trang/<mã>-admin-ui-redesign` từ `develop` |
| 2 | Chấp thuận thành phần mới ở `apps/admin/src/ui/` (không sửa `packages/ui-web`, `tokens`) và **báo Thành** (chủ `apps/admin`) | Có |
| 3 | Font: chỉ có 400 & 700. Thêm Be Vietnam Pro **Medium/SemiBold** (file font OFL vào `public/brand/`) để phân cấp nhẹ hơn? | **Không** — dùng cỡ chữ + màu, in đậm tiết kiệm |
| 4 | Drawer ≥1024px là **không-modal overlay** (bấm hàng khác để đổi hồ sơ) thay vì modal | Không-modal (modal toàn màn hình <1024px) |
| 5 | Kiểm duyệt: gộp 8 tab → 6 (4 trạng thái thành segmented). Đổi nhãn nút/tab → cập nhật verify script | Đồng ý |
| 6 | Nhân sự: lọc vai trò/trạng thái chỉ trên trang hiện tại. Giữ + ghi nhãn "trên trang này", hay đề xuất task BE thêm tham số lọc? (không sửa BE trong task này) | Giữ + ghi nhãn; đề xuất task BE riêng |
| 7 | Cho phép xoá (>20 dòng, báo ⚠️ lúc thực hiện): `module-content.tsx` (mã chết 151 dòng), trường `owner` trong `nav.ts`, và ở P6: `legacy-features.css` + `operations.css` + lớp tương thích | Duyệt từng việc khi tới lúc |
| 8 | Môi trường kiểm tra: dùng **stack local** (cần Docker + tài khoản QA, biến `OPERATIONS_QA_PASSWORD`) hay **mock route** Playwright? Có được thêm `@axe-core/playwright` (thư viện mới) không? | Stack local nếu chạy được; axe: không thêm, kiểm tay |
| 9 | Nhịp checkpoint: dừng sau **mỗi** giai đoạn (đúng yêu cầu hiện tại) | Có |

## 9. Nhật ký

- 2026-11-20 — P0: audit + kế hoạch (file này). Chưa sửa mã nguồn. Chờ duyệt mục 8.
- 2026-11-20 — Duyệt thiết kế + quyết định mục 8. Tạo nhánh `trang/TF-admin-ui-redesign` từ `origin/develop`.
- 2026-11-20 — **Baseline thật** (develop `232b4fd`; ảnh ở `tripflix/outputs/admin-ui-redesign/baseline/`): lint 2 cảnh báo có sẵn (`user-activity-dialog.tsx`), typecheck xanh, test 67/67. Bổ sung audit: Tổng quan của superadmin (SCRUM-181 `SystemSummary`) gồm 5 panel chứa các thẻ Metric bên trong → thẻ lồng thẻ nặng hơn ảnh cũ 17/11; trang Kiểm duyệt cần cuộn ~800px mới tới bảng (4 KPI + khối tổng hợp + 8 tab + 3 hàng bộ lọc trước bảng). Xử lý ở P4/P5.
- 2026-11-20 — **P1 xong.** Đã làm:
  - `src/ui/`: `admin.css` (bán kính 4/8/12, easing, shadow), `icons.tsx` (14 icon riêng + menu/close/chevron/refresh/logout), `button.tsx` (`AdminButton`: primary coral-ink / secondary / ghost / danger; cao 28/32/36), `status-badge.tsx` (6 tone, có chấm + chữ), `page-header.tsx` (sticky 56px, 1 lớp), `sidebar-nav.tsx` (nhóm thu gọn, nhớ localStorage, nhóm đang mở luôn mở), `nav-types.ts`.
  - `nav.ts`: `adminNavGroups` (5 nhóm: Tổng quan · Nội dung · Thương mại · Người dùng · Hệ thống) là nguồn duy nhất cho nhóm/quyền/icon/mô tả; bỏ `owner`; `canAccessNavItem`, `findNavItem`, `getVisibleNavGroups`.
  - Route group `app/(console)/` (URL không đổi) + `layout.tsx` → `AdminShell` bền vững; 14 `page.tsx` giờ chỉ là `<AdminPage label=…><Feature/></AdminPage>` (hết chuỗi ternary). `AdminPage` kiểm quyền + vẽ `PageHeader`; trang không đủ quyền thì **không dựng nội dung**.
  - Bỏ: topbar + breadcrumb + eyebrow + "Cập nhật hh:mm" giả (A6, A7); `placeholder-page.tsx`; `module-content.tsx` (đã duyệt). Realtime + làm mới + người dùng + đăng xuất xuống chân sidebar; mobile có thanh trên 48px.
  - i18n: `adminOperations.navGroups`, `liveShort`, `reconnectingShort`, `offlineShort`.
  - Tests mới: `nav.test.ts` (+5): superadmin 14 mục không trùng; moderator đúng 7 route cũ; vai trò lạ 0 mục; icon không trùng; bỏ nhóm rỗng.
  - **Kiểm tra** (stack local + `pnpm --filter @tripflix/admin dev` cổng 3200, Edge qua playwright-core): typecheck xanh · lint 2 cảnh báo (bằng baseline) · `check-boundaries` không vi phạm · admin test **72/72** · i18n test 2/2 · `next build` OK (đủ 14 route, URL không đổi) · script trình duyệt 10/10 đạt: sidebar **không bị dựng lại** khi chuyển 5 trang liên tiếp, `aria-current` + `h1` đúng, nhóm thu gọn nhớ qua reload, menu mobile mở/đóng bằng Esc, không tràn ngang ở 1440/1024/390, moderator thấy đúng 7 mục và `/orders` bị chặn, không lỗi JS. Ảnh: `tripflix/outputs/admin-ui-redesign/p1/`.
  - **Lưu ý**: (a) `live-workspace.tsx` được **viết lại tại chỗ** thành `AdminShell` (333 → ~215 dòng, logic auth/quyền/realtime/đếm hàng chờ giữ nguyên, phần chọn trang chuyển sang `page.tsx`); tên file cũ giữ để tránh đổi tên/xoá file — đổi tên ở P6 nếu được duyệt. (b) `tests/e2e/admin/operations-redesign.cjs` (mock API) chạy đến bước cuối rồi fail ở assert "không lỗi trang": `SystemSummary` đọc `anomalies.counts` mà fixture mock không có (commit 727d2af mới hơn fixture) — **lỗi sẵn có, không do P1**; mọi bước về menu/quyền/mobile trước đó của script đều qua. Đề xuất task riêng sửa fixture. (c) Cảnh báo hydration trong log dev do extension của trình duyệt chèn thuộc tính (`bis_skin_checked`), không phải mã.
  - Hoãn sang P2 (chưa cần ở P1): `input/select/form-field`, `tabs`, `useUrlState`.
  - Chưa commit (chờ người dùng đồng ý; theo RULES: commit nhỏ, `Refs:` mã, không Co-Authored-By).
- 2026-11-20 — Người dùng yêu cầu commit P1 và làm tiếp tất cả các P còn lại (bỏ checkpoint từng giai đoạn). P1 commit `a5e6c8f`.
- 2026-11-20 — **P2 xong.** Thành phần mới trong `src/ui/`: `url-params.ts` + `use-url-params.ts` (tab/bộ lọc/trang trên URL, replaceState; shell bọc `<Suspense>`), `states.tsx` (EmptyState chữ thuần, LoadingState thanh tĩnh không nhấp nháy), `data-table.tsx` (hàng bấm được: ô đầu là nút thật, hàng chọn có vạch teal, cột phụ tự ẩn, skeleton), `filter-toolbar.tsx` (`SearchField` debounce 300ms/Enter không cần nút "Tìm", `SelectField` 32px viền teal khi đang lọc, `FilterToolbar` + "Xoá bộ lọc"), `pagination.tsx` (`Pagination` "21–40 / 134", `LoadMore`), `metric-strip.tsx` (một dải chia vạch dọc; ô có thể là liên kết/nút lọc), `tabs.tsx` (ARIA tablist, ←/→/Home/End), `dialog.tsx` (`AdminDialog` native dialog + `ConfirmDialog`; `closedby="any"`), `form-field.tsx` (`TextField`). `AdminButton` primary đổi sang nền **ink** (coral-ink dễ lẫn với nút nguy hiểm — lệch có chủ đích so với 4.1b). Tương thích: `Panel`/`Metric`/`EmptyState`/`LoadingState` (operations-ui), `OperationsDialog`, `AdminApiError` giữ tên, dùng giao diện mới bên trong; `operations.css` loại `.adm-control` khỏi luật input toàn cục cũ.
  - Trang đã chuyển: **Cảnh báo, Nhật ký/Báo cáo, Nhân sự** (tab chuẩn + thanh lọc một hàng + bảng + phân trang + modal xác nhận; bỏ 4 Metric; lọc vai trò/trạng thái giữ nguyên "trên trang này" kèm nhãn; số tài khoản vai trò chuyển sang tab Vai trò), **Đơn hàng** (tab; 6 ô số liệu là nút lọc; bảng; chi tiết vẫn là khối dưới bảng — P3), **Hành vi người dùng** (lọc thời gian + bảng + phân trang trên URL; dialog chi tiết — P3).
  - Hoãn có chủ đích: `ActionMenu` (hành động hàng của Nhân sự chỉ có 2 nút, giữ nút trực tiếp; sẽ làm nếu P4 cần).
  - **Kiểm tra**: typecheck xanh · lint 2 cảnh báo (bằng baseline) · boundaries OK · admin test **91/91** (+19: `url-params`, `DataTable`, `MetricStrip`, `Tabs`, `Pagination`, `StatusBadge`) · i18n 2/2 · script trình duyệt (stack local) đạt: tìm kiếm tự áp dụng và ghi URL, F5 giữ bộ lọc, Xoá bộ lọc làm sạch cả ô tìm kiếm, tab + phím mũi tên, ConfirmDialog/modal tạo nhân sự mở và Esc đóng, phân trang ghi URL, ô số liệu Đơn hàng là nút lọc, lọc trạng thái, khoảng thời gian + chi tiết người dùng, mobile 390 không tràn ngang, không lỗi JS. Ảnh: `tripflix/outputs/admin-ui-redesign/p2/`. (Dữ liệu seed không có đơn → chưa chụp được dòng đơn hàng.)
  - Ghi chú: `tests/e2e/api-integration.cjs` đã lệch với UI từ trước (tìm nhãn 'Tìm kiếm', nút 'Gỡ quyền kiểm duyệt'/'Khóa tài khoản' khác chữ hiện có) → không dùng làm căn cứ; moderation (P4) sẽ giữ tên nút 'Xem chi tiết', 'Ẩn bài', ô 'Lý do' mà các script verify-moderation dùng.
- 2026-11-20 — **P3 xong.** `ui/detail-drawer.tsx` (≥1024px không-modal overlay phải; <1024px modal toàn màn hình; cỡ compact/standard/wide 800/xwide 900; header dính có trạng thái, hồ sơ trước/sau, tab; thân cuộn riêng; footer dính; Esc đóng — bỏ qua khi có modal khác hoặc đang dùng ô chọn/nhập ngoài drawer; J/K chuyển hồ sơ; `isDirty` → ConfirmDialog "Bỏ thay đổi chưa lưu?"; trả focus về **hàng đang chọn**), `ui/use-detail-param.ts` (`?id=` trên URL: mở từ danh sách = pushState nên Back đóng drawer; đổi hồ sơ = replaceState; `close` dùng history.back nếu chính ta đã push, mở bằng link thì chỉ bỏ id), `ui/detail-navigation.ts` (`getNeighbors`), `ui/detail-parts.tsx` (`DetailSection`, `KeyValueList`), `DataTable.isRowSelected`. Điều hướng trước/sau đọc id **từ URL lúc bấm** (sửa race khi giữ phím J/K: bản đầu lùi 2 bước vì React chưa kịp vẽ lại).
  - Đã chuyển: **Đơn hàng → `order-drawer.tsx`** (4 tab Tổng quan / Mặt hàng và khách / Thanh toán và hoàn tiền / Lịch sử; mọi bảng có tiêu đề cột — trước đây là mảng chuỗi không nhãn; bỏ khối chi tiết nối dưới danh sách), **Hành vi người dùng → `user-activity-drawer.tsx`** (3 tab; Metric thẻ → MetricStrip), **Trace Chi phí AI → `ai-trace-drawer.tsx`** (đổi tên bằng git mv; MetricStrip + DataTable), **Trace Analytics → `TraceDrawer`** (xwide 900; waterfall giữ CSS module, làm lại ở P5).
  - **Kiểm tra**: typecheck xanh · lint 2 cảnh báo (bằng baseline) · boundaries OK · admin test **97/97** (+6: `getNeighbors`, `buildDrawerNavigation`, `DetailDrawer`) · i18n 2/2 · trình duyệt (stack local; Đơn hàng và trace AI dùng mock vì seed chưa có dữ liệu): mở chi tiết ở hàng thứ 20 sau khi cuộn 500px **trang không nhảy**, drawer ~800px sát mép phải và danh sách vẫn hiển thị, 4 tab có tiêu đề cột, J/K và nút Hồ sơ sau không thêm lịch sử, bấm hàng khác khi đang mở đổi hồ sơ, Esc đóng + trả focus đúng hàng + giữ vị trí cuộn + URL sạch id, nút Back đóng drawer, mở bằng link có id, id không tồn tại có thông báo, Hành vi người dùng 3 tab, mobile 390 thành modal toàn màn hình, không lỗi JS. Ảnh: `tripflix/outputs/admin-ui-redesign/p3/`.
  - **Việc cần duyệt xoá (RULES §3, chưa làm)**: `features/user-activity/user-activity-dialog.tsx` (60 dòng) nay **không còn được dùng** (còn 2 cảnh báo lint a11y có sẵn nằm trong file này) — đề nghị xoá ở P6 cùng CSS cũ.
  - Chưa làm có chủ đích: Trace Analytics chưa chạy thử với dữ liệu thật (Prometheus/Tempo không có trace trong seed); thay bằng typecheck + cùng `DetailDrawer` đã kiểm ở các màn khác.
- 2026-11-20 — **P4 xong (Kiểm duyệt).** `moderation-workspace.tsx` 1376 → ~120 dòng, tách: `moderation-shared.ts` (hằng số + `applyDecision` giữ nguyên logic + `severityTone`), `risk-tags.tsx`, `moderation-queue.tsx`, `case-drawer.tsx`, `appeal-queue.tsx`, `failed-scans.tsx`, `moderation-log.tsx` (`LogTable` dùng cho tab Nhật ký và tab Lịch sử trong drawer), `post-moderation.tsx` + `moderation-post-detail.tsx` (viết lại thành drawer một cột). Chuỗi mới ở `packages/i18n/src/moderation-console.ts`.
  - **Bố cục**: 4 thẻ KPI + khối "Phân công" + 8 tab + 3 hàng lọc → **một `MetricStrip` 6 ô** (Chờ duyệt / Khẩn cấp / Quá hạn / Đến hạn 1 giờ / Scan lỗi / Báo cáo 24h; các ô Chờ duyệt, Quá hạn, Đến hạn, Scan lỗi là nút lọc) + **6 tab** (`?tab=`) + 1 thanh công cụ (segmented Chờ duyệt/Đã duyệt/Đã ẩn/Đã gỡ, tìm kiếm, loại nội dung, người xử lý, thời hạn). Bảng bắt đầu ở y≈400px (trước: ~900px). Bộ lọc/tab/hồ sơ đều trên URL. "Sắp xếp: … ▾" giả đổi thành nhãn tĩnh "Sắp theo mức ưu tiên".
  - **Drawer hồ sơ** (wide 800): 3 tab Thông tin / Báo cáo (n) / Lịch sử xử lý; header có điểm ưu tiên + trạng thái + trước/sau; footer dính: lý do (ô chọn) + nhận xét + Đóng hồ sơ (nút chính) / Ẩn tạm thời / Khôi phục / Gỡ; panel nhận hồ sơ (lease) giữ nguyên ở đầu tab Thông tin; `window.confirm` → `ConfirmDialog` (Gỡ một hồ sơ, Gỡ hàng loạt, Chấp nhận khiếu nại); lý do/nhận xét gắn theo hồ sơ + `isDirty` hỏi trước khi đóng/chuyển.
  - **Thay đổi hành vi có chủ đích (UX)**: (1) sau khi ra quyết định, drawer **tự sang hồ sơ kế tiếp** (hoặc liền trước nếu là cuối, hết thì đóng) thay vì đóng rồi nhảy sang tab đích; (2) xử lý hàng loạt không còn tự đổi tab; (3) đổi bộ lọc/tab thì bỏ chọn hàng loạt (tập hồ sơ đã khác — an toàn hơn); (4) thanh hàng loạt chỉ hiện khi có chọn. Mọi API gọi giữ nguyên (`moderationApi.decide/commentAction/reviewLease/...`, `socialApi.moderatePost`).
  - Khiếu nại / Scan lỗi / Nhật ký: danh sách phẳng + đường kẻ, nút dùng `AdminButton`, xác nhận bằng dialog. **Chưa đổi**: tab OCR ảnh bìa (`cover-ocr-monitor.tsx`, CSS module riêng — P5/P6) và khối bằng chứng video/ảnh `moderation-parts.tsx` (còn viền hộp; test riêng giữ nguyên).
  - Sửa lỗi phát hiện khi kiểm: Esc khi hộp "Bỏ thay đổi?" vừa mở bị chính phím Esc đóng ngay → `DetailDrawer` gọi `preventDefault()` khi xử lý Esc.
  - **Kiểm tra**: typecheck xanh · lint 2 cảnh báo (bằng baseline) · boundaries OK · admin test **102/102** (+5: `applyDecision` 4 nhánh, `severityTone`) · i18n 2/2 · `next build` OK · trình duyệt trên **dữ liệu seed thật** (moderator): bảng y≈402, ô Quá hạn lọc qua URL, segmented, tìm kiếm + rỗng + Xoá bộ lọc, drawer mở ở hàng 2 không cuộn trang, 3 tab, dirty guard + form trống ở hồ sơ mới, Esc/URL/cuộn, deep link, bulk bar, 6 tab, drawer bài viết, mobile 390 (modal toàn màn hình, không tràn ngang), **quyết định thật** (nhận phiên + Đóng hồ sơ → tự sang hồ sơ kế; đã ghi 1 thay đổi vào DB local), không lỗi JS. Ảnh: `tripflix/outputs/admin-ui-redesign/p4/`.
  - Các script `tools/verify-moderation*.cjs` đã **lệch UI từ trước P4** (tìm nút 'Hàng chờ', region 'Chi tiết hồ sơ' không còn) nên không chạy được; không sửa trong P4 (ngoài phạm vi, ghi lại để mở task cập nhật).
  - **Chờ duyệt xoá ở P6 (RULES §3)**: `moderation-operations.module.css`, `post-moderation.module.css` (không còn được import), các lớp `mod-*`/`admin-post-*` trong `legacy-features.css` + `operations.css`.
- 2026-11-20 — **P5 xong (Tổng quan + trang hệ thống).**
  - **Tổng quan** (`admin-overview.tsx`, `system-summary.tsx`): dải "Cần xử lý" là `MetricStrip` (4 ô là liên kết tới `/moderation?tab=queue|appeals|scans`); bảng hàng chờ dùng `DataTable` (bấm dòng mở màn Kiểm duyệt) + `StatusBadge` mức ưu tiên; **biểu đồ Recharts 2 cột → thanh tỉ lệ bài viết/bình luận** kèm số; tình trạng chỉ mục và thao tác gần đây là danh sách phẳng; superadmin: 5 nhóm `SystemSummary` (Người dùng, Chi phí AI, Hệ thống, Đơn hàng, Job nền) mỗi nhóm một `MetricStrip` trong một khung (hết thẻ lồng thẻ, hết viền trên 4px + bóng của `AiKpi`); câu giải thích dài nằm dưới dải thay vì bị cắt trong ô; ô chọn khoảng thời gian dùng `SelectField`. Chỉ dùng dữ liệu của các API cũ.
  - **Số liệu & Giám sát** (`analytics-workspace.tsx`, `metric-chart.tsx`): `FilterToolbar` một hàng (khoảng thời gian, dịch vụ, tự cập nhật, làm mới) + `Tabs`/`TabPanel` chuẩn; 4 thẻ KPI → `MetricStrip`; bảng dịch vụ/route/trace → `DataTable` (trace bấm mở `TraceDrawer`, hàng đang mở được tô); hộp thông báo nguồn dữ liệu nhẹ; đồ thị SVG tự vẽ giữ nguyên thuật toán, đổi màu sang token (đường traffic teal-ink, latency navy). `analytics.module.css` **516 → ~110 dòng** (chỉ còn đồ thị + waterfall, phần khung/bộ lọc/bảng dùng thành phần chung).
  - **Chi phí AI**: `AiKpi` bỏ, 5 thẻ → `MetricStrip`; thanh lọc + tab dùng `FilterToolbar`/`Tabs` (thay `AiUsageTabs` tự viết); Người dùng và Trace → `DataTable` + `Pagination`, nút `AdminButton`, kết quả `StatusBadge`. Hồ sơ người dùng (`user-ai-usage.tsx`) cũng dùng `MetricStrip`.
  - **Job tìm kiếm / gợi ý** (`discovery-jobs.tsx`, `vocab-gaps.tsx`): `MetricStrip` 4 ô; mỗi job là một `Panel` (nút "Chạy ngay" `AdminButton`, chu kỳ tự chạy dùng `SelectInput`/`TextField` có nhãn, lịch sử chạy `DataTable` + `StatusBadge`, biểu đồ thời lượng không còn khung lồng); thống kê gợi ý là danh sách nhãn–giá trị; khoảng ngày của "Từ khoá thiếu" dùng `SelectField`.
  - **Lịch trống & giá** (`inventory-calendar.tsx`): biểu mẫu lọc một hàng (`SelectInput`/`TextField` 36px thay `admin-filters` ô 44px), bảng lịch căn phải số, form lưu thay đổi dạng lưới 4 cột với nhãn trên ô, thông báo "Đã lưu" cạnh nút. Thêm `SelectInput` vào `ui/form-field.tsx`.
  - **Theo dõi tìm kiếm** (6 tab): bỏ tiêu đề + huy hiệu trùng với `PageHeader`; tab chuẩn (`Tabs`), nút `admin-primary/secondary` → `AdminButton`, huy hiệu → `StatusBadge`; `search-monitoring.module.css` giữ nguyên cấu trúc nhưng gọn lại (khung 8px/16px, số lớn 36→24px, bỏ chữ 800, ô chọn cao 36px). Chưa viết lại nội dung từng tab (rủi ro cao, giá trị thấp vì chỉ là công cụ chẩn đoán).
  - **OCR ảnh bìa** (`cover-ocr-monitor.tsx`): `Segmented` có số đếm + `DataTable` + `LoadMore`; chi tiết bài mở trong `DetailDrawer` (có J/K, footer "Thử quét lại") thay cho khối mở xuống dưới từng thẻ; khối bằng chứng `moderation-parts` (dùng chung với drawer hồ sơ/bài viết) được làm phẳng bằng CSS: bỏ khung ngoài, danh sách một cột có đường kẻ, màu huy hiệu lấy từ token (trước: mã màu cứng). Test `cover-ocr-monitor.test.tsx` cập nhật theo markup mới (số đếm nằm trong `span` của `Segmented`, không còn `strong`).
  - Dùng thẳng `Metric`/`Panel` cũ còn lại: Chi phí AI (`Panel` làm khung bảng/biểu đồ — đã là khung phẳng viền mảnh) và `user-activity-overview`. `operations-ui.tsx` vẫn là lớp tương thích tới P6.
  - **Kiểm tra**: typecheck xanh · lint 2 cảnh báo (bằng baseline) · boundaries OK · admin test **102/102** · i18n 2/2 · `next build` OK · trình duyệt (stack local, superadmin; script `verify-p5.cjs`) đạt: ô "Chờ kiểm duyệt" dẫn tới `?tab=queue`, bấm dòng hàng chờ mở Kiểm duyệt, Tổng quan 1440/1024/390, Analytics tab Traces + báo mã trace sai, Chi phí AI 3 tab, Job tìm kiếm/gợi ý, Lịch trống chọn mã → tải lịch 7 ngày (có dữ liệu), Theo dõi tìm kiếm 6 tab, không lỗi JS. Tab OCR kiểm bằng **mock** vì core-api local (image cũ) trả 404 cho `/admin/moderation/cover-ocr`: 3 dòng, mở drawer, J chuyển lượt kế, footer có "Thử quét lại", Esc đóng. Ảnh: `tripflix/outputs/admin-ui-redesign/p5/` (trước: `p5-before/`).
  - **Đã xoá (đều do P5 thay thế, báo trước)**: `features/ai-usage/ai-kpi.tsx` (20 dòng; không còn nơi dùng). **Chờ duyệt xoá ở P6**: `features/ai-usage/ai-usage-tabs.tsx` (64 dòng, không còn được import).

### Dựng lại môi trường kiểm tra (session mới)

1. `docker start tripflix-postgres-1 tripflix-redis-1 tripflix-mailpit-1` rồi `tripflix-core-api-1 tripflix-notification-service-1 tripflix-traefik-1` (container có sẵn, giữ dữ liệu); đợi `http://localhost:3000/health` = ok.
2. `cd tripflix-fe && pnpm --filter @tripflix/admin dev` (cổng 3200). Nếu đổi export/di chuyển file mà gặp lỗi lạ: dừng dev, `rm -rf apps/admin/.next`, chạy lại (Turbopack giữ cache cũ).
3. Playwright: `playwright-core` cài ngoài repo (thư mục scratchpad của session, `npm i playwright-core`), `chromium.launch({ channel: 'msedge' })`. Tài khoản seed: `superadmin@tripflix.local`, `moderator@tripflix.local`, mật khẩu `tripflix-dev-123` (mặc định trong README BE).
