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
- `/api/session-plans`
- `/api/teams`
- `/api/users`
- `/api/settings`

Compatibility endpoint names:

- `/api/children`
- `/api/assessments`

Compatibility endpoints remain because the underlying collections and older records still use those names.

### Repositories

Database access is isolated in `repositories/*`.

Important repositories:

- `child.repository.ts`: athlete profile persistence
- `assessment.repository.ts`: check-in persistence
- `habit-records.repository.ts`: habit persistence
- `coach-actions.repository.ts`: trainer action trace
- `session-plans.repository.ts`: weekly planning persistence
- `team.repository.ts`: team membership
- `user.repository.ts`: local authorization users
- `settings.repository.ts`: global settings

### Services

Services hold cross-route application logic:

- `assessment.service.ts`: check-in create/update/delete/restore behavior
- `auth-service.ts`: DoneIsBetter OAuth calls
- `settings-service.ts`: default settings and settings shape
- `user-service.ts`: user-facing user model helpers

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

Middleware in `middleware.ts` protects page routes when `SURVEY_ENFORCE_AUTH=true`. API route handlers enforce roles with `requireRole`.

### Authentication

DoneIsBetter SSO is the identity provider.

Local authorization is stored in MongoDB `users`.

Session state is stored in the signed `survey_session` cookie. `AUTH_SECRET` is required for production session verification.

### Data Model

Current collections:

- `children`: athlete profiles
- `assessments`: check-ins
- `habit_records`: habit state by athlete and date
- `coach_actions`: trainer action state by athlete/date/recommendation
- `session_plans`: weekly plans by week and scope
- `teams`: trainer and athlete membership
- `users`: approved SSO users and local roles
- `settings`: global app settings

Product code should use athlete/check-in terminology even when a repository or collection still carries a legacy name.

## Public Content

News posts are stored in `content/news/posts.json`.

Rules:

- a post is visible only in locales where exact localized content exists
- no cross-locale fallback for public news
- release-note automation should generate English first and add other locales deliberately

Legal pages are public and must remain accessible when auth is enforced.

## Reporting

Reports are generated client-side with `jsPDF` and `jspdf-autotable`.

Report code must use localized message catalogs for user-facing labels. Mixed-language report surfaces are a known quality risk and should be checked during release validation.

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
- i18n coverage requires ongoing audit
- team invitations are not yet outbound email invitations
- centralized forms are the intended direction, but the full rollout is not complete on `main`
