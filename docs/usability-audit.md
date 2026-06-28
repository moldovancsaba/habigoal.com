# Product usability audit — mobile & desktop

Scope: the consumer white-label surface (`HabigoalExperience`) as a mobile PWA,
and the shared desktop layout. Grounded in current mobile-form, touch-target,
and habit-tracker UX research (see Sources).

## Findings

### 1. Results are shown before input
The daily surface opens with a score ring / journey ring at the very top, before
the user has entered anything. A score that reads "—" or a half-empty ring at the
top of the first screen is noise: it presents an *output* before any *input*
exists. Progressive disclosure says inputs come first; the result is revealed
*after* the day is recorded.

### 2. No clear, consistent user journey
The screen is a single long scroller (hero → signals → check-in → habits →
progress → action) with a bottom nav that just jumps between anchors on the same
page. There is no sense of "where am I / what's next / am I done". Long
single-page forms abandon far more than chunked, stepped flows — multi-step forms
complete at materially higher rates, and a visible progress indicator cuts
abandonment further.

### 3. Not designed for mobile input
- **Sliders** are continuous (`step={1}`) with a small handle. On a touch screen
  they move on the lightest brush and can be nudged accidentally while scrolling.
  Sliders are a poor control for precise mobile input.
- **Habits** are native checkboxes — only the tiny box and its text are tappable,
  not the whole row.
- **Bottom nav** declares `repeat(4, …)` columns for **5** items, so it wraps to
  two ragged rows; items and icons are small.
- Touch targets across nav/actions fall under the comfortable size. WCAG 2.2 AA
  asks ≥24px; Apple HIG and WCAG AAA ask ≥44px; Material asks ≥48dp. Undersized
  targets have ~3× the tap-error rate.

### 4. Mobile pinch-zoom is broken
The viewport is locked (`userScalable: false`, `maximumScale: 1`), yet the page
appears zoomed-in with no way to zoom out. That is the signature of **horizontal
overflow**: when content is wider than `device-width`, mobile Safari renders the
page zoomed-in and — because zoom is locked — the user cannot recover. Several
rules use `100dvw` (which ignores the scrollbar gutter and safe-area insets) and
overflow the frame.

## Target journey map (mobile PWA daily loop)

One job per screen. Input first, result last.

```
        ┌─────────────┐      not recorded today
 open → │   TODAY      │ ───────────────────────────┐
        │  (home tab)  │                             ▼
        └─────────────┘                   ┌──────────────────────┐
              │ recorded today            │ STEP 1 · Check-in    │
              ▼                           │ stepped sliders      │
        ┌─────────────┐                   └──────────┬───────────┘
        │   RESULT     │                              ▼  Continue
        │ score+status │                   ┌──────────────────────┐
        │ +next action │                   │ STEP 2 · Habits      │
        │ +streak      │                   │ full-card toggles    │
        └─────────────┘                   └──────────┬───────────┘
              ▲                                       ▼  Continue
              │                            ┌──────────────────────┐
              │           Save my day      │ STEP 3 · Review&save │
              └────────────────────────────┤ summary + save       │
                                           └──────────────────────┘

 Bottom nav (2 large tabs): [ Today ]  [ Progress ]
```

- **Today** — if the day is not recorded: a single clear "Start daily check-in"
  CTA and a "Step 0 of 3" sense of the loop; **no score**. If recorded: the
  Result view (score, status, next action, streak) — legitimate, because input is
  done.
- **Steps 1–3** — one task per screen with a `Step X of 3` indicator, Back and a
  single primary action. Sliders become stepped; habits become full-card toggles.
- **Progress** — streaks and the last-7-days history, separated from the daily
  input loop.

## Fixes applied

- Restructure the daily flow into a 3-step wizard with a progress indicator;
  reveal the score only after the day is saved (input-before-result).
- Replace habit checkboxes with full-card toggle **buttons** (whole object
  tappable, instant visual state).
- Replace continuous sliders with **stepped** sliders (coarse steps + visible
  marks + larger handle) so values don't move accidentally and are easy to set by
  thumb.
- Enforce ≥44px touch targets for nav, toggles, and actions; rebuild the bottom
  nav as two evenly-sized tabs.
- Eliminate horizontal overflow: clamp the frame and fixed bars to the safe
  viewport width and `overflow-x: clip`, so the locked viewport renders at 1×.

## Sources

- [Multi-step form best practices (Growform)](https://www.growform.co/must-follow-ux-best-practices-when-designing-a-multi-step-form/)
- [Multi-step form best practices 2026 (Anve)](https://voiceforms.anvevoice.app/blog/multi-step-form-best-practices/)
- [WCAG 2.5.8 Target Size (W3C)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [Accessible tap target sizes (Smashing Magazine)](https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/)
- [Progress tracker design (UXPin)](https://www.uxpin.com/studio/blog/design-progress-trackers/)
- [Habit tracker UX (RapidNative)](https://www.rapidnative.com/blogs/habit-tracker-calendar)
