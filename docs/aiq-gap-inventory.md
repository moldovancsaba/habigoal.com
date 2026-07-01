# Athlete IQ — Trainer & Athlete Gap Inventory (2026-07-01)

Consolidated from a full code survey (trainer surface, athlete surface, engines/APIs)
plus the open-issue roadmap (156 open, 118 near-term). Use this to track the
remaining trainer/athlete functionality and business logic.

## Headline

- **Athlete surface** — UI is wired end-to-end (every panel has live endpoints,
  no mock data). The gap is **depth of business logic**, not missing screens.
- **Trainer surface** — where actual **features are stubbed or missing** (role
  views, coach queues, analytics, roster management, planning).
- **Engines** — mostly honest-but-shallow heuristics + **7 missing endpoints**.

Delivery order: **P0 → P1 → P2 → P3**. Deferred = roadmap-2.0 / exploratory.

---

## P0 — Trainer daily loop (surface engines that already exist)

| Gap | Where | State | Existing issue |
| --- | ----- | ----- | -------------- |
| Coach recommendation queue (engine output not surfaced) | `lib/engines/recommendation.engine.ts` → no `/trainer/recommendations` endpoint/panel | unwired | #84, #256, #81 |
| Injury-risk coach alerts | `lib/engines/injury-risk.engine.ts` → no `/trainer/injury-alerts` endpoint/queue | unwired | #84 |
| Priority-queue detail / filter / snooze / athlete link | `AthleteIqExperience.tsx:292-309` | partial | #84 |
| Coach action queue: bulk ack/resolve, filter, history | `app/api/coach-actions/route.ts:43-114` | single-record only | #236 |
| Configurable readiness/alert thresholds | hardcoded `<50 risk / <70 watch` | hardcoded | — |

## P1 — Trainer team management & analytics

| Gap | Where | State | Existing issue |
| --- | ----- | ----- | -------------- |
| Roster management (add/remove athletes) UI + API | `dashboard/coach/page.tsx:262` dead link | missing | #336 |
| Team trends & analytics panel + charts + anomaly | `types/athleteiq-stakeholder.ts` type exists, no UI | missing | #238, #339 |
| Athlete comparison / cohort analysis | — | missing | — |
| Coach activity dashboard | `MainDashboard.tsx` `CoachActivitySummary` type unused | missing | — |
| Team messaging: group/broadcast, templates, search | `components/dashboard/TeamMessagesPanel.tsx` | partial | #15 |

## P2 — Planning & sessions

| Gap | Where | State | Existing issue |
| --- | ----- | ----- | -------------- |
| Training-load planning: assignment, load balance, conflict detection; remove hardcoded `coachId`/`org` | `dashboard/planning/page.tsx:76` | skeleton | #258, #260 |
| Session builder blueprint library | `AiqSessionPanel` / session service | partial | #83, #258 |
| Debrief analysis (plan-vs-actual, load estimate → twin) | `app/api/athleteiq/sessions/[id]/debrief/route.ts` | form-only | #83 |

## P3 — Engine depth & missing endpoints

| Gap | Where | State |
| --- | ----- | ----- |
| Readiness engine: 7-day trend, wearable baselines, load context | `lib/engines/readiness.engine.ts:14-31` | 2-signal heuristic |
| Injury-risk engine: cumulative load, asymmetry trend, sport modifiers | `lib/engines/injury-risk.engine.ts:14-52` | 3-factor arbitrary |
| Recovery engine: individual HRV percentile, sleep architecture | `lib/engines/recovery.engine.ts:44-64` | absolute thresholds |
| Recommendation engine: dynamic synthesis + explainability | `lib/engines/recommendation.engine.ts:44-70` | static text | 
| Operating score: sport/position thresholds, ACWR, monotony | `lib/operating-score.ts:103-110` | fixed-point |
| Twin: temporal dynamics, anomaly, forecast | `lib/athleteiq-twin-projection.ts`, `lib/twin-updater.ts:40-100` | snapshot only |

**Missing endpoints** (P3): athlete trends, readiness-forecast, cohort-readiness,
interventions log, injury-risk-history, pre-session assessment, pain-recommendations.

Related engine issues: #253 (data confidence), #254 (explainability), #81 (reflections/recs),
#84 (risk scan), #239/#240/#241 (recovery/fuel/learning), #86 (weekly snapshots).

---

## Deferred (roadmap-2.0 / exploratory — not in this programme)

Academy OS & Services role views (#285 — the `roleView` segmented control is a
stub), Vision pose/video pipeline (#353, #354, #188–194), CogLeague (#264–270),
GameFlow (#271–281), commercial/partner/investor (#247–250, #287–290).

**Enabler:** #439 background-job worker runtime (order:A-foundations) — required
before heavy async (forecasts, batch reports, twin rebuilds).
