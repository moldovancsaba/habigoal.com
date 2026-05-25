# Architecture

Habigoal is a Next.js App Router application backed by MongoDB Atlas. The product boundary is role-aware: athletes operate on their own data, trainers operate on team-scoped athlete data, and admins manage organization data.

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

Rules:

- no local/demo/offline fallback data
- missing sources remain nullable and are exposed in `sourceCompleteness`
- fixture parity tests in `lib/operating-score.test.ts` freeze score version behavior
- scoring changes must update `OPERATING_SCORE_VERSION`, fixtures, API docs, and issue/project state
- habit-weight changes must update `HABIT_SCORE_VERSION`, habit scorer tests, API docs, and project state

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

## Automation

`.codex/` contains the Codex automation control plane:

- agents
- heartbeat specs
- memory
- policies

Autonomous loops should use branch-and-PR delivery. Direct pushes to `main` are reserved for explicit human-directed work.

## Current Architecture Risks

- legacy collection names still exist
- some feature work exists on branches and is not yet part of `main`
- i18n coverage requires ongoing audit with `npm run i18n:audit`
- team invitations are not yet outbound email invitations
- centralized forms are the intended direction, but the full rollout is not complete on `main`
