# Athlete IQ Gap Analysis

Status: Active product input
Last updated: 2026-05-25

Sources reviewed:

- `/Users/moldovancsaba/Desktop/athlete-iq`
- `/Users/moldovancsaba/Desktop/athlete-iq-os-mvp`
- Habigoal `main`
- Habigoal GitHub Project 14 and open issues

## Useful Source Capabilities

The Athlete IQ folders define a player operating-system model rather than only a UI prototype.

High-value capabilities found:

- Composite daily scoring: readiness IQ, habit IQ, recovery IQ, training IQ, performance IQ, and aggregate athlete IQ.
- Weighted habit categories: training, recovery, wellness, and tactical learning.
- Training-load capture: activity flags, duration, RPE, duration x RPE load points, weekly aggregation, and load zones.
- Daily reflection memory: win, struggle, focus tomorrow, memory timeline, and deterministic insight lines.
- Micro-skill benchmark model: 27 skill/physical/psychological definitions, athlete scores, benchmarks, confidence, and PDA gaps.
- Live session runner: standard/quick blueprints, drill timers, play/pause/skip/reset, RPE, and debrief notes.
- Squad risk workflow: squad averages, weekly load, fatigue-alert count, generated coaching alerts.
- Athlete onboarding: minimum profile setup and weekly session goal before app use.
- Weekly report snapshots: metrics, reflections, recommendations, and exportable weekly report data.
- Fixture-backed scoring tests that reduce silent drift between scoring implementations.

## Habigoal Current Coverage

Already implemented or already planned in Habigoal:

- Daily check-in with nine readiness signals.
- Athlete profiles, history, charts, habits, weekly summaries, and reports.
- Trainer dashboard with priority queues, recommendations, coach actions, and weekly planning.
- Team membership and role-aware access for athlete/trainer/admin.
- MongoDB Atlas persistence and DoneIsBetter SSO direction.
- Centralized forms, onboarding, athlete app, weekly reports, and GDS migration already have existing issues.

## Important Differences

The useful gaps are not the data stack. Athlete IQ uses localStorage/Supabase; Habigoal should keep MongoDB Atlas and DoneIsBetter SSO.

The useful gaps are product/domain contracts:

- Habigoal needs a stable operating-score contract, not another page-level score calculation.
- Habigoal habits should move from checklist completion to weighted readiness/recovery contribution.
- Training load should become a first-class ledger, not only a loose assessment field.
- Reflection and memory should be athlete-owned source data, not only report notes.
- Coach alerts should become persistent, auditable risk-scan artifacts.
- Reports should snapshot versioned weekly operating data for reproducibility.

## Created Issues

Milestone: `Athlete IQ gap import`

Project 14 placement:

- `Todo (NEXT)`: #78, #79, #80, #84, #87
- `Backlog (SOONER)`: #81, #82, #83, #85, #86

Issues:

- #78 `Habigoal: Add Athlete IQ composite scoring engine and daily metrics contract`
- #79 `Habigoal: Add weighted habit and recovery scoring with category breakdowns`
- #80 `Habigoal: Add training-load ledger with duration x RPE and load zones`
- #81 `Habigoal: Add athlete reflection memory and deterministic insight signals`
- #82 `Habigoal: Add micro-skill benchmark library and PDA gap tracking`
- #83 `Habigoal: Add live session runner with drill timers and debrief persistence`
- #84 `Habigoal: Add squad readiness risk scan and persistent coaching alerts`
- #85 `Habigoal: Add athlete onboarding baseline and weekly goal setup`
- #86 `Habigoal: Add weekly athlete IQ report snapshots and export contract`
- #87 `Habigoal: Add operating-score parity tests and fixture governance`

## Recommended Sequence

1. #87 operating-score parity tests and fixtures.
2. #78 composite daily metrics contract.
3. #79 weighted habit/recovery scoring.
4. #80 training-load ledger.
5. #84 squad risk scan and persistent alerts.
6. #81 reflection memory and deterministic insights.
7. #82 micro-skill/PDA model.
8. #83 live session runner.
9. #85 athlete onboarding baseline.
10. #86 weekly snapshot/export contract.

This sequence hardens the foundation before adding more UI surface area.
