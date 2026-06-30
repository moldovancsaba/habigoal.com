# Input Copy Research — professional framing & variant model

**Date:** 2026-06-30. **Owners:** product + content.
**Purpose:** for **every input we ask an athlete or trainer for**, capture (a) how a
professional — strength & conditioning coach, sports clinician, sport psychologist —
would actually ask and frame it, (b) the tone/safety rules, and (c) the **3-variant +
context** model the Copy Variant Engine (`lib/copy-variants.ts`) uses so prompts feel
attentive and intelligent instead of repeating one line.

## How the variant model works (applies to every input below)
- Each prompt/microcopy is a `CopyDef` with **≥3 neutral variants** (daily-rotated by a
  stable hash of date+athlete) plus **context-gated variants** that win when their
  condition is true. Selection is deterministic (no randomness) and i18n-backed.
- **Context signals available:** time-of-day, current streak, days-since-last (return
  after a gap), day-of-week, data-confidence band (#253), momentum (rising/steady/
  falling), missing-data, completion rate.
- **Per surface we author:** prompt label · helper/explanation · placeholder · empty
  state · success microcopy · missing-data nudge — each with its variants.

## Cross-cutting tone & safety rules
- **Trainer voice (default):** concrete, encouraging, action-first, second person.
  "Get a few weak-foot reps in" — not "Habit pending."
- **Clinical inputs (pain, soreness, injury, illness):** non-diagnostic, calm, never
  alarming; we *record and route*, we do not diagnose. Always offer "not sure / prefer
  not to say". Pain ≠ failure. Escalation copy is factual, not scary.
- **Psychological inputs (mood, stress, motivation, confidence, reflection):**
  supportive, non-judgmental, normalizing; no toxic positivity; never imply a "wrong"
  feeling. Privacy-first wording (athlete owns it; coach sees only what's shared).
- **For minors:** plain language, reassurance, guardian-aware; no clinical jargon.
- **Honesty:** never claim certainty we don't have; low-confidence/missing states say so.
- **i18n:** all copy localized (en/hu/de/es/ar/he); no embedded English; RTL-safe.

---

## 1. Daily check-in — readiness signals (9)
Grouped by pillar: **physical readiness** (sleep quality, muscle soreness, energy),
**mental balance** (mood, stress, motivation), **sport brain** (focus, confidence,
reaction/decision).

- **Professional framing:**
  - Physical: S&C/athletic-training language — "How recovered does your body feel?"
    Sleep & soreness are the highest-signal, lowest-burden readiness markers
    (subjective wellness questionnaires correlate with training response).
  - Mental: sport-psychology — mood/stress/motivation as a daily affect check;
    normalize variation ("off days are data, not failure").
  - Sport brain: focus/confidence/decision speed as performance-cognition markers.
- **Tone:** quick, single-tap 1–5; never make a low score feel like a verdict.
- **Variants (per signal):**
  - Neutral ×3: a plain ask, a body-aware ask, a "today vs usual" ask.
  - Context: **morning** ("Quick gut-check before the day"), **evening** ("How did the
    body hold up today?"), **returning** after a gap ("Welcome back — just today's
    read"), **low-confidence** ("A few days of this sharpens your trends").
- **Helper:** explain the 1–5 scale once; **missing nudge:** "No read yet today — 20
  seconds sets your plan."

## 2. Training load — duration, RPE, session type, location
- **Professional framing:** session-RPE × duration = internal load is the validated,
  equipment-free workload measure (Foster). Ask RPE **after** the session, on the
  0–10 / 1–10 category-ratio scale; anchor the ends ("rest" … "maximal").
- **Tone:** factual; RPE is subjective and that's fine.
- **Variants:** RPE prompt neutral ×3 (effort, "how hard", "tank left"); context:
  **post-session/evening**, **high-load streak** ("third hard day — be honest about
  effort"). Duration/type/location: plain labels + helper.
- **Missing nudge:** "Log the session so load and readiness line up."

## 3. Habits (9 across training / learning / recovery / wellness)
- **Professional framing:** habit-formation (cue → routine → reward); micro-actions,
  identity-based ("the kind of athlete who…"), streaks for momentum but **no shame on
  a miss** (psychology of self-efficacy).
- **Variants (already shipped via `daily-plan-copy.ts`):** per-habit specific line +
  neutral alternates rotate; context lines for **evening**, **streak ≥3**,
  **returning**. Each of the 9 habits keeps its own actionable description.
- **Missing/zero nudge:** "Start with one — momentum beats perfection."

## 4. Lite modules — recovery, fuel, learning, manual wearable
- **Recovery (protocol + perceived recovery 1–5):** clinician/recovery-science
  framing — perceived recovery (PRS-style) is a valid readiness adjunct; protocol is
  free-text (sleep, cold, mobility…). Ask non-judgmentally.
- **Fuel (hydration/nutrition):** sports-nutrition framing; behaviour not calories;
  avoid diet-culture language; never moralize food.
- **Learning:** skill-acquisition/film-study framing; short, curiosity-driven.
- **Manual wearable:** neutral data-entry; explain why (fills gaps when no device).
- **Variants:** each module's prompt neutral ×3 + **evening** + **empty/first-time**
  ("First entry sets your baseline"). **Missing nudge** is the key one here (see SS2:
  "NINCS ADAT") — pair with the **add-it** affordance (req 5).

## 5. Cognitive traits (6)
- **Professional framing:** football-IQ / cognitive-performance framing (scanning,
  decision speed, impulse control, anticipation…). Self-rating + derived; explain it's
  a developing picture, not a verdict.
- **Variants:** per-trait prompt neutral ×3 + **low-confidence** ("a few entries make
  this meaningful"). **Missing nudge** drives the "6/6 traits · 0 provided → add"
  affordance (SS2, req 5).

## 6. Reflection — win, struggle, focus tomorrow
- **Professional framing:** sport-psychology reflective practice (what went well /
  what was hard / next intention). Strength-based; normalize struggle; keep it short.
- **Tone:** warm, private, never graded. Evening-weighted.
- **Variants:** each field neutral ×3 + **evening** ("Close the day in three lines")
  + **post-hard-session** ("Tough one today — what did you learn?"). Placeholders give
  gentle examples.

## 7. Session debrief — RPE, completion %, pain after, mood after, notes
- **Professional framing:** post-session debrief; RPE (see §2); completion % =
  adherence; **pain after** is a *safety* signal (clinical tone, non-diagnostic, route
  to guardrail if elevated); mood after = affective response.
- **Tone:** quick; pain framed safely with a "no pain" default and a clear scale.
- **Variants:** neutral ×3 + **high-RPE** ("Big effort — how's the body now?") +
  **pain-flagged** (calm follow-up). Defaults pre-filled so save is one tap.

## 8. Baseline — weekly goal, preferred training days, support preferences
- **Professional framing:** goal-setting (specific, athlete-owned) + autonomy-support
  (self-determination theory) — preferences shape how we support, not judge.
- **Variants:** neutral ×3 + **first-time/onboarding** + **returning-to-update**.

---

## Authoring checklist (per input, per locale)
- [ ] ≥3 neutral variants + the relevant context variants.
- [ ] Helper text (scale/why) and placeholder with a concrete example.
- [ ] Empty state + missing-data nudge (wired to the add-it affordance where data is
      model-backed — req 5).
- [ ] Success microcopy.
- [ ] Clinical/psych safety review for pain/illness/mood/stress inputs.
- [ ] All 6 locales; RTL-checked; i18n audit green.

## Rollout order (highest traffic first)
1. Daily check-in signals → 2. Habits (done) → 3. Lite modules → 4. Reflection →
5. Session debrief → 6. Cognitive traits → 7. Baseline → 8. Training load.
