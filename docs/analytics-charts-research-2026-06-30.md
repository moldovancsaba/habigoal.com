# Research: High-impact analytics charts without advanced calculations

**Date:** 2026-06-30
**Scope:** How Habigoal / Athlete IQ can ship *interesting and genuinely useful*
analytics charts using only simple, transparent arithmetic — no machine
learning, no forecasting, no statistical modelling, no opaque "algorithms".
Grounded in the data we already collect and the chart primitives we already
ship.

---

## 1. Core thesis

**The insight comes from the framing of the chart, not from the maths behind it.**

Most of the "wow" in good analytics dashboards is *descriptive*, not predictive.
A calendar heatmap of habit completion is striking and decision-driving, yet the
only operation behind it is *counting*. We do not need advanced calculations to
produce advanced-feeling charts — we need to:

1. Pick the **right chart type** for the question.
2. Use **comparison and context** (vs baseline, vs last period, vs a safe zone).
3. **Encode honesty** (data-confidence gating, no interpolation of missing data).

This keeps every chart explainable ("this bar is the number of days you trained
this week"), auditable, and consistent with our no-fabricated-data principle.

---

## 2. The allowed toolbox (simple math only)

Every pattern below is built from these operations and nothing more:

| Operation | Example in our data |
| --- | --- |
| Count | habit completions per day, sessions per week |
| Sum | total training load this week |
| Average (mean) | mean readiness over last 7 check-ins |
| Min / max | best/worst readiness day |
| Delta / % change | this week vs last week |
| Bucketing / binning | readiness scores into 0–25/25–50/… bands |
| Rolling window | 3-session vs previous-3-session load (already used) |
| Sorting / ranking | habits ordered by completion rate |
| Threshold bands | colour a value by zone (green/amber/red) |
| Median / percentile (light) | athlete vs team median |

Explicitly **out of scope**: regression, ML inference, ARIMA/forecasting,
clustering, anomaly-detection models, "AI predicts your injury risk". Those are
the *advanced calculations* the brief asks us to avoid — and several would also
breach honesty gating until a validated pipeline exists.

---

## 3. Chart pattern catalogue

Each pattern lists: **what it answers**, **the only calc needed**, **data we
already have**, **the outcome/decision it drives**, **build-on** (existing
component or Recharts 3.8 primitive), and an **honesty note**.

### 3.1 Consistency calendar heatmap ⭐ (top recommendation)
- **Answers:** "How consistent have I actually been?"
- **Calc:** count of habits completed per calendar day → colour intensity.
- **Data:** `habit_records.statuses` per day.
- **Outcome:** streaks and gaps are visible at a glance; motivates the
  "don't break the chain" behaviour the product is built around.
- **Build-on:** new lightweight grid (CSS grid of day cells); no Recharts needed.
- **Honesty:** empty cells are genuinely empty (no fill-in for missing days).

### 3.2 Streak ribbon / streak counter
- **Answers:** "How long is my current run?"
- **Calc:** consecutive qualifying days (already implemented:
  `computeCurrentStreak` / `computeBestStreak`).
- **Data:** habit records.
- **Outcome:** reinforces momentum; pairs with the heatmap.
- **Build-on:** stat card + `SparklineChart`.

### 3.3 Readiness band timeline (zoned line)
- **Answers:** "Where does my readiness sit over time, and is it healthy?"
- **Calc:** plot the raw value; overlay fixed coloured zone bands (thresholds).
- **Data:** daily readiness / Daily IQ.
- **Outcome:** instantly see drift toward the fatigued/compromised zone.
- **Build-on:** `LongitudinalChart` + Recharts `ReferenceArea` for the bands.
- **Honesty:** zones are fixed, documented thresholds (same ones the
  explainability catalog uses), not a model.

### 3.4 Readiness distribution histogram
- **Answers:** "What's my *typical* readiness, not just today's?"
- **Calc:** bucket scores into bands, count per band.
- **Data:** all readiness check-ins.
- **Outcome:** reframes a single bad day against the athlete's normal range.
- **Build-on:** Recharts `BarChart`.

### 3.5 Habit-category stacked bars (weekly)
- **Answers:** "Which areas am I keeping up vs letting slide?"
- **Calc:** sum completions per category (training/learning/recovery/wellness)
  per week.
- **Data:** habit records + `getHabitCategoryBreakdown`.
- **Outcome:** surfaces the neglected category to target next.
- **Build-on:** Recharts stacked `BarChart`.

### 3.6 Personal-baseline bullet chart
- **Answers:** "Latest vs my baseline vs my target."
- **Calc:** three numbers, one subtraction for the gap.
- **Data:** baseline profile + latest assessment (we already compute
  latest-vs-baseline in `BenchmarkChart`).
- **Outcome:** clear "ahead/behind my own normal" read, no cohort needed.
- **Build-on:** extend `BenchmarkChart`.

### 3.7 Period-over-period slope chart
- **Answers:** "Am I trending up or down vs last week?"
- **Calc:** two points (this period mean, last period mean) joined by a line.
- **Data:** any metric with ≥2 periods.
- **Outcome:** direction-of-travel at a glance across several metrics (small
  multiples of slopes).
- **Build-on:** Recharts `LineChart` (2 points) or simple SVG.

### 3.8 Diverging change bars
- **Answers:** "What moved most since last period?"
- **Calc:** delta per metric; bars left (down) / right (up) from zero.
- **Data:** any set of comparable metrics.
- **Outcome:** ranks what improved/regressed — a natural weekly-review surface.
- **Build-on:** Recharts `BarChart` with a zero baseline.

### 3.9 Acute:chronic load gauge with safe-zone bands
- **Answers:** "Is my training load ramping into the danger zone?"
- **Calc:** the load ratio we already compute (3-session vs prior 3-session) +
  fixed safe-zone thresholds for colour.
- **Data:** training load ledger.
- **Outcome:** simple ramp-rate guardrail; pairs with the injury-prevention rule
  in the explainability catalog.
- **Build-on:** `ReadinessGauge` styling + zone bands.
- **Honesty:** ratio is a documented rolling average, not a predictive model.

### 3.10 Session-type frequency strip / dot plot
- **Answers:** "What kind of training am I actually doing?"
- **Calc:** count sessions by `sessionType`.
- **Data:** training load `sessionType`.
- **Outcome:** reveals monotony (e.g. all high-intensity, no recovery).
- **Build-on:** Recharts `BarChart` or a chip row.

### 3.11 Win / struggle tally from the memory timeline
- **Answers:** "What themes keep coming up for me?"
- **Calc:** count recurring tags/signals across memory entries.
- **Data:** `memoryTimeline` (already built).
- **Outcome:** turns qualitative reflection into a simple frequency view.
- **Build-on:** Recharts horizontal `BarChart`.

### 3.12 Weekday pattern heatmap
- **Answers:** "Which days am I strong vs flat?"
- **Calc:** average a metric grouped by weekday (7 buckets).
- **Data:** any dated metric.
- **Outcome:** actionable scheduling insight (e.g. "Mondays are always low").
- **Build-on:** small 7-cell heatmap.

### 3.13 Team comparison vs median (trainer)
- **Answers:** "Where does this athlete sit in the squad?"
- **Calc:** team median (sort + middle value) and the athlete's value.
- **Data:** team roster metrics.
- **Outcome:** fast triage for coaches without ranking-shaming individuals.
- **Build-on:** `BenchmarkChart` (athlete vs median marker).
- **Honesty:** median needs a minimum squad size — gate with #253 confidence.

### 3.14 Check-in completion funnel
- **Answers:** "Are check-ins being finished, or abandoned?"
- **Calc:** count started vs completed.
- **Data:** assessment completeness (`computed.completion`).
- **Outcome:** data-quality signal for both athlete nudges and coach follow-up.
- **Build-on:** two-bar funnel.

---

## 4. Patterns to avoid (and the honest substitute)

| Tempting but advanced | Why avoid | Simple honest substitute |
| --- | --- | --- |
| Injury-risk prediction curve | needs a validated model; honesty gate | acute:chronic load gauge (3.9) |
| Readiness forecast / trend extrapolation | forecasting = advanced calc | period-over-period slope (3.7) |
| Auto-clustered "athlete types" | clustering model, opaque | category stacked bars (3.5) |
| Correlation/causation callouts | statistical inference, easy to mislead | side-by-side timelines, let the user see |

---

## 5. Implementation notes

- **Reuse first.** We already ship `LongitudinalChart`, `BenchmarkChart`,
  `SparklineChart`, `ReadinessGauge`, `MaturityRadarChart`, `SymmetryChart`, and
  `ChartEmptyState`, all on **Recharts 3.8** with tokenised styling in
  `components/analytics/AnalyticsConstants.ts`. Most patterns above are a thin
  layer over these.
- **Confidence-gate everything.** Pair each chart with the data-confidence
  engine (#253): show `ChartEmptyState` / a low-confidence badge when the sample
  is too small or stale, instead of drawing a confident-looking line over two
  data points.
- **Never interpolate missing data.** Gaps stay gaps; this is both honest and
  more informative (a gap *is* the insight in a consistency view).
- **Explainability tie-in.** Where a chart drives a recommendation (load gauge,
  readiness bands), reuse the explainability catalog (#254) so the "why" is one
  tap away.
- **i18n.** All labels, axis titles, and tooltips go through the six locale
  catalogs and the i18n audit, like every other surface.
- **Placement.** These land naturally in the new **Analysis** function area of
  the segmented athlete operating surface, and in the coach command center for
  team-level views (3.13, 3.14).

---

## 6. Prioritised recommendations (quick wins first)

1. **Consistency calendar heatmap (3.1)** — highest motivational payoff, pure
   counting, no new dependency.
2. **Readiness band timeline (3.3)** — small extension of an existing chart;
   immediately more actionable than a plain line.
3. **Habit-category stacked bars (3.5)** — directs the athlete to the neglected
   area; data already aggregated.
4. **Acute:chronic load gauge with zones (3.9)** — turns a number we already
   compute into a guardrail.
5. **Period-over-period slope / diverging change (3.7 / 3.8)** — a strong
   weekly-review surface for both personas.

All five are shippable with simple arithmetic over data we already store, on the
chart stack we already run, and fit cleanly behind the confidence and
explainability engines so they stay honest.
