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

## Prioritized Fix Plan

### P0 - Make the product honest and live

1. Create `services/athleteiq-daily-engine.service.ts` and an API route such as `POST /api/athleteiq/daily-engine/run`.
2. Change `POST /api/athleteiq/check-ins` to call the daily engine after successful persistence.
3. Build an AIQ check-in UI that reads `/api/athleteiq/check-ins/schema` and posts to `/api/athleteiq/check-ins`.
4. Replace local acknowledgement in `AthleteIqExperience` with `POST /api/athleteiq/coach/alerts/[id]/actions`.
5. Replace Habigoal product-surface client state with Atlas-backed `/api/check-ins` and `/api/athletes/[id]/habits` or create Habigoal-specific thin endpoints over the same records.
6. Implement a dedicated Athlete IQ dashboard route and stop sending AIQ users into `components/dashboard/MainDashboard.tsx`.
7. Hide or disable any route that is still hard-coded, mocked, or not persisted:
   - `/api/v1/metrics`
   - wearable OAuth callback
   - Garmin/Whoop connector fetches
   - health sync
   - VALD webhook
   - team messages
8. Add host-based routing/middleware for product domains and remove cross-product navigation on those domains.
9. Replace all user-visible hardcoded English statuses/placeholders in production pages with message catalog keys.
10. Add integration tests for the daily engine: check-in -> Daily IQ -> Pain Safety -> Readiness Route -> Daily Plan -> Coach action/projection.

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
2. Wire AIQ check-in POST into that engine.
3. Build real AIQ dashboard/workspace pages that consume the engine outputs.
4. Convert Habigoal mobile surface to live Atlas reads/writes.
5. Remove or block all non-live integration endpoints from active UI.
6. Add host-based product routing.
7. Run the full validation suite and push.
