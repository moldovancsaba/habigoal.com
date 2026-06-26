# Product Audit And Live Engine Implementation Plan

Date: 2026-06-26
Scope: Habigoal and Athlete IQ in `moldovancsaba/habigoal.com`
Database decision: MongoDB Atlas only, no local database fallback

## Executive Assessment

The codebase has a real MongoDB Atlas persistence layer and a large Athlete IQ service/API foundation. The main product risk is not that nothing exists. The risk is that the UI, the older Habigoal check-in path, and the newer Athlete IQ contracts are not yet joined into one reliable product engine.

Current counts from the repository:

- 110 API route handlers under `app/api`.
- 47 Athlete IQ API route handlers under `app/api/athleteiq`.
- 16 Athlete IQ contract test files under `lib/athleteiq-*.test.ts`.
- 15 Athlete IQ contract documents under `docs/athleteiq-*-contract.md`.

High-confidence conclusion: most Athlete IQ business modules are implemented as isolated services and repositories, but the end-user journey is incomplete. A trainer can see product-looking surfaces, but many actions either update local UI state only, call the older Habigoal endpoints, or require manual calls to separate AIQ endpoints before the dashboard becomes complete.

## Product Boundary

Habigoal must be a mobile-first PWA for daily wellbeing, habit support, check-ins, and simple feedback.

Athlete IQ must be a professional trainer/athlete/club operating system. It should support desktop-first trainer workflows and a mobile view, with team and individual athlete management, reports, planning, daily intelligence, and role-aware projections.

The selector can remain only as a presentation shell. Production domains must route directly to their product:

- `habigoal.com` -> Habigoal entry, no navigation to Athlete IQ.
- Athlete IQ domain -> Athlete IQ entry, no navigation back to Habigoal or selector.
- Shared database and shared feature directories are acceptable only behind the product boundary.

## Implemented And Connected

These parts are substantially real and backed by MongoDB Atlas repositories:

- Auth and roles: `lib/access.ts`, `middleware.ts`, `app/api/auth/*`.
- Athletes/profiles: `app/api/athletes/*`, `repositories/child.repository.ts`, `repositories/athlete.repository.ts`.
- Teams: `app/api/teams/route.ts`, `repositories/team.repository.ts`.
- Legacy Habigoal check-ins: `app/api/check-ins/*`, `services/assessment.service.ts`, `repositories/assessment.repository.ts`.
- Legacy Habigoal twin pipeline: `services/twin-pipeline.service.ts`, `lib/twin-updater.ts`, `repositories/athlete-twin.repository.ts`.
- Habit records: `app/api/athletes/[id]/habits/route.ts`, `repositories/habit-records.repository.ts`, `lib/athlete-habits.ts`.
- Training load ledger: `app/api/athletes/[id]/training-load/route.ts`, `repositories/training-load.repository.ts`, `lib/training-load.ts`.
- Coach actions: `app/api/coach-actions/route.ts`, `repositories/coach-actions.repository.ts`.
- Athlete IQ check-in snapshots: `app/api/athleteiq/check-ins/*`, `repositories/athleteiq-check-in.repository.ts`.
- Athlete IQ Daily IQ: `services/athleteiq-daily-iq.service.ts`, `lib/athleteiq-daily-iq.ts`, `repositories/athleteiq-daily-iq.repository.ts`.
- Athlete IQ Pain Safety: `services/athleteiq-pain-safety.service.ts`, `lib/athleteiq-pain-safety.ts`, `repositories/athleteiq-pain-safety.repository.ts`.
- Athlete IQ Readiness Route: `services/athleteiq-readiness-route.service.ts`, `lib/athleteiq-readiness-route.ts`, `repositories/athleteiq-readiness-route.repository.ts`.
- Athlete IQ Daily Plan: `services/athleteiq-daily-plan.service.ts`, `lib/athleteiq-daily-plan.ts`, `repositories/athleteiq-daily-plan.repository.ts`.
- Athlete IQ sessions: `services/athleteiq-session.service.ts`, `lib/athleteiq-session.ts`, `repositories/athleteiq-session.repository.ts`.
- Athlete IQ calendar: `services/athleteiq-calendar.service.ts`, `lib/athleteiq-calendar.ts`, `repositories/athleteiq-calendar.repository.ts`.
- Athlete IQ reports: `services/athleteiq-daily-report.service.ts`, `lib/athleteiq-daily-report.ts`, `repositories/athleteiq-daily-report.repository.ts`.
- Athlete IQ stakeholder projections: `services/athleteiq-stakeholder.service.ts`, `lib/athleteiq-stakeholder.ts`.
- Athlete IQ twin projections: `services/athleteiq-twin-projection.service.ts`, `lib/athleteiq-twin-projection.ts`, `repositories/athleteiq-twin-projection.repository.ts`.
- Lite/manual modules for recovery, fuel, learning, and manual wearable entry: `services/athleteiq-lite-modules.service.ts`, `repositories/athleteiq-lite-modules.repository.ts`.
- Module maturity registry: `lib/athleteiq-modules.ts` correctly blocks future partner modules by default.

## Implemented But Disconnected Or Weak

### 1. Athlete IQ check-in does not run the daily engine

`POST /api/athleteiq/check-ins` validates, authorizes, persists the snapshot, and logs high-pain audit events. It does not automatically run:

- Daily IQ recalculation.
- Pain guardrail/alert update.
- Readiness route recalculation.
- Daily plan generation.
- Twin projection rebuild.
- Coach/team/parent projection refresh.
- Daily report refresh.
- Coach action queue creation.

Those capabilities exist as separate endpoints/services, but the product journey does not yet call them as one engine.

### 2. Habigoal product surface is not live-data backed

`components/product/habigoal/HabigoalExperience.tsx` uses client `useState` values for energy, soreness, mood, sleep, habits, and support action. It recalculates the visible score in memory and does not write to Atlas. This violates the live-product requirement.

### 3. Athlete IQ product surface is a projection dashboard, not full module workflow

`app/[locale]/athlete-iq/page.tsx` loads `getAthleteIqProductDashboardProjection()`, which reads athletes, teams, coach actions, Daily IQ, daily plans, and pain alerts. This is good as a first dashboard projection.

However, `components/product/athlete-iq/AthleteIqExperience.tsx` still has several local-only actions:

- Priority acknowledgement is local state only.
- Sidebar module links are anchor links, not full module pages.
- Service buttons do not route into working workflows.
- Team/club command is summary-only.

### 4. Older dashboard still competes with Athlete IQ

`app/[locale]/dashboard/page.tsx` renders `components/dashboard/MainDashboard.tsx`. That dashboard calls old endpoints:

- `/api/users`
- `/api/check-ins`
- `/api/athletes?metrics=true`
- `/api/settings`
- `/api/coach-actions`

It does not consume the newer AIQ daily engine endpoints. That is why an Athlete IQ dashboard can appear to behave like the Habigoal dashboard.

### 5. Product data exists, but journey data ownership is unclear

The codebase now has Atlas-backed product enrichment via `scripts/create-athleteiq-live-product-data.mjs`. That is useful for a client presentation only if it is positioned as admin-created live product records. It must not become hidden fallback data or user-visible fake state.

### 6. Wearables and external integrations are not live

These are not production-ready:

- `services/connectors/whoop.connector.ts` returns hard-coded payloads.
- `services/connectors/garmin.connector.ts` returns hard-coded payloads.
- `app/api/oauth/wearable/callback/route.ts` stores hard-coded vendor tokens and external user id.
- `app/api/v1/metrics/route.ts` returns hard-coded metrics.
- `app/api/athletes/[id]/devices/health-sync/route.ts` builds metrics but does not persist them and maps steps to the wrong canonical key.
- `app/api/performance/vald/webhook/route.ts` logs a payload but does not persist or normalize it.

### 7. Communication is not backed by persistence

`app/api/teams/[teamId]/messages/route.ts` creates a hard-coded response and logs the message. It does not store a message, enforce team visibility, or notify recipients.

### 8. Report facts can still expose weak module coverage

`lib/athleteiq-daily-report.ts` returns "No live facts available for this section." for modules without source data. That is safe as a boundary, but for a live product this should become a role-aware empty state with a next action and should not appear for active modules that the UI claims are ready.

### 9. Old AI engines are partially detached from AIQ contracts

`lib/engines/*` powers the legacy twin pipeline. The newer Athlete IQ daily loop uses `lib/athleteiq-*` contracts. Some old engines still contain simplified/defaulted assumptions. The product must either:

- retire those engines from current UI claims, or
- version and wire them into the AIQ engine deliberately.

## Missing Expected Functions

### Habigoal

- Mobile PWA shell with safe-area layout, no zoom, app-like navigation, and offline request recovery without fake data.
- Atlas-backed daily check-in submission from the Habigoal product surface.
- Atlas-backed habit plan, completion, streaks, and progress view.
- Client-safe guidance generated from persisted check-ins, habits, and trend windows.
- Language selector available on public/product surfaces.
- Login system visible and consistent across product domains.
- No selector or cross-product navigation on production domains.
- Role-aware empty states when the user has no records yet.

### Athlete IQ

- Dedicated Athlete IQ dashboard route that is not the Habigoal dashboard.
- Trainer command center for teams, individual athletes, alerts, plans, reports, and service delivery.
- Athlete-specific AIQ dashboard with Daily IQ, daily plan, readiness route, calendar, sessions, habits, reflection, and reports.
- Team management in the AIQ UI: create teams, assign athletes, assign trainers, view club-level readiness, and filter by role.
- Individual athlete management in the AIQ UI: profile, daily timeline, Daily IQ history, plan/tasks, alerts, sessions, reports, and notes.
- AIQ check-in UI that posts to `/api/athleteiq/check-ins`, not only the older `/api/check-ins`.
- One engine endpoint/service that runs the complete daily pipeline after check-in.
- Persistent coach action queue from AIQ alerts, not local acknowledgement only.
- Report generation UI using `/api/athleteiq/reports/daily/*`.
- Session workflow UI using `/api/athleteiq/sessions/*`.
- Calendar workflow UI using `/api/athleteiq/calendar/*`.
- Lite recovery/fuel/learning/manual wearable forms connected to their AIQ endpoints.
- Parent and team views using AIQ stakeholder projections.
- Domain-aware routing so Athlete IQ users never land on Habigoal dashboard.

### Shared Platform

- Public API metrics must read `canonical_metrics` with API key authorization, not return hard-coded rows.
- Wearable OAuth must use real provider exchanges and verified state tokens.
- Wearable ingestion must register provider normalizers and persist canonical metrics.
- Queue job `generate_ai_insight` must do real work or be removed from active claims.
- Team messaging must persist messages and enforce team access.
- VALD/performance webhooks must validate signatures, map metrics, persist raw payloads and canonical metrics, and update projections.
- I18N hardcoded placeholder/status strings must be removed from production UI.
- A11Y states must cover keyboard, text labels, focus states, status semantics, and mobile tap target sizing.

## Required Business Logic Engine

The daily AIQ engine should become one orchestrated service, for example `services/athleteiq-daily-engine.service.ts`.

Required pipeline:

1. Accept a signed-in user, athlete id, local date, timezone, mode, and source event.
2. Authorize access server-side.
3. Persist or read the AIQ check-in snapshot.
4. Upsert habit and training-load sources when supplied.
5. Recalculate Daily IQ.
6. Evaluate Pain Safety and upsert pain alert if needed.
7. Recalculate Readiness Route.
8. Generate or refresh Daily Plan while preserving completed task state.
9. Rebuild Athlete Twin Projection for athlete, coach, parent, and team views.
10. Build coach/team/parent projections.
11. Upsert coach action queue items for critical alerts and missing-data follow-up.
12. Optionally generate a daily report snapshot when the policy says reports are automatic.
13. Emit audit events and structured logs with correlation id, capability key, source versions, and missing-data labels.
14. Return a single `DailyEngineRun` payload with all created/updated ids and explicit partial failures.

The engine must be idempotent by athlete id, local date, mode, source event, and idempotency key. It must not fabricate healthy values when sources are missing.

## Research-Backed Business Logic Decisions

These decisions replace vague product logic with implementation rules grounded in sport-science consensus, peer-reviewed monitoring literature, and current athlete-management business patterns. They are decision-support rules, not diagnosis, medical clearance, or injury prediction.

### Daily readiness and check-in logic

Athlete IQ and Habigoal should use a short daily self-report as the primary daily input because subjective athlete self-report measures are practical, low-burden, and supported by athlete-monitoring literature. The required daily fields should be:

- sleep quality
- fatigue or energy
- soreness and pain
- stress
- mood
- confidence, focus, and motivation for Athlete IQ performance mode
- optional notes and pain location

Implementation rules:

- The daily check-in must be completable in under 60 seconds on mobile.
- Missing fields reduce confidence; they must not be converted to healthy defaults.
- Scores must be interpreted against the athlete's own rolling baseline when at least 14 days of data exist.
- A single bad input should not create a diagnosis; repeated poor signals should create a coach review action.
- Sleep is an important readiness input, but the app should use individualized sleep needs and trends instead of one universal target.

Research support:

- Saw, Main, and Gastin's systematic review supports subjective self-report measures for monitoring athlete wellbeing responses to training.
- Single-item team-sport wellbeing reviews show the common practical constructs are soreness, fatigue, sleep quality, stress, and mood.
- Walsh et al.'s athlete sleep consensus recommends individualized sleep handling and targeted support for athletes at risk of sleep inadequacy.

### Training load and session logic

The system should use session RPE multiplied by duration as the primary internal-load metric for live product workflows. This is simple enough for athletes and trainers, works across session types, and is supported by validation and review literature.

Implementation rules:

- Store `plannedLoad`, `athletePerceivedLoad`, `durationMinutes`, `rpe`, `sessionType`, and `completedLoadPoints`.
- Compare coach-planned load with athlete-perceived load after each session.
- Use 7-day and 28-day rolling load windows as context only.
- Flag acute load spikes, monotony, and missing debriefs as coach-review signals.
- Do not claim ACWR or any load ratio predicts injury. It can trigger "review load", not "injury risk probability".
- Any high load combined with poor sleep, high fatigue, or pain should route to amber or red review.

Research support:

- Foster et al. found session-RPE valid for quantifying a broad range of exercise training.
- Later reviews support session-RPE as a practical internal-load method.
- IOC load consensus supports monitoring training, competition, psychological load, wellbeing, and injury together.
- ACWR literature is contested; therefore AIQ should use load spikes as contextual flags rather than deterministic injury prediction.
- Coach-athlete perceived-load research shows the perceived dose can differ from intended coach load, especially in easy sessions, so both views must be stored.

### Pain safety and availability logic

Pain must be a guardrail, not just a score component. The app must not allow a high Daily IQ score to override high pain.

Implementation rules:

- Pain `0-3`: normal monitoring unless trend worsens.
- Pain `4-6`: amber route, conservative training recommendation, and pain follow-up task.
- Pain `>=7`: red route, high-intensity blocked, Daily IQ capped at `60`, coach/physio review created.
- Pain `>=5` on three days in a rolling three-day window: red route and recurring-pain coach review.
- Pain location, onset, training context, and post-session pain should be persisted for review.
- The copy must say "coach/physio review" or "recovery route"; it must not claim diagnosis.

Research support:

- IOC pain-management consensus states pain in elite athletes is multifactorial and should be handled with an evidence-informed approach that addresses pathophysiology, biomechanics, and psychosocial contributors.
- IOC injury/illness surveillance guidance supports structured recording and reporting to protect athlete health.

### Mental Edge logic

Mental Edge should support performance state and escalation workflows, not diagnose mental health disorders.

Implementation rules:

- Confidence, focus, motivation, stress, mood, and optional reflection form the Mental Edge signal.
- Repeated low confidence/focus/motivation or high stress creates a private coach-check-in action.
- Urgent self-harm or safeguarding content, if introduced later, must bypass scoring and route to a configured safeguarding process.
- Parent views must redact raw mental details and show only safe support guidance.
- Reports must state source confidence and redactions.

Research support:

- IOC mental-health consensus recognizes mental health symptoms and disorders among elite athletes and recommends comprehensive, integrated management.
- Mental-health surveillance guidance supports standardized recording and reporting, but not casual diagnosis by an app.

### Habit and behavior-change logic

Habigoal should use habit tracking as a behavior-support loop. Athlete IQ should use it as a consistency signal and a daily-plan input.

Implementation rules:

- Habit completion is always user-entered or trainer-entered; never inferred.
- Streaks are derived from dated records in Atlas.
- The app should use self-monitoring, goal setting, feedback, prompts/cues, and action planning.
- The product should recommend one next action, not a long advice list.
- Habit score should contribute to Daily IQ only when current-day habit data exists.
- Habit categories should remain stable and versioned: recovery, fuel, movement/training, mental, learning/life.

Research support:

- Habit-formation literature supports repeated action in stable contexts, prompts/cues, and simple sustainable behavior change.
- Digital behavior-change intervention reviews identify self-monitoring, goal setting, prompts/cues, and feedback as common techniques for habit formation.

### Wearables and external-data logic

Wearable and partner integrations should be treated as confidence-labelled data sources, not automatic truth.

Implementation rules:

- Until a provider has a real OAuth/token exchange, signed callback validation, raw payload persistence, normalizer, and canonical metric mapping, it must stay hidden or labelled manual/lite.
- HRV, resting heart rate, sleep duration, and sleep quality should be shown as rolling trends, not one-off daily verdicts.
- Wearable readings should never override high pain or explicit athlete self-report.
- Every metric must carry `source`, `normalisationVersion`, `rawPayloadId`, `confidence`, and consent status.
- The engine should use manual entry and validated wearable data through the same canonical metric contract.

Research support:

- Expert guidance on HRV monitoring supports routine/near-daily collection and trend interpretation rather than isolated readings.
- Wearable validation literature shows consumer devices can be useful but variable by metric and device, so product logic must preserve source confidence.

### Coach dashboard and business logic

The business value of Athlete IQ is not a score alone. The core product must help trainers and clubs make faster, safer, auditable decisions across teams and individual athletes.

Implementation rules:

- The trainer dashboard's first screen must answer:
  - who needs attention
  - why they need attention
  - what data was used
  - what the trainer should do next
  - whether the action was acknowledged, applied, resolved, or ignored
- Every alert must create or update a persistent coach action.
- Dense raw metrics should be secondary to priority queues, status distribution, and next action.
- Dashboard design should be co-created around trainer workflows, not only data availability.
- The system must support individual athlete drill-down and team/club aggregate views.
- All AI/recommendation copy must cite source labels, confidence, and algorithm version.

Business and research support:

- A 2024 scoping review found coaches and support staff use athlete monitoring mainly to reduce injury/illness, inform training programs, and improve or maintain performance; it also emphasizes monitoring as part of the bigger communication picture.
- Coach dashboard research supports building dashboards from scientific knowledge, sensor data, and coach/user requirements to support training decisions.
- Current AMS market leaders sell the same business category around centralized data, configurable dashboards, role-based views, integrations, workflows, and operational collaboration. AIQ should compete as a focused daily operating system, not as a disconnected score page.

### Daily IQ v2 scoring and routing specification

The best implementation is a guardrail-first daily engine:

1. Validate source data and confidence.
2. Apply safety guardrails.
3. Compute Daily IQ only when enough source weight exists.
4. Generate route and plan.
5. Create coach actions for risk, missing data, or follow-up.

Initial Daily IQ v2 component weights:

| Component | Weight | Inputs | Notes |
| --- | ---: | --- | --- |
| Wellness readiness | 35% | sleep quality, fatigue/energy, stress, mood | Primary daily self-report state. |
| Mental Edge | 20% | confidence, focus, motivation, stress | Redacted for parent view. |
| Load fit | 20% | session RPE x duration, planned-vs-perceived load, 7/28 day context | Review flag only; not injury prediction. |
| Habit consistency | 15% | dated habit completions by category | Dated records only. |
| Recovery support | 10% | soreness, sleep hours, validated HRV/resting HR trend when available | Manual or validated device sources. |

Confidence rules:

- `insufficient`: no same-day check-in or less than 40% source weight available; no Daily IQ number, only missing-data action.
- `low`: 40-59% source weight available; show Daily IQ with caution and block high-intensity recommendation.
- `medium`: 60-79% source weight available.
- `high`: 80%+ source weight available and no critical guardrail.

Guardrail rules:

- High pain or recurring pain overrides score and creates red route.
- Moderate pain creates amber route even if Daily IQ is high.
- Low confidence creates amber route and missing-data action.
- Acute load spike plus poor readiness creates amber route and coach review.
- Any red route blocks high-intensity session recommendation.

Readiness route rules:

- `green`: Daily IQ `>=75`, confidence medium/high, no pain cap, no unresolved critical coach action.
- `amber`: Daily IQ `50-74`, low confidence, moderate pain, load spike, or meaningful missing data.
- `red`: Daily IQ `<50`, high/recurring pain, unavailable/injured status, or critical coach action.

These thresholds are initial product thresholds. They must be versioned, tested, and recalibrated with real organization data once enough Atlas history exists.

## Prioritized Fix Plan

### P0 - Make the product honest and live

1. Create `services/athleteiq-daily-engine.service.ts` and an API route such as `POST /api/athleteiq/daily-engine/run`.
2. Implement Daily IQ v2 scoring, confidence, and guardrail-first routing in a versioned pure library.
3. Change `POST /api/athleteiq/check-ins` to call the daily engine after successful persistence.
4. Build an AIQ check-in UI that reads `/api/athleteiq/check-ins/schema` and posts to `/api/athleteiq/check-ins`.
5. Replace local acknowledgement in `AthleteIqExperience` with `POST /api/athleteiq/coach/alerts/[id]/actions`.
6. Replace Habigoal product-surface client state with Atlas-backed `/api/check-ins` and `/api/athletes/[id]/habits` or create Habigoal-specific thin endpoints over the same records.
7. Implement a dedicated Athlete IQ dashboard route and stop sending AIQ users into `components/dashboard/MainDashboard.tsx`.
8. Hide or disable any route that is still hard-coded, mocked, or not persisted:
   - `/api/v1/metrics`
   - wearable OAuth callback
   - Garmin/Whoop connector fetches
   - health sync
   - VALD webhook
   - team messages
9. Add host-based routing/middleware for product domains and remove cross-product navigation on those domains.
10. Replace all user-visible hardcoded English statuses/placeholders in production pages with message catalog keys.
11. Add integration tests for the daily engine: check-in -> Daily IQ -> Pain Safety -> Readiness Route -> Daily Plan -> Coach action/projection.

Acceptance criteria:

- A new AIQ check-in for an athlete creates/updates all downstream records for the same Budapest local date.
- AIQ dashboard shows team and athlete state from AIQ engine records, not old Habigoal-only calculations.
- Habigoal mobile surface persists check-in and habits to Atlas.
- No hard-coded wearable/metrics/message endpoint is reachable as an active product feature.
- `npm run i18n:audit`, `npm test`, `npm run typecheck`, and `npm run build` pass.

### P1 - Complete trainer, team, and athlete operations

1. Build AIQ trainer command center:
   - team list
   - athlete roster
   - priority queue
   - readiness distribution
   - service coverage
   - open alerts
   - plan/report shortcuts
2. Build individual AIQ athlete workspace:
   - Daily IQ card and history
   - readiness route
   - daily plan tasks
   - pain safety
   - habits
   - sessions
   - calendar
   - reflection
   - reports
3. Wire daily plan task completion to `/api/athleteiq/daily-plan/tasks/[id]`.
4. Wire session creation, state transitions, and debrief to `/api/athleteiq/sessions/*`.
5. Wire calendar creation/edit/delete to `/api/athleteiq/calendar/*`.
6. Wire reports page to `/api/athleteiq/reports/daily/*`.
7. Persist team messages or remove the feature from the active UI.
8. Add role-aware parent and team views from stakeholder projections.
9. Add a full product journey Playwright or equivalent browser test.

Acceptance criteria:

- Trainer can manage a team and inspect individual athletes without leaving Athlete IQ.
- Athlete-specific workflows use AIQ endpoints and Atlas records.
- Every active button in the AIQ UI either performs a real action or is absent.
- Parent/team data is redacted according to role.

### P2 - Integrations and advanced intelligence

1. Implement real provider OAuth for the first wearable provider.
2. Register provider normalizers and persist canonical metrics.
3. Replace `/api/v1/metrics` with canonical metric export from MongoDB Atlas.
4. Implement performance webhook persistence and metric normalization.
5. Decide whether old `lib/engines/*` become part of AIQ v2 or stay legacy-only.
6. Add model/engine version governance for every recommendation.
7. Keep CogLeague, GameFlow, and sports lab future modules behind explicit roadmap/future boundaries until partner data exists.

Acceptance criteria:

- External data is either live and persisted, or not shown as active.
- Canonical metrics can be traced to raw payload, source, normalizer version, and athlete consent.
- Advanced recommendations cite data sources, confidence, algorithm version, and human-review boundary.

## Data Rules

- Use MongoDB Atlas as the only operational database.
- No local database fallback.
- No baked-in healthy values.
- No hidden hard-coded product records.
- Missing information must appear as explicit missing data and a next action.
- Admin-created presentation records are allowed only when they are real Atlas documents and never masquerade as user-entered history.
- Scripts that enrich product records must be idempotent and environment-gated.

## Test Plan

Minimum validation for the next implementation branch:

```bash
npm run i18n:audit
npm test
npm run typecheck
npm run build
```

Additional required tests:

- `lib/athleteiq-daily-engine.test.ts`: full orchestration contract.
- API validation for `POST /api/athleteiq/daily-engine/run`.
- UI test for Habigoal mobile check-in + habit persistence.
- UI test for AIQ trainer dashboard loading team and individual athlete data.
- Regression test proving Athlete IQ dashboard does not route to Habigoal dashboard.
- Regression test proving future modules cannot be rendered as actionable active modules.

## Immediate Next Implementation Order

1. Build daily engine orchestration service and tests.
2. Implement Daily IQ v2 scoring and guardrail-first readiness routing.
3. Wire AIQ check-in POST into that engine.
4. Build real AIQ dashboard/workspace pages that consume the engine outputs.
5. Convert Habigoal mobile surface to live Atlas reads/writes.
6. Remove or block all non-live integration endpoints from active UI.
7. Add host-based product routing.
8. Run the full validation suite and push.

## Research Sources

- Saw AE, Main LC, Gastin PB. [Monitoring the athlete training response: subjective self-reported measures trump commonly used objective measures](https://bjsm.bmj.com/content/50/5/281).
- Foster C, Florhaug JA, Franklin J, et al. [A new approach to monitoring exercise training](https://pubmed.ncbi.nlm.nih.gov/11708692/).
- Soligard T, Schwellnus M, Alonso JM, et al. [IOC consensus statement on load in sport and risk of injury](https://pubmed.ncbi.nlm.nih.gov/27535989/).
- Impellizzeri FM, et al. [Acute:Chronic Workload Ratio: Is There Scientific Evidence?](https://pmc.ncbi.nlm.nih.gov/articles/PMC8138569/).
- Reardon CL, Hainline B, Aron CM, et al. [Mental health in elite athletes: IOC consensus statement](https://pubmed.ncbi.nlm.nih.gov/31097450/).
- Hainline B, Turner JA, Caneiro JP, et al. [IOC consensus statement on pain management in elite athletes](https://pubmed.ncbi.nlm.nih.gov/28827314/).
- IOC Injury and Illness Epidemiology Consensus Group. [Methods for recording and reporting epidemiological data on injury and illness in sport 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7146946/).
- Walsh NP, Halson SL, Sargent C, et al. [Sleep and the athlete: 2021 expert consensus recommendations](https://pubmed.ncbi.nlm.nih.gov/33144349/).
- Timmerman WP, Abbiss CR, Lawler NG, Stanley M, Raynor AJ. [Athlete monitoring perspectives of sports coaches and support staff: a scoping review](https://journals.sagepub.com/doi/10.1177/17479541241247131).
- Van der Zwaard S, et al. [Co-operative design of a coach dashboard for training monitoring and feedback](https://pmc.ncbi.nlm.nih.gov/articles/PMC9737713/).
- Inoue A, Bunn PS, do Carmo EC, et al. [Internal training load perceived by athletes and planned by coaches](https://link.springer.com/article/10.1186/s40798-022-00420-3).
- Gardner B, Lally P, Wardle J. [Making health habitual: the psychology of habit-formation](https://pmc.ncbi.nlm.nih.gov/articles/PMC3505409/).
- Wang Y, Fadhil A, Reiterer H. [Digital behavior change intervention designs for habit formation](https://pmc.ncbi.nlm.nih.gov/articles/PMC11161714/).
- Miller DJ, Sargent C, Roach GD. [Validation of six wearable devices for sleep, heart rate, and heart rate variability](https://www.mdpi.com/1424-8220/22/16/6317).
- Teamworks. [Athlete Management System](https://teamworks.com/ams/).
- Kitman Labs. [Athlete Monitoring Systems vs. Athlete Management Systems](https://www.kitmanlabs.com/blog/athlete-monitoring-systems-vs-athlete-management-systems/).
