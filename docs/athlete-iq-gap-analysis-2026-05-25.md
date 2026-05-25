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

High-value capabilities found and reframed as improvements to existing Habigoal functions:

- Improve athlete history/scoring with a unified operating metrics contract.
- Improve habit tracking with weighted recovery and category scoring.
- Improve check-in/planning load handling with a duration x RPE training-load ledger.
- Improve notes, recommendations, and reports with source-linked reflection memory.
- Improve athlete profiles and planning with micro-skill/PDA benchmarks.
- Improve weekly planning with reusable session blueprints and debrief capture.
- Improve the trainer dashboard with persistent source-linked risk alerts.
- Improve athlete app first-login setup with role-native onboarding baseline.
- Improve reports with versioned weekly snapshots and authorized structured export.
- Improve test/governance coverage with operating-score parity fixtures.

## Habigoal Current Coverage

Already implemented or already planned in Habigoal:

- Daily check-in with nine readiness signals.
- Athlete profiles, history, charts, habits, weekly summaries, and reports.
- Trainer dashboard with priority queues, recommendations, coach actions, and weekly planning.
- Team membership and role-aware access for athlete/trainer/admin.
- MongoDB Atlas persistence and DoneIsBetter SSO direction.
- Centralized forms, onboarding, athlete app, weekly reports, and GDS migration already have existing issues.

## Important Differences

The useful gaps are not the data stack. Athlete IQ uses localStorage/Supabase; Habigoal keeps MongoDB Atlas and DoneIsBetter SSO.

Rejected interpretations:

- No local demo mode.
- No local persistence fallback.
- No offline data fallback.
- No bypass of production auth/data rules.
- No legacy scoring compatibility requirement unless legally or operationally required.
- No extra release checklist when the existing Definition of Done, validation commands, documentation, and Codex control plane are stronger.

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

- `Todo (NEXT)`: #78, #79, #80, #84, #87, #90
- `Backlog (SOONER)`: #81, #82, #83, #85, #86, #88, #89

Issues:

- #78 `Analytics: Athlete history scoring - unified operating metrics contract`
- #79 `Athlete App: Habit tracking - weighted recovery and category scoring`
- #80 `Athlete App: Training load - duration RPE ledger and load zones`
- #81 `Guidance: Reflections and recommendations - source-linked insight memory`
- #82 `Performance: Athlete profile - micro-skill benchmarks and PDA gaps`
- #83 `Planning: Session execution - blueprint library and debrief capture`
- #84 `Trainer Dashboard: Risk scan - persistent source-linked coaching alerts`
- #85 `Athlete App: Onboarding baseline - role-native first-login setup`
- #86 `Reporting: Weekly summaries - versioned snapshots and authorized export`
- #87 `Quality: Operating-score fixtures - parity tests and drift governance`
- #88 `Platform: Privacy-safe telemetry - operational event instrumentation`
- #89 `Forms: Interrupted request recovery - safe retry without offline fallback`
- #90 `UX: Empty data guidance - role-aware no-data states for athlete operations`

## Recommended Sequence

1. #87 operating-score parity tests and fixtures.
2. #78 composite daily metrics contract.
3. #79 weighted habit/recovery scoring.
4. #80 training-load ledger.
5. #84 squad risk scan and persistent alerts.
6. #90 role-aware empty-state guidance.
7. #81 reflection memory and deterministic insights.
8. #82 micro-skill/PDA model.
9. #83 live session runner.
10. #85 athlete onboarding baseline.
11. #86 weekly snapshot/export contract.
12. #88 privacy-safe telemetry.
13. #89 safe interrupted-request recovery.

This sequence hardens the foundation before adding more UI surface area.
