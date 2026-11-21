# Tripflix design system v2 — "Original Explorer"

**Status:** In mobile implementation (2026-11-20). The new `explorer` tokens and shared primitives are being adopted screen by screen; unmigrated screens still use the legacy palette.

Character: **Original Explorer · Playful · Gen Z · Premium · Travel-first · Video-first.**
The Stitch project uses a LIGHT theme. Use **Day** surfaces for discovery, planning, booking, Tripi, saved content, creator studio and account. Reserve **Night** for full-bleed media such as Reels and video preview.

## 1. How the skills were applied

| Skill                                          | What it decided here                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **frontend-design** (Anthropic)                | The palette and type are grounded in Vietnamese youth travel culture, not a generic OTA look. It sets a ban list of "generated UI" tells (§11). It allows one authored motion moment per screen and plans tokens before building.                                                                                                                                                       |
| **ui-ux-pro-max** (React Native rules)         | Touch targets 44 pt / 48 dp. Press feedback within 80–150 ms with no layout shift. One vector icon family with no emoji. Safe-area insets on tab bar, header and sticky CTA. Semantic tokens only. Pre-delivery checklist (§12).                                                                                                                                                        |
| **Impeccable** (craft floor, typeset, animate) | Motion duration tiers and exponential ease-out. Exit is faster than enter. Card radius 12–16. Elevation is declared once (border **or** shadow). Contrast floors. Copy names the action, and errors name the problem and the fix. Its `critique` → `polish` → `audit` vocabulary is used for screen reviews. Platform: adaptive (iOS HIG and Material 3 conventions where they differ). |

Conflicts resolved: body measure is **45–75 characters** (Impeccable typeset). Letter-spacing floor is **−0.02 em**, applied to display sizes only.

## 2. Colour

### 2.1 Brand primitives (unchanged identity)

Coral `#FF5A3C` · Teal `#00B2A3` · Sunshine `#FFC531` · Ink `#18242B` · Warm Mist `#FFF7F2` · Sea Mist `#E7F7F4`.

### 2.2 Contrast facts that shape the system (measured, WCAG 2.x)

| Pair                             | Ratio           | Consequence                                                                                                                                                                                                                                                                         |
| -------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| White on Coral                   | **3.10**        | Fails for 16 px button labels. White text is not allowed on coral below 24 px regular / 19 px bold.                                                                                                                                                                                 |
| Ink on Coral                     | **5.11**        | Pass. Ink on coral passes, but **the product owner chose a white label on the coral CTA** (2026-11-21) to make it stand out. White on coral is 3.1:1: it meets 3:1 for large/bold text only, not 4.5:1. Keep CTA labels bold and ≥16px; a deeper coral would be needed to reach AA. |
| White on Teal                    | **2.66**        | Fails. Teal fills carry ink labels (5.96).                                                                                                                                                                                                                                          |
| Teal text on light               | —               | Use `teal-ink #006C63` (6.32 on white, 5.72 on Sea Mist).                                                                                                                                                                                                                           |
| Coral text on light              | 2.93            | Fails. Use `coral-ink #BC331E` (5.46 on Warm Mist) for links and price emphasis.                                                                                                                                                                                                    |
| Sunshine                         | 1.58 with white | Fill only, with an ink label (10.02). Never used as text.                                                                                                                                                                                                                           |
| Muted ink `#52606D` on Warm Mist | 6.10            | Pass for secondary text.                                                                                                                                                                                                                                                            |

### 2.3 Semantic tokens

| Token                         | Day                         | Night                 | Role                                                                          |
| ----------------------------- | --------------------------- | --------------------- | ----------------------------------------------------------------------------- |
| `bg.canvas`                   | `#FFF7F2`                   | `#0E1418`             | Screen background                                                             |
| `bg.surface`                  | `#FFFFFF`                   | `#18242B`             | Sheets, grouped content                                                       |
| `bg.tint.explore`             | `#E7F7F4`                   | `#0F2A28`             | Discovery and itinerary grouping                                              |
| `bg.tint.warm`                | `#FFEDE6`                   | `#2A1A16`             | Selected state, conversion context                                            |
| `text.primary`                | `#18242B`                   | `#F4F6F7`             |                                                                               |
| `text.secondary`              | `#52606D`                   | `#AEB9C2`             |                                                                               |
| `text.link`                   | `#006C63`                   | `#3DD6C6`             |                                                                               |
| `text.price`                  | `#18242B`                   | `#FFFFFF`             | Prices are always ink/white, never coral. Emphasis comes from weight.         |
| `action.primary.bg` / `.fg`   | `#FF5A3C` / `#FFFFFF`       | same                  | One per view                                                                  |
| `action.primary.pressed`      | `#E8472A` (white 3.9)       | same                  | Darkens on press; inner label scales to 0.96                                  |
| `action.secondary.bg` / `.fg` | `#18242B` / `#FFFFFF`       | `#FFFFFF` / `#18242B` |                                                                               |
| `action.explore.bg` / `.fg`   | `#00B2A3` / `#18242B`       | same                  | Discovery actions, Tripi                                                      |
| `accent.sun`                  | `#FFC531`                   | same                  | Rating star, "Đã đi thật" badge fill, celebration                             |
| `line.subtle`                 | `#EADFD8`                   | `#26343C`             | Dividers only where grouping needs them                                       |
| `line.input`                  | `#7A8794` (3.47)            | `#8A97A3` (6.20)      | Input boundary (3:1 non-text)                                                 |
| `state.error`                 | `#BA1A1A`                   | `#FF8A80`             | Always icon + text                                                            |
| `state.success`               | `#006C63`                   | `#3DD6C6`             |                                                                               |
| `state.warning.bg`            | `#FFF3CC`                   | `#3A2F0E`             | With an ink label                                                             |
| `media.scrim`                 | `ink @ 0 → 55% → 85%`       |                       | Bottom gradient behind captions. Contrast is measured against the real frame. |
| `focus.ring`                  | `#006C63` 2 px, 2 px offset | `#3DD6C6`             |                                                                               |

**Usage ratio (Day):** about 80 % canvas/surface and ink, 12 % Sea Mist / teal for exploration, 6 % coral for conversion, 2 % sunshine. Night: mostly media, with coral for the like-active state and the primary action only.

**Single sanctioned gradient:** the logo's "Hoàng hôn" sunset (`#FFAA38 → #EA432D`). It is used only on the centre "Tạo" action and the logo itself. No other decorative gradients; media scrims are functional.

## 3. Typography

Family: **Be Vietnam Pro** (bundled 400/500/600/700/800 on mobile). Web loads the same family through `next/font` (to be confirmed in Phase 1). One family for the whole product, with hierarchy from size and weight. Tabular numerals (`fontVariant: ['tabular-nums']`) for prices, times and dates.

| Role          | Size / line       | Weight | Use                                                |
| ------------- | ----------------- | ------ | -------------------------------------------------- |
| `display`     | 34 / 40, −0.02 em | 800    | Destination hero, onboarding, empty-state headline |
| `title`       | 26 / 32           | 700    | Screen titles                                      |
| `headline`    | 20 / 26           | 700    | Section headings, price total                      |
| `subhead`     | 17 / 24           | 600    | Card titles, list primary                          |
| `body`        | 16 / 24           | 400    | Default text, minimum for paragraphs               |
| `body.strong` | 16 / 24           | 600    | Button labels, emphasised values                   |
| `label`       | 14 / 20           | 600    | Chips, tabs, field labels                          |
| `caption`     | 13 / 18           | 500    | Metadata, timestamps                               |
| `micro`       | 12 / 16           | 600    | Badges only. Never for task-critical info.         |

Rules: sentence case everywhere and no all-caps labels. More space above a heading than below it. Vietnamese diacritics need line-height ≥ 1.3 × size; check stacked marks on "Ữ, Ặ". Long-form text (policy, reviews) has a measure of 45–75 characters. Supports OS text scaling up to 200 %: layouts wrap, they do not clip. On Night surfaces, add one weight step to small text.

## 4. Space, layout, shape

- **Spacing scale (4-base):** 4, 8, 12, 16, 20, 24, 32, 40, 56, 72. Inside a group: 8–12. Between groups: 24–32. Between sections: 40–56.
- **Gutters:** 20 on phones (16 under 360 px). Tablet: 32 plus a 640 px content column for reading screens.
- **Safe areas:** tab bar, sticky CTA and headers sit inside insets. Scroll content gets bottom padding equal to tab bar or CTA height + 16.
- **Radius:** `r.sm 8` (chips inside controls, image thumbs) · `r.md 12` (inputs, small cards) · `r.lg 16` (cards, sheet tops) · `r.xl 24` (hero media frames only) · `r.full` (avatars, pill chips, the centre action). Not everything is rounded to the max; full-bleed media has no radius.
- **Composition per screen type:** Reels = full bleed. Explore = editorial stack mixing a hero, horizontal rails, a 2-column grid and a list (never the same module twice in a row). Itinerary = vertical timeline with a sticky total. Profile = identity block plus a 3-column media grid. Checkout = a single column of steps.

## 5. Elevation

Declare depth **once** per element: tonal surface **or** border **or** shadow, never two.

| Level | Treatment                                      | Used by                                   |
| ----- | ---------------------------------------------- | ----------------------------------------- |
| 0     | Flat on canvas                                 | Content                                   |
| 1     | `bg.surface` on `bg.canvas` (tone only)        | Cards, grouped lists                      |
| 2     | Shadow `0 4 16` ink 12 % (Android elevation 4) | Floating tab bar, sticky booking bar, FAB |
| 3     | Shadow `0 12 32` ink 18 % + 40 % scrim behind  | Bottom sheets, dialogs                    |

No coloured glows, no hard offset shadows, no glass/blur as decoration. A blur is allowed only on the floating tab bar over moving media in Night mode, where it is functional.

## 6. Iconography

- One family: **Ionicons** (already installed through `@expo/vector-icons`; no new dependency). Outline is the default; filled marks the selected or active state (tab selected, liked, saved).
- Sizes: 16 (inline with caption), 20 (inline with body), 24 (controls, tabs), 28 (Reels action rail). The hit area is always ≥ 44/48 regardless of glyph size.
- No emoji or Unicode glyphs as icons. Decorative icons are hidden from accessibility; icon-only buttons have `accessibilityLabel`.
- Web: the same glyph set through the Ionicons SVG source (no web font).

## 7. Brand assets

| Asset                                               | Where it appears                                                                    | Where it never appears                                                                   |
| --------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Full logo `tripflix-logo.svg`                       | Splash, welcome/login, web header, share cards, footer                              | Over busy media without a solid backing                                                  |
| Symbol                                              | App icon, compact headers, watermark on share cards                                 | Recoloured outside the official palette                                                  |
| Slogan "Thấy là thích, nhích là đi"                 | Welcome, onboarding finish, empty Reels, web hero/footer, share card                | Buttons, errors, legal pages                                                             |
| Tripi (4 poses + library; Rive rig when TF71 ships) | Onboarding, assistant, empty states, booking success (celebrate), offline (curious) | Prices, payment failure, booking status, provider trust info, error messages about money |

Never redraw the wordmark, never generate a new Tripi pose, and never use doc 08's penguin.

## 8. Components

Each component ships with these states: default, pressed, focused, disabled, loading, error. Where relevant it also has empty and preview.

- **Button** — pill shape (as in Stitch), height 52 (primary) / 44 (secondary, compact). Label = verb + object ("Đặt theo lộ trình", "Lưu lộ trình"). Loading keeps the width and shows a spinner plus "Đang đặt…". Disabled uses real `disabled` semantics, 40 % opacity on the fill, and keeps the label readable.
- **Preview / Sắp có** — a muted surface with a `micro` badge "Sắp có" or "Bản xem trước" and an inert, announced control. The one pattern for every U/F element in the mapping.
- **Chip** — 36 high (48 hit area), `r.full`, white with a subtle line. Selected = teal-ink `#006C63` fill + white label (6.3:1), matching Stitch's selected chip.
- **Implementation:** tokens live in `explorer` in `packages/tokens/src/index.ts` (`explorer.day`, `explorer.night`, `action`, `space`, `radius`, `type`, `elevation`, `motion`); `tokens.test.ts` asserts every text/background pair in §2.3 meets AA. Shared primitives in `apps/mobile/src/components/mobile-ui.tsx` already use them.
- **Search composer** — destination field plus a date and guests row. Always visible on results as a collapsed summary bar.
- **Media card** — image-led. The title sits on a scrim only when on the image; otherwise below. Metadata uses icon + text pairs, not "A · B · C" strings.
- **Price block** — amount `headline`, unit (`/đêm`, `/người`, `tổng`) in `caption`, both mandatory. The source date is shown for assistant-quoted prices.
- **Timeline** — day header ("Ngày 1"), time column, stop, transport connector line in teal, cost line per item.
- **Trust badges** — "Đã đi thật" (sun fill + check), "Đã xác nhận đặt chỗ" (success), "Gợi ý của Tripi" (explore tint). Different wording and icon so they are never confused.
- **Reels action rail** — 28 icon + count (`caption`). Like-active is coral filled. Counts are hidden when the API has none.
- **Tab bar** — kept as the original product menu by decision D2 (Reels · Khám phá · Tạo · Đặt · Tôi, original look and unread-badge placement); the redesign does not restyle it. A future navigation change needs a separate approval. Screens still reserve the bar's height and safe area.
- **Sheet** — grab handle, title, close button, focus trap on web.
- **Form field** — persistent label above, helper text, inline error below with an icon, and the error is announced. Placeholder text is never used as a label.
- **State screens** — Empty (Tripi + one action), Loading (skeleton matching the final layout, no spinners for content areas), Error (what happened + retry), Offline, Signed-out (value statement + login with `returnTo`).

## 9. Motion

| Tier            | Duration   | Use                                                                                        |
| --------------- | ---------- | ------------------------------------------------------------------------------------------ |
| Feedback        | 100–150 ms | Press, toggle, like                                                                        |
| State           | 200–250 ms | Chip select, tab switch, expand                                                            |
| Transition      | 300–400 ms | Sheet, screen push, layout change                                                          |
| Authored moment | 500–700 ms | One per screen: the booking-success Tripi celebrate, the onboarding finish, the like burst |

- Easing: enter `cubic-bezier(0.16, 1, 0.3, 1)`. Exit is 70 % of the enter duration with ease-in. No bounce or elastic curves by default.
- Animate transform and opacity only (Reanimated 4). Press states never move neighbours.
- **Reduce Motion:** spatial movement is replaced by cross-fade. Video does not autoplay with sound, and there is a visible mute/pause control.
- No staggered fade-in on list items, and no hover lift on every card (web).

## 10. Accessibility and responsive rules

- Text 4.5:1 (large text 3:1); icons and boundaries 3:1. This holds in both Day and Night, and on media scrims measured on real frames.
- Targets 44 pt (iOS) / 48 dp (Android), with 8 px between adjacent targets.
- Screen-reader order matches visual order. Status changes (filter applied, added to cart, payment result) are announced.
- Status is never shown by colour alone (booking, moderation, verification).
- Widths reviewed at 320 / 360 / 390 / 430, tablet 768, web 1280 and 1440, plus 200 % text scale and landscape on media.
- Web: visible focus, keyboard reachability, zoom not disabled, no horizontal scroll. Selection colour and scrollbar themed from tokens.
- Performance: reserved aspect-ratio boxes for media, lazy offscreen images (expo-image / next/image), only the current reel decodes video.

## 11. Banned patterns (review will reject)

Eyebrow or kicker labels above headings · one accent-coloured word inside a headline · gradient text · all-caps labels · "01/02/03" numbering on content that is not a real sequence (itinerary days and checkout steps are allowed) · identical icon-heading-text card grids as page structure · nested cards · left colour stripe on rounded boxes · "→" appended to links or buttons · middle-dot metadata strings · decorative glass, glow, grain or stripes · hero-metric blocks with invented numbers · emoji as icons · mascot near money or errors · any sample number, price, name, review or count presented as real.

## 12. Pre-delivery checklist (per screen)

1. It matches its Stitch reference composition (side-by-side screenshot in evidence).
2. Every control is wired to a route or API, or uses the Preview pattern.
3. All values come from the API. No fixture text is visible outside labelled previews.
4. States are present: loading, empty, error, offline, signed-out, success, unavailable.
5. Contrast passes in Day and Night; nothing is conveyed by colour alone.
6. Targets meet 44/48; pressed feedback appears in ≤150 ms; layout does not shift.
7. Safe areas are respected; content clears the tab bar and CTA.
8. 200 % text and 320 px width do not clip; Vietnamese diacritics render correctly.
9. Reduce Motion is respected; video is muted by default.
10. Tokens only. No hard-coded hex (repo rule).
11. Correct logo, Tripi pose and slogan placement.
12. Android screenshot in evidence (repo rule).
