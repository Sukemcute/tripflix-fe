# Tripflix Mobile — UX Improvement Roadmap

**Date:** 2026-11-22 · Source: [TRIPFLIX_MOBILE_UX_AUDIT.md](TRIPFLIX_MOBILE_UX_AUDIT.md), [VISUAL_DESIGN_CRITIQUE.md](VISUAL_DESIGN_CRITIQUE.md)
**Status:** proposal only. Nothing here is implemented; implementation waits for approval.

Effort: **S** < 1 day · **M** 1–3 days · **L** > 3 days (one mobile developer). Confidence = how sure we are the change improves the experience before user testing.

---

## 1. Top 10 highest-impact improvements (ranked)

| # | Improvement | Priority | Screens | Impact (user / visual / UX) | Effort | Confidence |
|---|---|---|---|---|---|---|
| 1 | **Restructure navigation around the video → trip promise** | P1 | Tabs, Explore, Book, Reels | High / Med / High | L | Medium — validate |
| 2 | **Remove trust breakers in commerce screens** | P0 before launch | Hotel detail, Search, Comments, Profile | High / Low / High | S | High |
| 3 | **Make the Reels itinerary entry the hero action** | P1 | Reels, itinerary sheet | High / High / High | M | Medium-high |
| 4 | **Keep context: open itineraries inside the current tab** | P1 | Explore → itinerary, Reels → booking | High / Low / High | M | High |
| 5 | **Finish the design-system migration (one type scale, one tab bar)** | P1 | All | Med / High / Med | M–L | High |
| 6 | **Inspiration-first Explore** | P1 | Explore | High / High / Med | M | Medium — validate |
| 7 | **Complete every state (empty, error, not-found, loading)** | P1 | Rooms, author profile, cart, saved itineraries, search loading | Med / Med / High | M | High |
| 8 | **Simplify Search** | P2 | Search | Med / Med / Med | S–M | High |
| 9 | **One "Đã lưu" home with Video · Lộ trình tabs** | P2 | Saved, Saved itineraries, Tôi | Med / Low / Med | M | Medium |
| 10 | **Accessibility baseline (text ≥ 12 px, 44 px targets, correct icons, Dynamic Type)** | P1 | All | Med / Low / High | M | High |

### 1. Restructure navigation around the promise
- **Problem.** Tabs read as "videos + OTA". Khám phá = hotel/flight search; Đặt = ask Tripi / build manually; itineraries live between them; notifications badge sits on Khám phá.
- **Recommendation (hypothesis to test, two options):**
  - **A — minimal change:** Reels · Khám phá · (+) · **Chuyến đi** · Tôi. "Chuyến đi" = upcoming trips, saved itineraries, drafts, then "Nhờ Tripi" / "Tự lên lộ trình". Hotel/flight search moves into Khám phá's search bar. Badge moves to Tôi (or a bell on the Reels header).
  - **B — Stitch-inspired:** Reels · Khám phá · **Tripi (centre)** · Chuyến đi · Tôi, with Create as a + on Reels/Tôi. Stronger AI positioning, weaker creator positioning.
- **Expected benefit:** each tab answers one question (watch / find / my trips / me); fewer duplicate entries.
- **Dependencies:** none on BE for A; B changes the creation entry (product decision). Team decision D2 ("keep original menu") must be revisited explicitly.
- **Validation:** tree test + navigation comprehension test (plan §3.4) before building.

### 2. Remove trust breakers (quick wins, ship first)
- Hide the fixture "Khám phá xung quanh" distances and the "dữ liệu mẫu" note on hotel detail until real data exists (`hotel-detail-sections.tsx`).
- Replace "TRIPFLIX WEB · Mở Web" in search with an in-app link to hotel results.
- Display-name fallback "Người dùng Tripflix" + initials avatar instead of id fragments; "Tác giả" → creator handle or the same fallback.
- Remove "Sắp có" tiles/chips (Limousine, Tour, Thư mục).
- Error banners: alert icon + error colour, never shield-check.
- **Benefit:** removes the moments where a user would conclude "this isn't real". **Effort:** S. **Validation:** none needed beyond QA.

### 3. Reels itinerary entry as the hero action
- Replace the 30 px "Xem lộ trình" pill with an itinerary chip card above the caption: thumbnail or route icon · "Đà Lạt · 3N2Đ" · "từ 1,76tr/người" (only when the post has a priced plan) · chevron. Min height 52 px.
- Itinerary sheet footer: [Tripi icon] [Lưu icon] [Đặt lộ trình này — primary, flexible].
- **Dependency:** a from-price on the post's trip plan (check `trip-plans` contract; if absent, show route + days only — UI concept, no fake price).
- **Validation:** A/B preference + click-test on two reel mock-ups (plan §3.3).

### 4. Keep context
- Itinerary detail pushes as a stack screen within the originating tab (Reels or Khám phá); the tab bar highlight never changes on a tap inside content. Back returns to the same reel/scroll position.
- **Dependency:** Expo Router route grouping per tab (shared `trip-plans/[postId]` route rendered in each tab's stack). **Validation:** task test "find a trip from Explore, look at it, go back to where you were".

### 5. Finish the design-system migration
- Retire `compactType` (18 files) and legacy `colors.*` (25 files) in favour of `explorer`; header title rule (no duplicate titles); Day tab bar on non-media screens; keep `onPrimary` white (owner decision) and use it only for bold button labels; one `Segmented`, one `StateScreen`.
- **Benefit:** coherence; every future screen inherits the right look. **Effort:** M–L, mechanical but wide. **Validation:** screenshot diff per screen + contrast unit test (already planned in docs/ui-redesign Phase 2).

### 6. Inspiration-first Explore
- Order: headline + compact search pill → destination chips → itinerary grid (creator covers) → Tripi suggestion card → one hotel carousel with filter chips (Ưu đãi · Cuối tuần · Đánh giá cao).
- The hotel/flight form opens when the search pill is tapped (sheet or full screen).
- **Dependency:** none (all data exists). **Validation:** 5-second test + first-click test comparing current vs proposed.

### 7. Complete every state
- Rooms & price: empty ("Chưa có phòng trống cho ngày này — đổi ngày"), error, loading skeleton.
- Author profile: header "Hồ sơ" on not-found; back CTA.
- Cart and Saved itineraries: same empty-state pattern as Saved with a CTA.
- Search: skeleton instead of three dots on a blank page.
- Image fallback: quiet gradient.
- **Effort:** M. **Validation:** QA checklist per state.

### 8. Simplify Search
- Order: field → "Đã hiểu: Đà Lạt" interpretation (rename "Hiểu là:") → type tabs (Tất cả · Lộ trình · Video · Bài viết · Khách sạn) → results; sort becomes one dropdown button.
- **Effort:** S–M.

### 9. One "Đã lưu"
- `/saved` with tabs Video · Lộ trình; Tôi shows one "Đã lưu" shortcut with counts.
- **Dependency:** none (two existing lists). Collections = future feature, not shown until built.

### 10. Accessibility baseline
- Text minimum 12 px (tab labels 11–12 with icons; chips 14); Reels top tabs and itinerary pill ≥ 44 px hit area; white on coral only for bold button labels; verify Dynamic Type up to 200 % on Android; TalkBack pass on Reels rail, sheets and booking.
- **Validation:** device test with TalkBack and largest font size.

---

## 2. Quick wins vs structural redesign

### Quick wins (≤ 1 day each, low risk, no product decision)
1. Remove fixture distances / "dữ liệu mẫu" note (hotel detail).
2. Replace "Mở Web" with in-app hotel results link.
3. Display-name fallback (comments, reels author).
4. Remove "Sắp có" tiles and chips.
5. Error icon semantics (alert, not shield).
6. Disabled CTA style + helper text.
7. Check every coral button label is bold and large enough for the white label (owner decision); no small white text on coral.
8. Author-profile header on not-found.
9. Rooms empty/error state copy.
10. Slogan removed from profile bio; Tôi segment labels shortened so they don't wrap.
11. Move unread badge from Khám phá to Tôi (or Reels header bell).

### Structural (needs design approval, possibly testing)
1. Tab architecture (Roadmap #1).
2. Inspiration-first Explore (#6).
3. In-tab itinerary stack / context preservation (#4).
4. Reels itinerary card (#3).
5. Type-scale and colour migration across 25+ files (#5).
6. Unified Saved (#9).

---

## 3. Dependencies

| Item | Depends on |
|---|---|
| Reels from-price | `trip-plans` response exposing a total/from price (verify contract; otherwise route + days only) |
| Real hotel imagery | Hotel photos uploaded to the CDN path the seed references (currently 403 in dev) |
| Budget chips (Stitch) | Price-band filter in discovery API — future feature |
| Saved collections (Stitch) | Backend collections — future feature |
| Tab change | Explicit revision of team decision D2 |

## 4. Validation requirements

| Change | Method (see validation plan) | Pass signal |
|---|---|---|
| Tab architecture A vs B vs current | Tree test + first-click, n ≥ 12 per variant | ≥ 80 % correct first click on "find a trip plan" and "see my booking" |
| Explore order | 5-second test + preference | Recall mentions trips/videos, not just hotels; preference ≥ 60 % for proposed |
| Reels itinerary card | Preference + first-click | ≥ 70 % notice and tap the itinerary entry |
| Context preservation | Task test | Users return to the same reel without searching |
| Visual migration | Before/after first-impression ratings | Higher "modern" and "made for me" ratings |
| Accessibility | TalkBack + 200 % font | All primary tasks completable |

## 5. Suggested sequence

1. **Week 1:** quick wins 1–11; run tree test and 5-second tests on mock-ups for #1, #3, #6 in parallel.
2. **Week 2:** design-system migration (#5) and state completion (#7) — no product decision needed.
3. **Week 3:** structural items chosen from test results (#1, #3, #4, #6), then #8, #9.
4. Re-run the first-impression test on the built version.
