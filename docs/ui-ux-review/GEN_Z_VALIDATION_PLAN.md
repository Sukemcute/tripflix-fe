# Tripflix Mobile — Gen Z Validation Plan

**Date:** 2026-11-22 · Companion to [TRIPFLIX_MOBILE_UX_AUDIT.md](TRIPFLIX_MOBILE_UX_AUDIT.md)
**No research has been conducted yet.** Every Gen Z statement in the audit is an expert hypothesis. This plan describes how to test them cheaply with real target users.

---

## 1. Participants

- **Who:** Vietnamese, 18–25, students and early-career; have taken at least one leisure trip in the past 12 months; watch short travel videos (TikTok/Reels/Shorts) at least weekly. Mix: ~50 % have booked travel online themselves, ~50 % let others book.
- **Exclude:** Tripflix team members, people who have used the Tripflix prototype.
- **How many:** 5–6 per round for qualitative tests (finds most major issues); 12–20 per variant for preference, first-click and tree tests.
- **Recruiting:** university groups, travel Facebook groups, friends-of-friends. Small thank-you (e.g. 50k voucher). Get consent for screen/audio recording; store recordings privately.
- **Device:** their own Android/iPhone with an APK/TestFlight build, or a clickable prototype for unbuilt concepts.

---

## 2. Hypotheses to validate

| Id | Hypothesis (from the audit) | Type | Method |
|---|---|---|---|
| H1 | First-time users understand within 10 s that Tripflix turns travel videos into bookable trips | Comprehension | 5-second test on onboarding + Reels |
| H2 | Users do not understand the difference between "Khám phá" and "Đặt" | Navigation | Tree test + first-click |
| H3 | The current "Xem lộ trình" pill on Reels is overlooked | Discoverability | First-click on Reels; eye-path think-aloud |
| H4 | An itinerary chip card with route/days/price increases taps on the itinerary | Preference / engagement | A/B preference + first-click |
| H5 | An inspiration-first Explore feels more "made for me" than the current form-first Explore | Appeal | 5-second + preference |
| H6 | The black tab bar on light screens feels disjointed | Visual coherence | Preference (Day vs Night bar) |
| H7 | Users lose their place when an Explore itinerary opens in the Đặt tab | Flow | Task test |
| H8 | Fixture text, id-style names and "Mở Web" lower trust | Trust | Task test + trust rating |
| H9 | Tripi feels like a helpful companion, not childish | Personality | Interview + adjective selection |
| H10 | Saved/My trips provide a reason to come back | Retention intent | Interview (stated, not measured) |

---

## 3. Methods

### 3.1 Five-second / first-impression test (H1, H5, H6)
- Show one screen for 5 s, then ask: "What is this app for?", "What do you remember?", "Who is it for?", "Pick 3 words from this list" (đẹp, rẻ tiền, hiện đại, nhàm chán, đáng tin, trẻ trung, rối mắt, giống app khác, muốn thử, …).
- Screens: onboarding welcome, Reels, Explore (current), Explore (proposed mock-up), Hotel detail.
- **Success signal:** ≥ 70 % mention video *and* trip/booking for H1; proposed Explore gets more positive than negative adjectives.

### 3.2 Preference comparisons (H4, H5, H6)
- Paired mock-ups, randomised order, one question each: "Which would you rather use to find your next trip? Why?"
- Pairs: Reels pill vs itinerary card; Explore current vs proposed; Night vs Day tab bar on Explore.
- n ≥ 15 per pair. Report split + reasons; treat < 60/40 as "no clear preference".

### 3.3 First-click tests (H2, H3, H4)
- Static screenshot, task, record first tap.
- Tasks: "You like this video — see how to do this trip" (Reels); "Find a hotel in Đà Lạt" (any tab); "See the trip you booked last week" (any tab); "Ask Tripi for a budget trip".
- **Success:** ≥ 80 % correct first click.

### 3.4 Tree test / navigation comprehension (H2)
- Text-only tab labels with sub-items, current vs option A vs option B (roadmap #1).
- Tasks as in 3.3 plus "Find the videos you saved", "Change your travel preferences".
- Tool: Optimal Workshop or a Google Form with branching. n ≥ 12 per tree.

### 3.5 Task-based usability test (H7, H8, H3)
- Moderated, 30–40 min, think-aloud, on device, 5–6 people per round.
- Tasks:
  1. First open: get to the videos (observe onboarding choices).
  2. Find a trip from a video and look at its plan.
  3. From Explore, open a trip, then go back to what you were browsing.
  4. Find a hotel in Đà Lạt for next weekend and get to room choice.
  5. Save a trip and find it again.
  6. Ask Tripi for a 2-day trip under 3 triệu.
- Measures: completion, time, errors/backtracks, SEQ (1–7) per task, trust rating (1–7) on hotel detail and trip booking.
- Note every moment a participant comments on data looking fake, names, or leaving the app.

### 3.6 Short interviews (H9, H10)
- 10 minutes after the task test:
  - "How do you usually go from a travel video to an actual trip today?"
  - "What would make you open Tripflix again next week?"
  - "How do you feel about Tripi? Describe it as a person."
  - "Anything that felt not finished or not trustworthy?"
- Analyse with affinity mapping; report quotes, not percentages.

---

## 4. What does not need user testing

Fix directly (defects or standards, not preferences): fixture text on hotel detail, id-fragment names, "Mở Web" in the booking path, error-icon semantics, missing empty/error states, text below 12 px, contrast below 4.5:1, touch targets below 44 px, header stuck on "Đang tải…".

---

## 5. Reporting

For each round, one page per hypothesis: method, n, result, verdict (supported / not supported / inconclusive), decision. Keep raw notes and recordings outside the repo. Never report a percentage from fewer than 5 participants; never present stated intent ("I would come back") as retention.

## 6. Timeline (suggested)

| Day | Activity |
|---|---|
| 1–2 | Build mock-ups for proposed Explore, Reels itinerary card, tab options; set up tree test and forms |
| 3–5 | Remote 5-second, preference, first-click and tree tests (unmoderated) |
| 6–8 | 5–6 moderated task sessions + interviews on the current build |
| 9 | Synthesis and decisions; update roadmap priorities |
| After build | Repeat 5-second + task tests 1, 2, 3 on the redesigned build |
