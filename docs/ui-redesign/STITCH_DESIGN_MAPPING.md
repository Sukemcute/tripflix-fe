# Tripflix redesign — Stitch ↔ functionality map

**Status:** Mobile implementation in progress (2026-11-20). Mobile-only scope approved; web remains out of scope.
**Supersedes:** discovery v1 of the same date (corrections listed in §7).

## 1. Sources and priority

| Priority | Source          | Location                                                                                                                                                               | Use for                                                       |
| -------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1        | Brand DNA       | `tripflix-ui-design/STITCH-MOBILE-BRIEF.md` (Brand DNA, Tripi rules), PRD `docs/05-prd-tripflix-v3.md` (outer VSF workspace)                                           | Identity, tone, mascot boundaries                             |
| 1        | Official assets | `apps/mobile/assets/brand/` (`tripflix-logo.svg`, `tripi-{welcome,curious,explore,celebrate}.png`, `tripi-library/`, Be Vietnam Pro 400–800), `apps/web/public/brand/` | Logo, mascot, fonts — reuse, never redraw                     |
| 2        | Google Stitch   | [Tripflix Vietnam Travel App](https://stitch.google.com/projects/17566515177619492500) — 10 mobile screens + brief                                                     | Visual direction, layout, components                          |
| 3        | Code            | `apps/mobile/src/app` (38 routes), `apps/web/src/app` (26 routes), `@tripflix/api-client`, `@tripflix/app-core`                                                        | What actually works                                           |
| 4        | Skills          | frontend-design (Anthropic), ui-ux-pro-max, Impeccable                                                                                                                 | Critique and refinement rules — see `NEW_DESIGN_SYSTEM.md` §1 |

**Brand-source warning.** `docs/brand/08-linh-vat-chinh-thuc-tripflix-rive.md` describes a penguin mascot "Flixi". It is **not** the current mascot. The official mascot is **Tripi**, the 3D fox (orange fur, cream muzzle, rosy cheeks, teal goggles, yellow scarf, teal backpack). Do not use doc 08 or its assets as a reference.

**Slogan:** "Thấy là thích, nhích là đi". Brand promise (brief): "Chạm cảm hứng, trọn hành trình". Do not mix them up.

**Stitch references (read through the Stitch MCP on 2026-11-20).** All design screens are exported as PNG (`<screen-id prefix>-<name>.png`) and kept outside the repo, because RULES §7 forbids committing images; ids are listed below. The project's own design-system note ("Original Explorer") was also read: Be Vietnam Pro, coral primary, teal discovery, sunshine accent, warm-mist canvas, white cards with 16–24 px radius, pill chips and pill CTAs.

**What Stitch actually shows (verified), and where the build deliberately differs:**

| Stitch                                                                                        | Build decision                                                                              | Why                                                                         |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Reels shown as a 9:16 rounded video card inside a light feed                                  | Preserve the existing full-screen Reels UI as requested                                     | Existing swipe player is operational and the user asked to keep this screen |
| Bottom nav: Khám phá · Dịch vụ/Lịch trình · **Tripi (raised centre)** · Chuyến đi · Tài khoản | Keep the original Reels · Khám phá · Tạo · Đặt · Tôi menu, visual style and badge placement | User explicitly asked to retain the old menu                                |
| Primary CTA: coral pill with white label                                                      | Coral pill with **ink** label (D3)                                                          | White on coral is 3.1:1 and fails WCAG AA for 16 px text                    |
| Header: logo, search, bell (red dot), avatar                                                  | Logo + bell with unread count                                                               | Avatar lives in the Tôi tab                                                 |
| Eyebrow labels ("HÀNH TRÌNH CHUẨN GU", "TRIPI MÁCH NHỎ"), uppercase micro labels              | Not used                                                                                    | Banned pattern in the design system (§11)                                   |

## 2. Functional reality (verified in code, 2026-11-20)

- Mobile screens are mostly **live**. 73 feature files import `@tripflix/api-client` (core-api, discovery, flights, auth, ai-service). Live modules include auth (email + Google), feed and comments with moderation, notifications with unread count, VNPay checkout and return, booking detail, order cancel, and the Tripi assistant transport.
- `apps/mobile/README.md` still says auth/search/Tripi/payment use sample data. That note is **out of date**. Each control must still be checked against the live contract before it is wired (Phase 1).
- Known non-live parts: Reels show cover images, not real playback; `hotel-detail-sections.tsx` contains fixture content. The create flow calls `uploadVideo`; verify deployed BE configuration while testing it.
- **Current tab bar** (`(tabs)/_layout.tsx`): Reels · Khám phá · Tạo (press → `/create`, or login with return) · Đặt · Tôi. `inbox` is hidden. The unread-notification badge currently sits on the **Khám phá** tab. Keep it where it was; the user asked to preserve the original menu.

## 3. Screen mapping (Stitch → routes)

Legend: **I** implement (live API exists) · **A** adapt existing flow to Stitch pattern · **U** UI-only preview (no backend, shown as labelled preview) · **F** future feature (needs backend/business logic; concept kept, documented, not built).

### 3.1 Khám phá Video & Cảm hứng — `fec64dabd2f344738e91000475754aa7`

Routes: mobile `(tabs)/index` (ReelsScreen + AssistantDialog), `user-reels`, `trip-plans/[postId]`; web `/`, `/inspiration`.

| Element                                         | Class | Notes                                                                                                          |
| ----------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------- |
| Full-bleed vertical media, creator row, caption | A     | Night media mode. Cover image until playback lands; never show a fake play/progress state.                     |
| Like, comment, save, share rail                 | I     | Live feed and comments. Counts are shown only from the API.                                                    |
| "Đã đi thật" badge                              | I     | Shown only when the post carries the verified-trip flag.                                                       |
| "Đặt theo lộ trình" itinerary module            | I     | Opens the trip-plan detail, then the booking flow.                                                             |
| Trend/topic chips                               | A     | Only if the discovery API returns topics. Otherwise use static destination filters with no "trending" wording. |
| Tripi prompt bubble                             | A     | Opens the assistant. No proactive advice text that the API did not produce.                                    |
| "Dành cho bạn" personalisation                  | U     | Labelled "Gợi ý chung" until a ranking signal exists.                                                          |

### 3.2 Khám phá & Tìm kiếm Dịch vụ — `eecf855df31d46af951eddfda4c84752`

Routes: `(tabs)/explore`, `search`, `hotel`, `flights`; web `/search`, `/flights`.

| Element                                                   | Class | Notes                                                                          |
| --------------------------------------------------------- | ----- | ------------------------------------------------------------------------------ |
| Destination / date / guests / budget composer             | A     | Bound to the search API. Dates and guests stay pinned on results.              |
| Category switcher (Khách sạn, Vé bay, Lộ trình, Xe, Tour) | A + U | Hotel, flight and itinerary are live. Car and tour are disabled with "Sắp có". |
| Offer and deal cards                                      | U     | No deal API. Show a labelled preview slot with no prices, or omit.             |
| Gen Z search trends                                       | U     | Same rule as topic chips.                                                      |
| Natural-language search ("đi biển 2N1Đ dưới 3 triệu")     | A     | Route to the Tripi assistant, which does the intent parsing.                   |

### 3.3 Kết quả tìm kiếm & Bộ lọc Khách sạn — `bd35e54c36df4becaf6e24f499feb9ba`

Routes: `hotel`, `hotel/[id]`, `hotel-rooms`, `tripi-stay`; web `/hotels/[id]`.

| Element                                          | Class | Notes                                                                                |
| ------------------------------------------------ | ----- | ------------------------------------------------------------------------------------ |
| Sticky summary (destination, dates, guests)      | A     |                                                                                      |
| Horizontal filter chips, count, reset            | A     | Only filters the API supports.                                                       |
| Image-led result cards (price per night, rating) | I     | Price unit is always shown. Rating only from the API.                                |
| Map view toggle                                  | F     | Needs a map SDK, key and coordinates. Show a disabled toggle with "Bản đồ — sắp có". |
| Tripi pick inline card                           | A     | Only from an assistant response (`tripi-stay`).                                      |
| Sticky "Chọn phòng" bar                          | I     |                                                                                      |

### 3.4 Chi tiết Lịch trình & Đặt chỗ — `dd3505aaf2584fdabe1658d484dcf854`

Routes: `itinerary`, `trip/[slug]`, `trip-plans/[postId]`, `customize`, `trip-builder`, `(tabs)/book`, `cart`, `checkout`, `payments/vnpay/return`, `success`, `booking/[id]`; web `/trip-plans/[postId]`, `/trips/[slug]`, `/cart`, `/checkout/[id]`, `/payments/vnpay/return`, `/bookings`.

| Element                                            | Class | Notes                                                                                 |
| -------------------------------------------------- | ----- | ------------------------------------------------------------------------------------- |
| Hero media with proof cues (creator, "đã đi thật") | A     |                                                                                       |
| Day-by-day vertical timeline                       | A     | Day numbers are a real sequence, so numbering is allowed.                             |
| Itemised cost breakdown and total                  | I     | Totals come from `app-core` / the API only.                                           |
| Add-ons, customise, swap hotel                     | I     | Existing `trip-addons-section`, `customize`.                                          |
| Reviews block                                      | I/U   | Live if the reviews endpoint returns data. Otherwise hide; never show sample reviews. |
| Persistent "Đặt theo lộ trình" bar                 | I     | Keeps auth `returnTo` and booking state.                                              |
| Checkout steps, VNPay, failed/expired/cancel       | I     | Not in Stitch. Redesigned with the same system.                                       |

### 3.5 Onboarding — `2b90abb0fd6f4050a57c3b792b4a6e50` (full), `4baa6522c48c4be2b802d6ed242fb099` (compact)

Routes: `onboarding` (guest and `source=account`); web `/onboarding`.
**A.** Tripi-led illustrated choice cards, progress, "Để sau". Only fields in the profile contract are collected. Keep the existing redirect rule (offered once, never interrupts an active tab). Primary slogan placement is here.

### 3.6 Trợ lý Tripi AI — `1ec4b4a0633341df8fb69febc67ecdb3`

Routes: `assistant`, global `AssistantDialog`.
**A.** Prompt chips, chat, recommendation cards, "Xem lộ trình" CTA. Cards render only API results, with source and price-date. If the service fails: Tripi "curious" pose with a retry message. Never show a fake conversation as live.

### 3.7 Bộ sưu tập đã lưu — `d5d68bc51f1c4fe2a90c91c427a2e4ac`

Routes: `saved`, `saved-itineraries`, `saved-itinerary/[id]`, `saved-itinerary-reels`.

| Element                              | Class                                                      |
| ------------------------------------ | ---------------------------------------------------------- |
| Saved reel grid, saved itineraries   | I                                                          |
| User-made folders / boards           | F (needs collection CRUD) — show the grouping by type only |
| "Tripi mix lộ trình từ video đã lưu" | F — preview card, CTA disabled                             |

### 3.8 Trang cá nhân & Video của tôi — `e871a7f447454d88bcf6c0b26bb03e59`

Routes: `user/[id]`, `user-reels`, `(tabs)/me` (profile hub); web `/u/[id]`.
**A.** Creator header, tabs (Video / Lộ trình / Đã lưu), media grid. Drafts are private and visually separated. Series and playlists are **F**. Follower and view counts come only from the API.

### 3.9 Trang cá nhân & Tài khoản — `93d39154ed7f46499fc2da9017eeea77`

Routes: `(tabs)/me`, `my-trips`, `account-settings`, `settings`, `notifications`, `moderation-status`; web `/account`, `/account/moderation`, `/bookings`.
**A.** Upcoming / completed / cancelled trips first, then saved items, then utilities. The membership tier, points and rewards panel is **F**: keep the slot as a muted "Tripflix Club — sắp ra mắt" card with no numbers.

### 3.10 Tạo bài đăng — `fc24e6b760ea4b9eacdfbbf0b1d54a75`

Routes: `create`, `(tabs)/compose` (redirect).
**A.** Day studio composition: media preview, caption, tags, place, link to an itinerary and cost. The existing upload flow uses `uploadVideo`; verify against local BE. AI caption suggestion is **F** and appears only as a disabled, clearly labelled preview. Moderation status is linked after posting.

## 4. Routes with no Stitch screen (must not be dropped)

| Area           | Mobile                                             | Web                                                                                                       | Design approach                                    |
| -------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Auth           | `login`                                            | `(auth)/login`, `register`, `forgot-password`, `dat-lai-mat-khau`, `xac-thuc-email`, `auth/google/mobile` | Day mode, logo and slogan, Tripi "welcome"         |
| Flights        | `flights`                                          | `/flights`, `/flights/[id]`                                                                               | Results pattern from §3.3                          |
| Booking states | `success`, `booking/[id]`, `payments/vnpay/return` | same                                                                                                      | Status page pattern. No mascot in payment failure. |
| Moderation     | `moderation-status`                                | `/account/moderation`                                                                                     | Status list pattern                                |
| Policy         | —                                                  | `chinh-sach-bao-mat`, `dieu-khoan-su-dung`                                                                | Long-form reading layout                           |
| Misc           | `notifications`, hidden `inbox`                    | `coming-soon`, `healthz`, sitemap/robots                                                                  | Unchanged logic                                    |

## 5. Navigation decision

Navigation is frozen to the original tab bar per user request: **Reels · Khám phá · Tạo · Đặt · Tôi**. Preserve its prior visuals and badge location.

- Keep the current "Đặt" tab label.
- Keep the unread badge in its original location.
- Tạo keeps its current behaviour (push `/create`, or login with `returnTo`).

## 6. Dependency register (future and UI-only)

| Concept                      | Class | Needed before build                                 |
| ---------------------------- | ----- | --------------------------------------------------- |
| Real video playback in Reels | F     | Media pipeline (transcode, HLS URL in feed DTO)     |
| Post media upload            | F     | Upload endpoint, size limits, moderation hook       |
| Map of stays                 | F     | Map provider, key, hotel coordinates                |
| Personalised feed            | U→I   | Ranking signal from onboarding/profile              |
| Deals and offers             | U     | Promotion API                                       |
| Saved folders                | F     | Collection CRUD                                     |
| Tripi mix from saved         | F     | Itinerary generation, user review step, persistence |
| AI caption                   | F     | ai-service endpoint                                 |
| Series / playlists           | F     | Playlist CRUD and ordering                          |
| Membership and rewards       | F     | Ledger, tier rules, redemption catalog              |
| Car / tour categories        | F     | Inventory partner                                   |

**Rule for every U/F element:** visible but inert (`accessibilityState.disabled`), labelled "Sắp có" or "Bản xem trước", with no invented numbers, names or prices.

## 7. Corrections from discovery v1

1. The mascot reference pointed at doc 08 (penguin "Flixi"). It now points at Tripi fox assets.
2. The real tabs are Reels/Khám phá/Tạo/Đặt/Tôi. The proposed relabel and badge move were declined; keep the original menu.
3. v1 cited the README "sample data" note as current. Mobile is largely live; the note is stale.
4. Web routes were under-listed (missing auth Vietnamese routes, `/inspiration`, `/coming-soon`, `/u/[id]`, `/account/moderation`, `/flights/[id]`).
5. v1 had no per-element I/A/U/F breakdown. Added.
6. The Stitch reference was not reproducible offline. A PNG export step is added.
