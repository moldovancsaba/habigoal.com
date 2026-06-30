# Architecture

Habigoal is a Next.js App Router application backed by MongoDB Atlas. The product boundary is role-aware: athletes operate on their own data, trainers operate on team-scoped athlete data, and admins manage organization data.

The relationship between Habigoal and Athlete IQ is governed by [Product Surface Shared Athlete Profile Contract](product-surface-shared-athlete-profile-contract.md): Habigoal is the filtered mobile home surface, Athlete IQ is the professional team and performance surface, and both use the same canonical athlete identity, profile, and history with separate product entitlements.

## Layers

### App Routes

User-facing pages live under `app/[locale]`.

- public routes: landing, news, legal pages
- athlete routes: `/athletes`, `/athletes/[id]`
- trainer/admin dashboard routes: `/dashboard/*`

Locale routing is handled by next-intl. Supported locales are `en`, `hu`, `es`, `de`, `ar`, and `he`.

### API Routes

API routes live under `app/api`.

Product-facing endpoint names:

- `/api/athletes`
- `/api/check-ins`
- `/api/coach-actions`
- `/api/athletes/[id]/training-load`
- `/api/session-plans`
- `/api/teams`
- `/api/users`
- `/api/settings`

Compatibility endpoint names:

- `/api/children`
- `/api/assessments`

Compatibility endpoints remain because the underlying collections and older records still use those names. New UI and API clients should prefer product-language endpoints.

### Repositories

Database access is isolated in `repositories/*`.

Important repositories:

- `athlete.repository.ts`: athlete-facing alias over profile persistence
- `child.repository.ts`: compatibility athlete profile persistence for the `children` collection
- `check-in.repository.ts`: check-in-facing alias over record persistence
- `assessment.repository.ts`: compatibility check-in persistence for the `assessments` collection
- `habit-records.repository.ts`: habit persistence
- `training-load.repository.ts`: standalone training-load ledger persistence
- `coach-actions.repository.ts`: trainer action trace
- `session-plans.repository.ts`: weekly planning persistence
- `team.repository.ts`: team membership
- `user.repository.ts`: local authorization users
- `settings.repository.ts`: global settings

### Services

Services hold cross-route application logic:

- `check-in.service.ts`: check-in-facing service alias
- `assessment.service.ts`: compatibility check-in create/update/delete/restore behavior
- `auth-service.ts`: DoneIsBetter OAuth calls
- `settings-service.ts`: default settings and settings shape
- `user-service.ts`: user-facing user model helpers

### Scoring Contracts

`lib/operating-score.ts` owns the daily athlete operating metrics contract used by athlete history APIs and future chart/report consumers. It combines persisted check-ins, daily habits, recovery signals, training load, and performance pillars into a versioned `DailyOperatingMetrics` payload.

`lib/athlete-habits.ts` owns habit definitions, normalization, category weights, and `HabitScoreSummary`. The current weighted categories are training `0.40`, recovery `0.30`, wellness `0.20`, and learning `0.10`.

`lib/empty-state.ts` owns role-aware empty-state action resolution. UI surfaces render those actions through `components/ui/StateBlock.tsx` until the GDS runtime package blocker is removed and the component can be replaced by the canonical GDS state primitive.

Rules:

- no local/demo/offline fallback data
- missing sources remain nullable and are exposed in `sourceCompleteness`
- fixture parity tests in `lib/operating-score.test.ts` freeze score version behavior
- scoring changes must update `OPERATING_SCORE_VERSION`, fixtures, API docs, and issue/project state
- habit-weight changes must update `HABIT_SCORE_VERSION`, habit scorer tests, API docs, and project state
- empty states must explain the reason and next safe action without injecting sample data or revealing inaccessible records

### Access Control

The active role model is:

- `athlete`
- `trainer`
- `admin`

`lib/access.ts` owns role normalization, primary-role detection, and athlete access resolution.

Important rules:

- athlete access resolves to one linked `athleteId`
- trainer access resolves from team membership
- admin access is organization-wide
- legacy `conductor` and `observer` normalize for migration compatibility

Middleware in `middleware.ts` protects page routes when `HABIGOAL_ENFORCE_AUTH=true`. API route handlers enforce roles with `requireRole`.

### Authentication

DoneIsBetter SSO is the identity provider.

Local authorization is stored in MongoDB `users`.

Session state is stored in the signed `habigoal_session` cookie. `AUTH_SECRET` is required for production session verification.

### Data Model

Current collections:

- `children`: athlete profiles
- `assessments`: check-ins
- `habit_records`: habit state by athlete and date
- `training_load_records`: standalone duration, RPE, source, and load-point ledger entries
- `coach_actions`: trainer action state by athlete/date/recommendation
- `session_plans`: weekly plans by week and scope
- `teams`: trainer and athlete membership
- `users`: approved SSO users and local roles
- `settings`: global app settings

Product code should use athlete/check-in terminology even when a repository, type, payload, or collection still carries a compatibility name.

Compatibility fields still present in wire or persisted records include `child`, `childId`, `surveyId`, `conductor`, and `observers`. These are not product language and should not appear in new UI copy.

## Public Content

News posts are stored in `content/news/posts.json`.

Rules:

- a post is visible only in locales where exact localized content exists
- no cross-locale fallback for public news
- release-note automation should generate English first and add other locales deliberately

Legal pages are public and must remain accessible when auth is enforced.

## Reporting

Reports are generated client-side with `jsPDF` and `jspdf-autotable`.

Report code must use localized message catalogs for user-facing labels. Mixed-language report surfaces are a known quality risk and should be checked with `npm run i18n:audit` plus manual RTL/report validation before release.

**Report provenance (RPT-005, #200).** Every `AthleteReport` carries a structured `provenance` block built by `buildReportProvenance` in `services/reporting.service.ts`: per-twin-dimension sources/confidence/update dates, FMS presence, coach-baseline-notes presence, data freshness, and an `overallConfidence` band. The band is the weakest contributing dimension combined with the recommendation confidence, downgraded one step when the twin is stale — it never overstates, and is `none` when no source contributed. `provenanceToSourceNotes` renders this as the human-readable `sourceDataNotes` (the trailing `Confidence: <band>` line is a stable contract consumed by the reports-hub badge and the parent-safe projection #261). The reports hub shows the notes in an accessible disclosure and the confidence badge; PDF/CSV/JSON exports carry the same provenance.

## Operating surfaces and access model

The active entity model is `athlete`, `trainer`, and `admin`: athlete access is self-scoped, trainer access is team-scoped, and admin access owns settings plus team management. DoneIsBetter SSO is the intended authentication boundary, while local role authorization is owned by the `users` collection.

Role-aware route gating must exist in the shell layer as well as in the APIs — athletes must not browse coach/admin dashboard routes, and trainers must not reach admin settings routes by URL.

Key surfaces:

- `/dashboard` — coach triage and recommendation surface.
- `/dashboard/planning` — coach weekly planning from live readiness/load state; weekly plans persist in `session_plans`. Reusable **session blueprints** (TRN-002, #83) — ordered, timed drill sets per variant (standard/controlled/recovery) — live in `lib/session-blueprints.ts` and are served read-only at `GET /api/session-blueprints`. A pure, client-only timer reducer (`lib/session-timer.ts`, play/pause/skip/tick/reset) drives execution; only the final debrief is persisted (via the existing session-lifecycle debrief route).
- `/dashboard/athletes/[id]` — athlete operating surface, segmented into dedicated function areas (Input · Plan · Analysis · Records) via a `SegmentedControl`, so each function has its own focused view instead of one crammed scroll. The same component backs the athlete app's own profile (`/athletes/[id]`) via `isAthleteApp`; athletes land on Input, trainers on Analysis.
- `/dashboard/settings` — admin operations: users, teams, restore/governance, company/legal profile, standards, and alerting.
- `/athletes` — public athlete app entry; `/athletes/[id]` stays athlete-facing and must not leak coach/admin controls. When auth is enforced, `/athletes` redirects signed-in athletes to their own profile and redirects trainer/admin users into dashboard athlete management.
- `/news` — public release-note surface; posts render only in locales with exact localized content.

Governance invariants: user-rights changes are admin-owned; the system must not allow self-removal of the active admin or deletion/demotion of the final admin account. Product-facing language avoids legacy `child`, `assessment`, `conductor`, and `observer` wording except when documenting compatibility layers.

## Product spine

The current product spine, which work should sharpen before broad platform expansion:

1. coach command center
2. athlete trend interpretation
3. athlete daily operating dashboard
4. habit adherence and routine scoring
5. session planning and weekly operating summaries

Supporting persistence: `assessments` (daily check-ins / computed readiness), `children` (athlete identity), `coach_actions` (coach response traceability), `habit_records` (routine adherence), `session_plans` (weekly planning), `teams` (membership scoping), `users` (SSO authorization / roles), and `settings` (company/legal, standards, alerting, governance).

## Trust & insight engines

Three pure, deterministic, unit-tested engines keep derived figures honest and are
reused across surfaces (no fabricated data, ever):

- **Data confidence** (`lib/data-confidence.ts`, #253) grades every derived figure
  as `high | medium | low | none` from real sample size, source count, and
  freshness — surfaced via `components/insights/ConfidenceBadge.tsx`.
- **Explainability** (`lib/explainability.ts`, #254) exposes a versioned catalog of
  deterministic rules and returns the exact input → rule → output bundle that
  fired — surfaced via `components/insights/ExplanationPanel.tsx`.
- **Parent-safe report** (`lib/parent-safe-report.ts`, #261) projects a coach report
  into a redacted, privacy-respecting parent summary with an honest encouragement
  tone driven by the confidence band.

Wired into the athlete operating surface (`/dashboard/athletes/[id]`) and the
Reports hub (`/dashboard/reports`). Full contract: [Trust & Insight Engines](trust-and-insights.md).

## Delivery workflow

Changes are delivered through feature branches and pull requests. Local quality gates (`npx tsc --noEmit`, `npm run i18n:audit`, `npm run build`, `npx vitest run`) must pass before merge, alongside human review. Direct pushes to `main` are reserved for explicit human-directed work — no force pushes or shared-history rewrites.

## Current Architecture Risks

- legacy collection names still exist
- some feature work exists on branches and is not yet part of `main`
- i18n coverage requires ongoing audit with `npm run i18n:audit`; the current gate covers catalog parity, news locale completeness, known legacy copy leaks, and hardcoded critical UI copy in athlete check-in/brand surfaces
- team invitations are not yet outbound email invitations
- centralized forms are the intended direction, but the full rollout is not complete on `main`

## Canonical Metric Layer (Athlete IQ 2.0)
The canonical metric schema normalises multi-source athlete data (check-ins, wearables, etc.) into a consistent format prior to digital twin integration and AI analysis.
- **Types**: `types/canonical-metric.ts`
- **Normalisation**: `lib/normalise-metric.ts`
- **Storage**: `canonical_metrics` and `raw_metrics` collections

### Digital Twin updater (DTW-002, #202)
`lib/twin-updater.ts` updates the twin from every source: daily check-ins and device data (via canonical metrics → `updateTwinFromMetrics`, covering recovery, performance, physical, and cognitive dimensions), AI engine outputs (`updateTwinFromEngineOutputs`), and vision (`updateTechnicalFromVision`). Each dimension records the contributing `sources` so provenance stays traceable, and `appendHistory` snapshots **all five** dimensions per date (deduped by `(date, dimension)`, bounded to the most recent 90 distinct dates) — engine-driven changes now leave a history trail and credit the `ai_inference` source, where previously only recovery + performance were captured.
