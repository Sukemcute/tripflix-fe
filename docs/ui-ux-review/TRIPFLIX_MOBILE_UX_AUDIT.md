# Tripflix Mobile — UI/UX & Gen Z Experience Audit

**Date:** 2026-11-22 · **Type:** audit only, no code changed
**Build audited:** `tripflix-fe` branch `trang/SCRUM-189-tripflix-stitch-redesign` @ `35de677c` (the Stitch "Original Explorer" redesign, the newest mobile UI; pushed but **not merged** to `develop`). `develop` (the older UI) was not re-rendered for this audit.
**Companion reports:** [VISUAL_DESIGN_CRITIQUE.md](VISUAL_DESIGN_CRITIQUE.md) · [UX_IMPROVEMENT_ROADMAP.md](UX_IMPROVEMENT_ROADMAP.md) · [GEN_Z_VALIDATION_PLAN.md](GEN_Z_VALIDATION_PLAN.md)
**Evidence folder (outside the repo, RULES §7):** `VSF/outputs/mobile-ux-audit-2026-11-22/` — `screens/` (PNG + page text per screen), `stitch/` (downscaled Stitch exports), `scripts/` (capture scripts). Screenshot ids below (e.g. `g06-explore-0`) refer to files in `screens/`.

---

## 1. Executive summary

The redesign has moved Tripflix from "student prototype" toward "real consumer app": one font family (Be Vietnam Pro), a warm-mist canvas, coral/teal/sun used with restraint, large confident headlines, and a mascot that finally appears in the right places (onboarding, empty states, Tripi entry). Onboarding and the Saved empty state are genuinely good.

It is **not yet launch-grade**, for four reasons:

1. **The product promise is not the structure.** Tripflix's differentiator is *video → itinerary → booking*. The app's structure is *video tab + OTA tab*. "Khám phá" is a hotel/flight search hub; itineraries — the bridge between video and booking — appear only in the fourth section of that screen, and tapping one silently moves you to the **Đặt** tab. The core journey works, but the app does not tell its own story.
2. **The design system is half-applied.** Two type scales coexist: the new `explorer.type` (body 16, headline 20) is used in **2 files**; the old `compactType` (body 12, heading 13, label 11) in **18 files**; legacy `colors.*` in **25 files**. The visible result: screen titles at 11–13 px next to 26–34 px headlines, tab labels at 10 px, chips at 11–12 px, three different tab/segment styles, and three different empty-state treatments.
3. **Trust breaks in commerce screens.** Hotel detail shows the sentence *"Khoảng cách địa danh là dữ liệu mẫu, dùng để tham khảo giao diện"* to users; search sends users out to *"Mở Web"* to book hotels; comment authors render as UUID fragments (`018d9f00`); the trip hero puts Tripi on top of the destination in a priced screen (the brief says to keep Tripi away from price and booking contexts); errors use a shield-check (trust/success) icon.
4. **Unfinished states.** Rooms & price shows dates and then nothing; a missing user shows "Không tìm thấy người dùng này" under a header still saying "Đang tải…"; the moderation-status screen is unstyled body text.

**Would a Gen Z user find it beautiful, exciting, intuitive and worth exploring?** Beautiful in places (onboarding, Reels, Saved), exciting in Reels, intuitive for Reels and hotel booking, *confusing* across tabs. Expert judgment: today it reads as "a competent travel booking app with a video feed attached", not yet as "the place where travel videos turn into my trip". That gap is structural, not cosmetic — and fixable.

**Recommended first redesign target:** information architecture of the tab bar + Explore + the Reels→itinerary handoff, then finishing the type/colour migration across all screens.

---

## 2. Method, scope and evidence

### 2.1 Discovery
- **Framework:** Expo SDK 58, Expo Router (typed routes), React Native 0.88, react-native-web 0.21, Reanimated 4, expo-video. 38 routes under `apps/mobile/src/app`.
- **Tabs** (`(tabs)/_layout.tsx`): Reels · Khám phá · Tạo (action → `/create`) · Đặt · Tôi; `inbox` hidden; unread-notification badge attached to **Khám phá**.
- **Design system:** `@tripflix/tokens` `explorer` v2 (Day/Night surfaces, type roles, spacing, radius, elevation, motion) beside the legacy palette; primitives in `components/mobile-ui.tsx`; compact type in `components/mobile-scale.ts`.
- **Brand assets:** `apps/mobile/assets/brand/` (logo, symbol, Tripi poses, Be Vietnam Pro). Brief: `tripflix-ui-design/STITCH-MOBILE-BRIEF.md`.
- **Stitch:** project *Tripflix Vietnam Travel App* (`17566515177619492500`), read via Stitch MCP on 2026-11-22 — 10 mobile designs; local exports in `tripflix-fe/docs/ui-redesign/stitch/`.

### 2.2 Design skills
The skills named in the brief (UI/UX Pro Max, Frontend Design, Mobile App Design, Accessibility, UX Research) are **not installed in this session**; none were used. The Stitch MCP *was* available and used. Analysis applies Nielsen's heuristics, Gestalt, Hick's/Fitts's laws, cognitive-load theory, WCAG 2.2, Apple HIG and Material 3 as analytical lenses.

### 2.3 Rendering setup (no app or backend changes)
- Expo web dev server from the audited branch, Chrome via Playwright, **390 × 844 viewport, touch, `isMobile`**, locale vi-VN, local backend stack (Docker: core-api, ai-service, notification-service, Postgres) with seed data.
- The local backend's CORS/origin allow-list does not include the Expo web origin, and the password-envelope login path did not complete in this environment; the capture script therefore proxies API calls and signs in the seeded account `member@tripflix.local` at the network layer. These are environment workarounds; they do not affect what the UI renders.
- **Limits of web rendering:** react-native-web is not iOS/Android. Native gestures, haptics, safe-area insets, keyboard behaviour, video playback performance, Android back, screen-reader output (TalkBack/VoiceOver) and Dynamic Type are **not verified**. A "BackHandler is not supported on web" toast in `i01` is a web-only artefact and is not counted.
- **Data limits:** seeded hotel photos return HTTP 403 from the CDN (objects absent under `dev/trang/images/hotels/…`), so every hotel card shows the "Ảnh chưa tải được" fallback. **Real hotel imagery is Not Visually Verified**; only the fallback state is. Seed authors have no display names.

### 2.4 Coverage

| Status | Screens |
|---|---|
| **Visually verified** (25 states) | Onboarding welcome, onboarding step 1; Reels (guest, signed-in), comments sheet, itinerary sheet, Tripi sheet, post options; Explore (4 scroll positions, destination input); Search (empty, query results); Đặt; Trip itinerary/booking (top); Hotel detail; Rooms & price (empty); Flights search form; Trip builder; Login (empty, error); Tôi (guest, signed-in); Saved (empty); My trips (empty); Notifications; Create (step 1); Settings; Cart (empty); Saved itineraries (empty); Moderation status; Author profile (not-found) |
| **Partially verified** | Onboarding step 2 (not reached); Create later steps; Trip itinerary below the fold (inner scroll not captured); Rooms (no room data) |
| **Not Visually Verified** | Checkout, VNPay return, Success, Booking detail `/booking/[id]`, Customize, Flight results, Saved itinerary detail, Account settings (redirected to Tôi), Populated Saved/My trips/Cart, Public profile with data, Google sign-in, Reels video playback (cover only), all native-only behaviour |

---

## 3. Overall product impression

**First 5–10 seconds (expert hypothesis, not measured):** the onboarding collage (Hạ Long + beach + Tripi with a map) reads as "travel, young, friendly" immediately and is the best first impression in the app. Returning users land on full-bleed Reels, which feels contemporary but generic (it could be any short-video app until you notice "Xem lộ trình"). Switching to Khám phá produces a tonal shift: warm canvas, white form card, OTA quick-links, rows of hotel cards — a booking app.

**The app feels like three products sharing a tab bar:** a dark video app (Reels + black tab bar), a warm booking app (Explore/Book/Hotel/Flights), and a white chat app (Tripi). Each is individually acceptable; the seams are where it loses polish.

---

## 4. Review A — Visual Design Director (summary)

Full critique in [VISUAL_DESIGN_CRITIQUE.md](VISUAL_DESIGN_CRITIQUE.md).

**Strengths**
- Coherent palette: warm-mist canvas `#FFF7F2`, coral reserved for primary actions, teal for selection/information, sun yellow for rating and Saved accents. Colour is no longer shouting.
- Strong display typography where v2 is applied: "Chuyến đi, theo gu của bạn." (g01), "Hôm nay vi vu đâu ta?" (g06), "Để dành một chuyến đi." (a04) — confident, warm, conversational.
- Tripi is used with the right emotional role in onboarding, Book hero, Saved/My-trips empty states and the Tripi entry on Reels.
- Itinerary cards on Explore (g06-3) are the most "Tripflix" component: 9:16-ish creator thumbnails, duration pill, destination + transport icons.

**Weaknesses**
- **Type scale collapse:** page header titles at 11–13 px ("Tìm kiếm", "Chuyến đi của tôi", "Cài đặt") sit above 26–34 px H1s, producing double titles with no middle step (a05, a08).
- **Night tab bar on Day screens:** a solid black bar under warm-mist Explore/Book/Tôi screens is the single most visible seam.
- **Three segmented-control styles:** pill chips (Search), rounded rectangles with warm fill (My trips), solid teal rectangle + bare text (Tôi "Video / Bài viết / Đang kiểm tra" — which also wraps to two lines).
- **Under-designed screens:** Moderation status (a13), Cart empty (a10), Rooms (d06), Notifications (a06).
- **Disabled primary CTAs** in pale coral/beige with white text (g02, g06, g07, g13, g14) look broken rather than "not yet".
- **Mascot overuse in one spot:** the trip-booking hero (d01) places a large Tripi over the destination photo — the destination should sell the trip.

**Visual Appeal (expert):** 6.8/10 averaged across verified screens; best 7.5 (onboarding, Reels, Saved), worst 4–5 (moderation status, cart empty, rooms).

---

## 5. Review B — UX & Product Designer (summary)

### 5.1 Information architecture
| Issue | Evidence | Severity |
|---|---|---|
| "Khám phá" is a hotel/flight search hub, not discovery; itineraries are section 4 of 5 | g06-0…3 | P1 |
| "Đặt" overlaps Khám phá (both start trip/booking) and hosts the itinerary booking screen; tapping an Explore itinerary card switches the active tab to Đặt | g07, d01 (`/book` URL, Đặt highlighted) | P1 |
| Unread-notification badge "9+" sits on **Khám phá**, which contains no notifications; the bell lives in screen headers | a02, a03 tab bar | P1 |
| Search results push hotel booking to "Mở Web" (website) instead of in-app results | d05 | P1 |
| "Tự lên lộ trình" (trip builder) exists on Book; "Nhờ Tripi lên lộ trình" exists on Book, Explore, Reels and Tripi — four entries for one job, no single home | g07, g06-2, a03, g11 | P2 |

### 5.2 Navigation
- Reels top tabs (Dành cho bạn / Đang hot / Đang theo dõi) are 32 px tall and 12 px text — below the 44/48 px target (measured).
- Context is lost: Explore → itinerary jumps tabs; Back from the itinerary returns via the Book stack, not to the Explore scroll position (not verified natively — flagged for device test).
- Settings is reachable only via the gear on Tôi (signed-in); Notifications via a bell that appears on some headers (Explore, Search, My trips) but not others (Tôi, Book).

### 5.3 Interaction & feedback
- Good: bottom sheets for comments, itinerary, Tripi and post options keep Reels in context; sticky price + CTA on hotel detail and trip booking; clear inline login error (a01).
- Weak: disabled CTAs give no reason (onboarding says nothing until a choice is made; Explore "Tìm chỗ ở" is disabled with no hint that a destination is needed — the placeholder carries the hint).
- Missing states: Rooms shows nothing below the date strip; author profile shows a not-found message while the header still says "Đang tải…"; error banners use a shield-check icon (reads as "verified/secure").

### 5.4 Cognitive load
- Search shows two rows of identical-looking chips (content type and sort) plus a hotel carousel plus an "Đã hiểu" interpretation chip plus a web promo — five layers before results.
- Notifications list four nearly identical cards ("Kiểm duyệt viên đã trả lời bình luận" + same quote) with no grouping; title repeats the body.
- Explore stacks three horizontally scrolling hotel rows (Ưu đãi hôm nay, Cuối tuần này, Được đánh giá cao) that look identical.

### 5.5 Mobile ergonomics
- Bottom tab bar and sticky CTAs are in the thumb zone — good. Primary CTAs are 52 px tall, full width.
- Top-left back and top-right actions are standard but small-titled; Reels search icon top-right is a stretch zone (acceptable, matches platform norms).
- Itinerary filter chips on Explore: 11 px text, ~26 px tall (g06-2).

### 5.6 Accessibility findings
| Finding | Evidence | WCAG | Severity |
|---|---|---|---|
| White label on coral `#FF5A3C` ≈ **3.1:1** on primary CTAs (`explorer.action.onPrimary = #FFFFFF`). **Product owner decision, kept.** It meets the AA threshold for large text (bold ≥ 18.7 px); keep coral surfaces with white text limited to bold button labels, not small text. | g01, a04, d02 | 1.4.3 large-text 3:1 | Accepted (owner decision) |
| Disabled CTAs: white on pale coral ≈ 1.6–1.9:1 — text unreadable; fine only if the control also exposes `disabled` to AT | g02, g06, g07 | 1.4.3 exempt for disabled, but legibility poor | P2 |
| Text below 12 px: tab labels 10 px, Explore chips 11 px, header titles 11 px (My trips), counts 12 px on video | measure pass | 1.4.4 risk with scaling | P1 |
| Targets < 44 px: Reels top tabs 32 px, "Xem lộ trình" pill 30 px, author row 26 px | measure pass | 2.5.8 (24 px min AA met; 44 px HIG/48 dp MD not) | P2 |
| Error messages use success/trust iconography (shield-check) — meaning carried by icon contradicts text | g12, a10, i06 | 1.3.1/usability | P2 |
| Reduce Motion referenced in 34 places; Dynamic Type limits (`maxFontSizeMultiplier`) in only 3 places — large text not verified | code scan | 1.4.4 | Not verified |
| 359 `accessibilityRole/Label` usages; screen-reader output not verified on device | code scan | — | Not verified |

---

## 6. Gen Z appeal assessment

Labels: **[O]** observed in UI · **[J]** expert judgment · **[H]** hypothesis requiring user testing.

| Dimension | Assessment |
|---|---|
| Visual attraction | **[O]** Onboarding, Reels and Saved look current. **[J]** Explore/Book/Settings look like a tidy OTA, not a youth brand. **[H]** Gen Z users will rate Explore below Reels on "feels made for me". |
| Discovery | **[O]** Reels → "Xem lộ trình" → day-by-day sheet with "Đặt lộ trình này" is the strongest discovery loop in the app. **[J]** Discovery outside Reels is form-first ("Bạn muốn ở đâu?") — it expects users to already know where to go, which contradicts the "Thấy là thích" promise. |
| Content consumption | **[O]** Full-bleed 9:16 media, right-hand rail, caption + "Xem thêm", itinerary pill. **[J]** Standard and competent; the itinerary pill is the only Tripflix-specific element and is visually the weakest object on screen (white pill, 30 px). |
| Social expression | **[O]** Like/comment/save/share present; comments sheet works. **[O]** Comment authors appear as `018d9f00`, reel author as "Tác giả" (seed data lacks names, but the fallback exposes ids). **[J]** Social proof without faces/names feels empty. |
| Emotional connection | **[O]** Tripi's tone ("Chuyến đi tiếp theo, mình cùng lên nhé?", "Gặp chuyến hay, lưu lại nhé.") is warm and natural. **[J]** Emotion drops sharply in commerce screens, which are where trust and excitement should combine. |
| Personality | **[J]** Playful without being childish in copy. Visual personality is carried almost entirely by the mascot; components themselves are neutral. Slogan reused as the user's profile bio (a02) feels like filler. |
| Retention hooks (existing only) | **[O]** Saved, Saved itineraries, My trips, notifications, following tab. **[O]** "Thư mục — Sắp có" is a dead chip in Saved. **[H]** Without saved-content previews or trip-planning progress, the return reason is mainly the feed. |

**Verdict (expert, unvalidated):** Reels and onboarding would likely pass a Gen Z first-impression test; Explore, Book and account screens likely would not distinguish Tripflix from Traveloka/Booking-style apps.

---

## 7. Screen-by-screen evaluation and scores

Scores are expert ratings, **not** user-test results. Columns: VA visual appeal · VH visual hierarchy · BC brand consistency · GZ Gen Z appeal · NC navigation clarity · IU interaction usability · CP content presentation · OX overall experience.

| # | Screen (route) | Evidence | VA | VH | BC | GZ | NC | IU | CP | OX |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Onboarding welcome (`/onboarding`) | g01 | 7.5 | 8 | 8.5 | 7.5 | 8 | 7.5 | 7 | **7.5** |
| 2 | Onboarding step 1 | g02 | 7 | 7 | 7.5 | 7 | 7.5 | 6.5 | 6.5 | **7** |
| 3 | Reels (`/`) | r01, a03 | 7.5 | 7 | 6.5 | 7.5 | 6.5 | 7 | 7 | **7** |
| 4 | Reels → itinerary sheet | i02 | 7 | 6.5 | 7 | 6.5 | 7.5 | 7 | 7.5 | **7** |
| 5 | Reels → comments sheet | i01 | 6.5 | 7 | 6 | 6 | 7.5 | 7 | 5 | **6.5** |
| 6 | Tripi assistant (`/assistant`, sheet) | g11, i03 | 7 | 7.5 | 7.5 | 7 | 7.5 | 7 | 7 | **7** |
| 7 | Khám phá (`/explore`) | g06-0…4 | 6* | 6.5 | 7 | 5.5 | 5.5 | 6.5 | 6 | **6** |
| 8 | Search (`/search`) | g09, d05 | 5.5 | 5 | 6 | 5.5 | 5 | 6 | 5.5 | **5.5** |
| 9 | Đặt (`/book`) | g07 | 6.5 | 7 | 7.5 | 6.5 | 5.5 | 6 | 5.5 | **6** |
| 10 | Trip itinerary booking (`/book?…`, top only) | d01 | 6.5 | 7 | 6 | 6.5 | 5.5 | 7 | 7.5 | **6.5** |
| 11 | Hotel detail (`/hotel/[id]`) | d02 | 6.5* | 7.5 | 7 | 6 | 7.5 | 7.5 | 5.5 | **6.5** |
| 12 | Rooms & price (`/hotel-rooms`) | d06 | 4 | 4 | 5 | 4 | 6 | 4 | 3 | **4** † |
| 13 | Flights search (`/flights`) | g13 | 7 | 7 | 7.5 | 6.5 | 7.5 | 7 | 7 | **7** |
| 14 | Trip builder (`/trip-builder`) | g14 | 6 | 6 | 6.5 | 5.5 | 6.5 | 6 | 6 | **6** |
| 15 | Login (`/login`) | g10, a01 | 7 | 7.5 | 7 | 6 | 7.5 | 7 | 7 | **7** |
| 16 | Tôi — guest | a00 | 6.5 | 6.5 | 7.5 | 6 | 7 | 7 | 6 | **6.5** |
| 17 | Tôi — signed in | a02 | 6.5 | 6.5 | 6.5 | 6 | 6.5 | 6.5 | 6 | **6.5** |
| 18 | Saved — empty (`/saved`) | a04 | 7.5 | 8 | 8 | 7 | 7 | 7 | 6.5 | **7** |
| 19 | My trips — empty (`/my-trips`) | a05 | 6.5 | 6 | 7 | 6 | 7 | 6.5 | 6.5 | **6.5** |
| 20 | Notifications | a06 | 5.5 | 5.5 | 6 | 5 | 7 | 6 | 5 | **5.5** |
| 21 | Create — step 1 (`/create`) | a07 | 6.5 | 7.5 | 6.5 | 6 | 7.5 | 7 | 7 | **6.5** |
| 22 | Settings | a08 | 6 | 6 | 6 | 5 | 7.5 | 7.5 | 6.5 | **6** |
| 23 | Cart — empty | a10 | 4.5 | 5 | 5 | 4 | 7 | 6 | 4.5 | **5** |
| 24 | Saved itineraries — empty | a11 | 6.5 | 6.5 | 7.5 | 6 | 5.5 | 5 | 6 | **6** |
| 25 | Moderation status | a13 | 4.5 | 4.5 | 5 | 4 | 7 | 6.5 | 5 | **5** |
| 26 | Author profile — not found | i06 | 4 | 4 | 5 | 3 | 5 | 4 | 3 | **4** † |

\* Hotel photos not verified (CDN 403 in this environment); VA reflects the fallback state. † Scores rate the observed empty/not-found state only.
No app-wide average is given: checkout, booking detail and success — the screens that decide purchase trust — are not verified.

### 7.1 Per-screen notes (identity, visual, UX, Gen Z, recommendations)

Priority per §9 of the brief. Effort: S < 1 day, M 1–3 days, L > 3 days.

**1. Onboarding welcome — `/onboarding` — verified (g01)**
- Visual: best composition in the app; collage + Tripi + bold two-line headline; slogan in teal. Eye goes to the photos, then the headline, then the CTA — correct.
- Awkward: the yellow "Chuyến tiếp theo?" sticker carries an external-link icon (↗) — it reads as a link that goes nowhere. Slogan sits between headline and body in teal at body size; it competes with the subhead rather than signing off the brand.
- UX: clear two choices; "Hai câu hỏi ngắn. Không cần tài khoản." sets expectations well. "Đăng nhập" top-right is correct for returning users.
- Recommendations: (P3, S) remove the ↗ icon or make the sticker decorative; (P3, S) move the slogan under the logo or make it the sticker text.

**2. Onboarding step 1 — verified (g02)**
- Visual: photo cards are attractive; "Ăn uống" uses a line icon on a peach tile instead of a photo — the grid breaks rhythm at the exact moment users are judging polish. Selection circles are grey on photos (low affordance). Card subtitles truncate ("Quán ngon, cà phê view đẹp").
- UX: disabled "Chọn nhịp chuyến đi" CTA in pale coral with white text looks broken. "Không cần chọn thật chuẩn. Bạn có thể đổi sau." is excellent reassurance.
- Recommendations: (P2, S) use a photo for every interest; (P2, S) selected state = coral 3 px ring + filled check, unselected = white circle with ink outline; (P2, S) disabled CTA = ink 12 % fill, ink 45 % text, plus helper "Chọn ít nhất 1 điều".

**3. Reels — `/` — verified, cover image only (r01, a03)**
- Visual: full-bleed media, clean right rail, Tripi avatar as a distinctive floating entry. Caption text over bright footage has a scrim; legible in captures.
- Awkward: black tab bar plus coral active state; top tabs 12 px/32 px; "Xem lộ trình" is a small white pill that looks like a tag, not the product's main action.
- UX: the notification badge on Khám phá; author fallback "Tác giả"; rail order (Tripi above like) makes Tripi the most prominent action, ahead of the itinerary.
- Gen Z: familiar grammar (good) but nothing in the frame says "you can book this trip" until the pill.
- Recommendations: (P1, M) turn "Xem lộ trình" into an itinerary chip card: "3N2Đ · Đà Lạt · từ 1,76tr" with a chevron, 44 px tall, anchored above the caption; (P1, S) move the unread badge to Tôi (or a bell in the Reels header); (P2, S) top tabs 14 px / 44 px hit area.

**4. Itinerary sheet from Reels — verified (i02)**
- Visual: clean coral timeline, hotel tile, transport rows, "Gợi ý từ tác giả" — readable and trustworthy.
- Hierarchy: footer has three actions in two rows (two outlined + one coral right-aligned below) — the coral CTA floats alone, the row looks unfinished. Sheet title "Ninh Bình" at 16 px is weaker than the day headers.
- Recommendations: (P2, S) footer = one row: secondary icon buttons (Tripi, Lưu) + flexible primary "Đặt lộ trình này · từ X đ"; (P3, S) title 20 px with duration chip inline.

**5. Comments sheet — verified (i01)**
- Content: author names render as id fragments; same avatar placeholder for all. With seed data this is expected, but the fallback must never expose ids.
- Recommendations: (P1, S) fallback display name "Người dùng Tripflix" + initials avatar; (P3, S) composer send button disabled state contrast.

**6. Tripi assistant — verified (g11, i03)**
- Visual: friendly intro card and three prompt cards with icons; pure-white surface differs from the warm canvas used everywhere else (deliberately reverted in `08c41946`). Send button is grey-on-grey even when the field is empty — fine — but icon "—" for minimise is ambiguous.
- Recommendations: (P2, S) either align the assistant to the warm canvas or make white the sheet surface everywhere; (P3, S) minimise icon → chevron-down.

**7. Khám phá — `/explore` — verified (fallback photos) (g06-0…4)**
- Visual: strong headline; white search card; quick-links row with "Sắp có" on two of four tiles (Limousine, Tour) — 50 % of the shortcut row advertises absence.
- Hierarchy: the hotel form dominates the first viewport; itineraries (the brand's core content) begin at roughly the 4th viewport.
- Content: three identical hotel carousels; itinerary filter chips 11 px.
- Recommendations: see Roadmap #1 — invert the screen: inspiration first (itinerary grid with destination chips, trending creators), search second (compact search bar that expands into the hotel/flight form); (P1, S) hide "Sắp có" tiles; (P2, M) merge the three hotel rows into one row with filter chips (Ưu đãi · Cuối tuần · Đánh giá cao).

**8. Search — `/search` — verified (g09, d05)**
- Visual: title 11 px; search field in warm tint; two rows of 44 px pills with the same style — type filter and sort look like one control.
- UX: hotel carousel before the type filters; "Đã hiểu: Đà Lạt" is useful but cryptic; **"TRIPFLIX WEB · Mở Web"** sends mobile users out of the app to book — this breaks the funnel and contradicts the hotel detail + rooms flow that exists in-app.
- Recommendations: (P1, S) replace "Mở Web" with in-app "Xem khách sạn tại Đà Lạt" linking to the existing explore/hotel results; (P2, S) sort becomes a single "Sắp xếp: Liên quan ▾" button; (P2, S) order = query → interpretation → type tabs → results.

**9. Đặt — `/book` — verified (g07)**
- Visual: Tripi hero card is charming; bottom half of the screen is empty; title "Đặt lộ trình" is left-aligned at 16 px gutter while cards use 20 px.
- UX: the tab promises "book" but offers "ask Tripi" and "build it yourself" — there is no list of anything bookable. Disabled "Hỏi Tripi" until text is typed.
- Recommendations: (P1, L) decide the tab's job (see Roadmap #1). If kept as "Chuyến đi": upcoming trips, saved itineraries and drafts on top, the two creation entries below.

**10. Trip itinerary booking — `/book?…` — partially verified (d01)**
- Visual: very clear price block (total, per person, service count) and per-service checkboxes with change actions — the most useful commerce UI in the app.
- Brand rule: hero is a large Tripi pasted over a Hạ Long photo. The brief says Tripi should stay out of price/booking contexts; it also hides the destination that motivates the purchase.
- Navigation: reached from Khám phá but the tab bar switches to Đặt.
- Recommendations: (P1, S) hero = destination photo or the creator's video cover, with a small creator attribution chip; (P1, M) open itineraries as a stack screen over the current tab (no tab switch); (P3, S) "Đổi điểm bay" chip under the flight is 11 px.

**11. Hotel detail — `/hotel/[id]` — verified, photos not verified (d02)**
- Visual: good hierarchy (name, stars, address, map link, rating badge, highlights, amenities), sticky price + "Chọn phòng".
- Trust: "Khoảng cách địa danh là dữ liệu mẫu, dùng để tham khảo giao diện." is visible to users. Gallery fallback shows "Chưa tải · 1/5" with arrows over an empty area.
- Recommendations: (P0 for launch, S) remove fixture content or hide the section when data is not real; (P2, S) photo fallback = destination illustration, no arrows/counter when nothing loaded.

**12. Rooms & price — `/hotel-rooms` — state verified (d06)**
- **Correction (2026-11-23):** the empty capture d06 used a wrong query parameter (`hotelId` instead of `id`). With a valid `id` the screen lists rooms normally. The real gaps were a missing hotel id (blank screen) and a hotel with no room types (no message); both now show a notice on the Step 1 branch. The score below reflects the original capture only.
- Dates and guests appear as unstyled text with a floating "Đổi"; below it nothing — no loading, empty or error message.
- Recommendations: (P1, S) explicit empty ("Khách sạn chưa mở phòng cho ngày này — thử ngày khác") and error states; (P2, S) date/guest summary in a card with an "Đổi" button.

**13. Flights search — `/flights` — verified (g13)**
- Visual: well-composed hero with Tripi, airport fields with swap control. "Ngày bay" field uses a larger label/value style than the two airport fields above and the passenger field below.
- Recommendations: (P3, S) unify field typography.

**14. Trip builder — `/trip-builder` — verified (g14)**
- Placeholder truncated ("Gõ tên thành phố, tỉnh hoặc điểm đến"), large dashed "Hoạt động" box with no explanation, coral "Giữ chỗ" disabled at 0 đ.
- Recommendations: (P2, S) shorter placeholder "Đà Lạt, Phú Quốc…"; (P2, M) collapsed "+ Thêm dịch vụ" menu instead of three dashed boxes.

**15. Login — verified (g10, a01)**
- Clean, honest form; inline error. Google sign-in hidden in this environment (env var unset) — not verified.
- Recommendations: (P3, S) remove "* Thông tin bắt buộc" (both fields obviously required).

**16–17. Tôi — guest and signed-in — verified (a00, a02)**
- Guest: good value proposition + login CTA + two shortcuts.
- Signed-in: slogan used as the user's bio; three 0-stats in a teal panel; "Video / Bài viết / Đang kiểm tra" segment wraps to two lines; header shows logo + user name at 13 px.
- Recommendations: (P2, S) bio placeholder "Thêm giới thiệu" link instead of slogan; (P2, S) segment labels "Video · Bài viết · Chờ duyệt"; (P3, S) hide zero stats until there is activity, or show "Đăng video đầu tiên" prompt.

**18–19, 24. Saved / My trips / Saved itineraries — empty states verified (a04, a05, a11)**
- Saved is the reference empty state (headline, Tripi, explanation, CTA). My trips repeats the same Tripi pose and CTA, adds a duplicate title ("Chuyến đi của tôi" + "Chuyến đi của bạn") and a decorative beach photo. Saved itineraries has no CTA at all. "Thư mục · Sắp có" is a dead chip.
- Recommendations: (P2, S) one `StateScreen` pattern with different Tripi poses per context; (P2, S) remove "Sắp có" chips everywhere.

**20. Notifications — verified (a06)**
- Every unread card is a peach block with a red dot; titles duplicate bodies; identical events are not grouped; heading "Trước đó" with nothing "Mới".
- Recommendations: (P2, M) group by post/thread ("Kiểm duyệt viên trả lời 3 bình luận của bạn"); unread = 4 px coral left bar on white, not full tint.

**21. Create — step 1 — verified (a07)**
- Clear purpose; content column uses ~28 px side padding vs 20 px elsewhere; pale tip cards are fine.
- Recommendations: (P3, S) align gutter; (P2, M) show a sample finished post (cover + itinerary chip) to motivate creation.

**22. Settings — verified (a08)**
- Teal and yellow card backgrounds encode nothing; double title.
- Recommendations: (P3, S) neutral white grouped list; single title.

**23. Cart — empty — verified (a10)**
- Shield icon + "Giỏ của bạn đang trống." + a full-width CTA; nothing else. Visually the weakest empty state.
- Recommendations: (P2, S) apply the Saved pattern; suggest saved itineraries.

**25. Moderation status — verified (a13)**
- Plain text lines, status embedded in prose ("Bình luận · Tạm ẩn để kiểm tra"), timestamps in `09:14:39 20/11/2026` format, raw content echo.
- Recommendations: (P2, M) status chip (colour + text), content preview card, relative time, appeal CTA only where eligible (already correct logically).

**26. Author profile — not found — verified (i06)**
- Header "Đang tải…" persists after a not-found result; message uses shield icon.
- Recommendations: (P1, S) header shows "Hồ sơ" on error; not-found state with back CTA.

---

## 8. User-flow evaluation

Only flows that exist in the code are evaluated.

| Flow | Entry | Steps observed | Friction | Recommended flow |
|---|---|---|---|---|
| **First open (guest)** | App launch → `/onboarding` | Welcome → interests (2 steps) → Reels; or "Khám phá trước" → Reels | Two "Khám phá trước" elements exist on the welcome screen (header + footer, Playwright strict-mode hit); disabled CTA without reason | Keep. Single skip affordance; enable CTA hint. |
| **Video → itinerary → book** | Reels pill "Xem lộ trình" | Sheet with days → "Đặt lộ trình này" | Pill is small; three footer actions; booking opens in the Đặt tab | Itinerary chip card on the reel → sheet → "Đặt" pushes a stack screen inside Reels; back returns to the same reel. |
| **Discover via Explore** | Khám phá tab | Search form → scroll 3 hotel rows → itinerary grid → tap card → (tab switches to Đặt) | Inspiration buried; tab switch loses context | Inspiration first; same in-tab push. |
| **Search** | Search icon (Reels/Explore) | Query → hotels carousel → filters → "Mở Web" → results | Leaves the app for hotel booking; two filter rows | In-app hotel results; one filter row + sort button. |
| **Hotel booking** | Explore card or search | Hotel detail → "Chọn phòng" → Rooms | Rooms empty without message (local data); fixture disclaimer | Not verifiable past Rooms (Checkout not verified). |
| **Ask Tripi** | Reels avatar, Book card, Explore card, `/assistant` | Sheet/screen with prompts | Four entries, consistent content (good) | Keep entries but give Tripi one persistent home (e.g. Reels rail + Book). |
| **Save** | Reels rail, options sheet, itinerary "Lưu lộ trình" | Save post → `/saved`; save itinerary → `/saved-itineraries` | Two separate "saved" places reached from different menus; "Thư mục sắp có" | One "Đã lưu" with tabs Video · Lộ trình. |
| **Profile** | Tôi tab | Stats, shortcuts, my content tabs, gear → Settings | Notifications badge elsewhere; slogan as bio | See §7. |

---

## 9. Stitch comparison

Sources: Stitch project `17566515177619492500` (10 designs, verified via MCP), current rendered build, brand brief.

| Area | Stitch (reference) | Current build | Adopt / adapt / improve |
|---|---|---|---|
| Reels | 9:16 rounded video card *inside* a light feed, inline **itinerary commerce card** on the video ("Lịch trình trọn gói · 3N2Đ · từ 1.850.000đ · Chi tiết"), trend chips | Full-bleed player, small "Xem lộ trình" pill | **Adopt the inline itinerary card** (it is the product's core idea). Keep full-bleed player (better for video; team decision D2). |
| Explore | Search card with destination, dates, guests **and budget chips** ("Hạt dẻ <500k / Chill 500k–1.2tr / Xịn sò >1.2tr"), deals with strike-through price, "Gen Z đang tìm kiếm" hashtags, trust row | Hotel/flight form, three hotel rows, itinerary grid low | **Adapt** budget chips (budget is a stated audience need; needs price-band filter in the API — Future/F). **Adapt** trending searches only if backed by real query data (Future). Trust row: adopt only claims that are true. |
| Bottom nav | Khám phá · Dịch vụ/Lịch trình · **Tripi raised centre** · Chuyến đi · Tài khoản | Reels · Khám phá · Tạo · Đặt · Tôi | **Improve:** neither is right as-is. See Roadmap #1 for a hybrid that keeps Reels and Create. |
| Itinerary detail | Hero photo, rating, style/transport facts, Tripi tip, collapsible days with photos per stop, **inclusions/exclusions**, reviews, sticky price + CTA | Tripi hero, date/guest chips, service checkboxes with prices, sticky total | **Adopt** destination hero, per-stop photos, "Bao gồm / Không bao gồm" (UI concept; content needs data — Future). Keep current per-service checkboxes (functional, clearer than Stitch). |
| Saved | Collections grid with covers | Single list + "Thư mục sắp có" | Collections = **Future** (needs backend). Until then remove the chip. |
| Creator profile | TikTok-style grid, follower stats, verified-trip badges | Not verified with data | Adopt grid + "Đã đi thật" badge where the API flag exists. |
| Visual language | White cards, uppercase eyebrows, many badges/discount labels, white-on-coral CTAs, dense chips | Warmer, calmer, fewer badges | **Do not copy:** Stitch is denser than a Gen Z audience needs (Hick's Law), its eyebrows are banned by the project's own design system, several Stitch exports render broken logo `alt` text, and many numbers (e.g. "Hoàn hủy linh hoạt", "-25%") are illustrative and must not ship as claims. |

**Which is visually stronger?** Stitch, for Explore and Itinerary: more photography, more reasons to tap, clearer value per card. The build, for calm and legibility. The target is Stitch's *content richness* with the build's *restraint*.

Feature classification used: **Existing** (works now), **UI concept** (needs only front-end), **Future** (needs backend/business logic). Budget chips, collections, inclusions/exclusions, trending searches, deals with original price = Future. Inline itinerary card on reels, destination hero, merged Saved tabs = UI concept on existing data.

---

## 10. Evidence index

`VSF/outputs/mobile-ux-audit-2026-11-22/screens/`:
- Guest: `g01` welcome, `g02` interests, `g06-0…4` explore, `g07` book, `g09` search, `g10` login, `g11` assistant, `g12` hotel without id, `g13` flights, `g14` trip builder, `r01` reels
- Detail: `d01` trip booking, `d02-0/1` hotel detail, `d04` explore destination typed, `d05` search results, `d06` rooms
- Signed-in: `a00` me guest (clean), `a01` login error, `a02` me, `a03` reels, `a04` saved, `a05` my trips, `a06` notifications, `a07` create, `a08` settings, `a10` cart, `a11` saved itineraries, `a13` moderation status
- Interactions: `i01` comments, `i02` itinerary sheet, `i03` Tripi sheet, `i04` options, `i05` share, `i06` author profile
- Each `*.txt` holds the URL and visible text of that capture.
- Code facts: `explorer.type` used in 2 files, `compactType` in 18, legacy `colors.*` in 25 (`apps/mobile/src`, grep on 2026-11-22); `explorer.action.onPrimary = '#FFFFFF'` (`packages/tokens/src/index.ts`).

---

## 11. Limitations and unverified assumptions

- Rendered through react-native-web in desktop Chrome at phone size, not on iOS/Android. Gestures, safe areas, keyboard, haptics, video playback, performance and assistive technology are not verified.
- Audited the unmerged SCRUM-189 branch; production users today see `develop`, which was not re-rendered.
- Hotel photos missing in this environment (CDN 403), seed authors without names, no rooms in local data: content-dependent judgments on Explore, Hotel, Rooms and Comments are provisional.
- Checkout, payment, booking detail and success screens were not reached; purchase-trust conclusions do not cover them.
- All Gen Z statements are expert hypotheses. No user research was conducted or is implied. See [GEN_Z_VALIDATION_PLAN.md](GEN_Z_VALIDATION_PLAN.md).
- Contrast ratios are calculated from token hex values; on-video text contrast varies by frame and was judged visually.
