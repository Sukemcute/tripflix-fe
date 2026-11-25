# Tripflix Mobile — Visual Design Critique

**Date:** 2026-11-22 · Build: `trang/SCRUM-189-tripflix-stitch-redesign` @ `35de677c` (Expo web, 390 × 844) · Audit only.
Evidence ids (e.g. `g06-0`) refer to `VSF/outputs/mobile-ux-audit-2026-11-22/screens/`. Context and scores: [TRIPFLIX_MOBILE_UX_AUDIT.md](TRIPFLIX_MOBILE_UX_AUDIT.md).

This document judges the interface **only as a visual and emotional object**. Usability is covered in the main audit.

---

## 1. Verdict in one paragraph

Tripflix now has a *palette* and a *voice*, but not yet a *visual system*. Where the new "Original Explorer" layer is applied (onboarding, Saved, Explore header, Book hero, Flights hero), the app looks warm, confident and young. Everywhere else, old compact typography, ad-hoc tinted cards and missing states pull it back to "internal tool". The biggest aesthetic lever is not new decoration — it is **finishing the migration** and **putting travel photography, not UI chrome, at the centre of non-video screens**.

---

## 2. What makes it attractive (keep these)

1. **Warm canvas.** `#FFF7F2` instead of white gives every non-video screen a sunlit, paper-like warmth that matches "travel" better than a clinical white OTA.
2. **Display headlines with personality.** "Hôm nay vi vu đâu ta?", "Để dành một chuyến đi.", "Chuyến đi, theo gu của bạn." — 26–34 px bold Be Vietnam Pro with tight tracking. This is the app's strongest typographic moment and it speaks like a friend.
3. **Coral as the only loud colour.** Primary actions are the only large coral surfaces; the eye always knows where the action is.
4. **Tripi in empty and welcome states.** The 3D fox with the map (a04, a05, a11) turns dead ends into friendly moments. It is the most ownable visual asset Tripflix has.
5. **Onboarding collage (g01).** Two tilted photos, a sticker, Tripi breaking the frame — layered, playful, editorial. This is the visual direction the rest of the app should follow.
6. **Itinerary thumbnails on Explore (g06-3).** Creator covers with their own lettering ("HẠ LONG", "Săn Mây") give genuine user-generated energy — more Gen Z than any stock photo.

---

## 3. What makes it unattractive (fix these)

### 3.1 Typography: two scales fighting
- Measured on-screen: tab labels **10 px**, Explore chips **11 px**, header titles **11–13 px** ("Tìm kiếm", "Chuyến đi của tôi", "Cài đặt"), body copy on many screens **12 px**. Display text is 26–34 px.
- Cause in code: `explorer.type` (v2: body 16, label 14, micro 12) is used in 2 files; `compactType` (body 12, heading 13, label 11, meta 10) in 18.
- Visual effect: no middle tier. A 34 px headline followed by 12 px gray text feels like a poster pasted on a spreadsheet. Double titles (small header + big H1 saying the same thing — a05 "Chuyến đi của tôi / Chuyến đi của bạn", a08 "Cài đặt / Cài đặt") look like a layout bug.
- **Change:** one scale. Header title = `headline` 17–20 px semibold *or* no header title when a large H1 follows (iOS large-title pattern). Body 15–16, secondary 14, micro 12 minimum. Chips 14 px semibold.

### 3.2 Colour: tints without meaning
- Teal card, yellow card, peach card appear as section backgrounds without a rule: Settings uses teal for "Tài khoản" and yellow for "Hoạt động" (a08); Tôi uses teal for trips and yellow for saved (a00); Notifications uses peach for every unread item (a06).
- Effect: pastel patchwork; colour stops signalling anything.
- **Change:** tints only for *meaning* — teal = information/selected, sun = rating/highlight, peach = Tripi/assistant. Neutral white cards on the warm canvas for everything else.
- **Night tab bar on Day screens:** the solid black bar is the heaviest element on Explore, Book, Tôi, Saved. On Reels it belongs; on warm screens it reads as a different app. **Change:** tab bar follows the surface — Night over Reels, Day (white with a hairline `#EADFD8` top border and soft shadow) elsewhere; Create button keeps the sunset gradient in both.
- **White on coral** (≈3.1:1) on primary CTAs is the product owner's decision and stays. It passes the WCAG AA large-text threshold, so keep it to bold button labels (≥ 18.7 px bold where possible) and avoid small white text on coral elsewhere (chips, badges, captions).

### 3.3 Cards and components
| Component | What feels wrong | Change |
|---|---|---|
| Hotel card (g06) | Image area ~60 % of card but shows a fallback block; text area has three lines of 13–14 px with an orphaned "/đêm"; three identical carousels in a row | 4:5 photo with gradient scrim and price on the photo, name + rating below; one carousel with filter chips |
| Quick-link tiles (g06) | Four equal tiles, two of them say "Sắp có" in 12 px; icons in tinted squares inside white squares (double container) | Only available services; single-container tile, icon 28 px, label 14 px |
| Search card (g06) | Segmented control + input + disabled CTA in a white card on a warm canvas, 160 px tall above the fold | Collapsed search pill ("Bạn muốn đi đâu?") that expands on tap |
| Segments/tabs | Three styles: pill chips (g09), warm rounded rectangles (a05), solid teal block + bare text with wrapping (a02) | One `Segmented` component: pill track, white thumb, 14 px labels, max 4 items |
| Disabled primary button | Pale coral/beige with white text looks broken or loading | Neutral 8 % ink fill, 40 % ink text, no icon |
| Error/info banner | Shield-check icon for errors and empty states (g12, a10, i06) | Alert-circle in `error` colour for errors; no banner for empty states — use the empty-state pattern |
| Notification card (a06) | Every unread item is a full peach block; repeated quote boxes | White card, 3 px coral left bar for unread, grouped |
| Itinerary sheet footer (i02) | Two outlined buttons in a row, primary coral alone below, right-aligned | One row: two icon buttons + one flexible primary |
| Rating badge (d02) | Big yellow "4,9 / 5" pill is good; "Điểm từ khách" label above is 13 px gray | Keep; add count inline |

### 3.4 Composition and rhythm
- **Gutters vary:** 16 px (Book title), 20 px (most), ~28 px (Create). Pick 20.
- **Empty bottom halves:** Book (g07), Cart (a10), Rooms (d06), Create (a07), Saved itineraries (a11) all end at mid-screen with ~40 % blank canvas. The screens look unfinished, not airy. Fill with relevant content (saved itineraries, recent trips, examples) or vertically centre the state.
- **Repetition:** same Tripi pose (map) on Saved, My trips and Saved itineraries; same "Đi tìm cảm hứng" CTA. The library has more poses (`tripi-library/`: action-book, action-plan, action-vlog…) — use a different pose per context.

### 3.5 Imagery and video
- Reels: full-bleed covers are strong; the rail and caption are clean. The itinerary pill is the visually weakest element in the frame, yet it is the product's reason to exist.
- Explore/Hotel: real hotel photos were not visible in this environment (CDN 403). The *fallback* is a teal block with a picture icon and "Ảnh chưa tải được" — repeated 9+ times on one screen it dominates the page. A fallback should be quiet: a blurred destination image or a soft gradient, no text.
- Trip booking hero (d01): Tripi pasted over the Hạ Long photo competes with — and hides — the destination. In a screen showing 7.770.000đ, the destination and creator should carry the emotion; the mascot belongs to assistant entry points.

### 3.6 Brand expression
- Logo is used correctly (full mark top-left on Explore, Tôi, Login).
- Slogan placement is inconsistent: under the Explore headline (good), in the onboarding body (fine), as the user's profile bio on Tôi (a02) — the last one dilutes it into filler.
- Brand promise vs slogan: copy uses "Thấy là thích, nhích là đi" (slogan) correctly; the brief's brand promise "Chạm cảm hứng, trọn hành trình" does not appear — not a defect, but consider it for the Book/itinerary context.
- Components themselves (buttons, cards) are brand-neutral. Personality comes from copy and the mascot only. A light, consistent brand gesture would help: e.g. the logo's sunset gradient on the Create button and *only* on active states of itinerary chips; the tilted-photo "sticker" motif from onboarding reused on itinerary cards and empty states.

---

## 4. Emotional appeal

| Emotion | Where it lands | Where it is missing |
|---|---|---|
| Curiosity | Reels, onboarding, itinerary thumbnails | Explore first viewport (form), Search (filters) |
| Adventure / freedom | Reels footage, onboarding photos | Book tab (empty), Trip builder (dashed boxes) |
| Inspiration | Itinerary grid, Tripi prompt cards | Hotel rows with fallback images |
| Trust | Hotel detail structure, price blocks, timeline | Fixture disclaimer on hotel detail, UUID names, "Mở Web" |
| Personality | Tripi copy, headlines | Settings, notifications, moderation status, cart |

---

## 5. Aesthetic coherence

Three visual languages coexist:
1. **Night media** — Reels, black tab bar.
2. **Warm explorer (v2)** — onboarding, Explore header, Book hero, Saved, Flights.
3. **Legacy compact** — header bars, Search filters, My trips tabs, Settings tints, Notifications, Moderation status, Cart.

Plus a fourth: the **white Tripi chat** surface (reverted on purpose in `08c41946`).

The fix is a decision, not a polish pass: Night for media only, Warm explorer for everything else, and retire the compact scale. Until then, any new screen will inherit whichever language its author copied from.

---

## 6. Specific redesign recommendations (visual only)

| # | Change | Screens | Priority | Effort |
|---|---|---|---|---|
| V1 | Single type scale (retire `compactType`); remove duplicate header titles | All | P1 | M |
| V2 | Tab bar follows surface (Day on non-video screens) | All tabs | P1 | S |
| V3 | Neutral disabled state; keep white labels on coral buttons (owner decision), bold and large | All | P1 | S |
| V4 | Reels itinerary chip card (route · days · from-price · chevron) | Reels | P1 | M |
| V5 | Destination/creator hero on itinerary booking; Tripi out of the price screen | Trip booking | P1 | S |
| V6 | Quiet image fallback (gradient/blur, no text) | Explore, Search, Hotel | P2 | S |
| V7 | One `Segmented` component, one empty-state pattern with context-specific Tripi poses | My trips, Tôi, Search, Saved, Cart, Saved itineraries | P2 | M |
| V8 | Tints carry meaning only; neutral grouped lists in Settings; unread bar in Notifications | Settings, Tôi, Notifications | P2 | S |
| V9 | 20 px gutter everywhere; fill or centre half-empty screens | Book, Create, Cart, Rooms | P2 | S |
| V10 | Reuse onboarding's tilted-photo sticker motif on itinerary cards and empty states | Explore, Saved | P3 | M |

All recommendations are expert judgments; V2, V4, V5 and V10 are good candidates for preference testing (see [GEN_Z_VALIDATION_PLAN.md](GEN_Z_VALIDATION_PLAN.md)).
