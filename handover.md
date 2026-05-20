# Habigoal Handover

This document describes the current implementation state of Habigoal and the main operational boundaries for future work.

## Stack

- Framework: Next.js App Router
- UI: Mantine with the Habigoal design system
- Language: TypeScript
- i18n: next-intl with locale-prefixed routes
- Database: MongoDB Atlas through the MongoDB Node driver
- Auth: DoneIsBetter SSO plus local authorization in `users`
- Runtime: Node.js `22.x`
- Deployment target: Vercel

The lockfile currently resolves the core runtime to Next.js `15.5.15`, React `19.2.5`, TypeScript `5.9.3`, MongoDB driver `6.21.0`, next-intl `4.9.2`, and Mantine `8.3.6`.

## Current Product Model

Habigoal has three active user entities:

- `athlete`: self-service user linked to one athlete profile.
- `trainer`: coach-facing user scoped to teams and assigned athletes.
- `admin`: organization user with settings, users, teams, restore, and governance access.

Legacy terms still exist in storage and compatibility layers:

- `children` collection means athlete profiles.
- `assessments` collection means check-ins.
- legacy `conductor` role normalizes to `trainer`.
- legacy `observer` role normalizes to `athlete`.

Product copy and new code should use `athlete`, `trainer`, `admin`, and `check-in`.

## Application Routes

Public routes:

- `/{locale}` landing page
- `/{locale}/news`
- `/{locale}/news/[slug]`
- `/{locale}/legal/gtc`
- `/{locale}/legal/privacy`

Protected personal-data routes:

- `/{locale}/athletes`
- `/{locale}/athletes/[id]`
- `/{locale}/dashboard`
- `/{locale}/dashboard/assessment`
- `/{locale}/dashboard/athletes`
- `/{locale}/dashboard/athletes/[id]`
- `/{locale}/dashboard/records`
- `/{locale}/dashboard/records/[id]`
- `/{locale}/dashboard/planning`
- `/{locale}/dashboard/settings`

When auth is enforced, athletes are redirected to their own athlete profile, trainers are kept out of admin settings, and trainers/admins are redirected away from public athlete routes into dashboard athlete management.

## Main Features

### Athlete App

- Athlete entry at `/{locale}/athletes`.
- Signed-in athletes land on their own `/{locale}/athletes/[id]`.
- Athlete detail includes daily operating state, trends, habits, training load, memory summary, weekly summary, and current weekly plan context.
- Athlete users can perform their own check-ins and habit tracking only for their linked profile.

### Trainer Dashboard

- Coach command center on `/{locale}/dashboard`.
- Priority athlete queue, missed check-ins, support alerts, readiness buckets, next-best-action recommendations, session blueprint suggestions, and coach activity summary.
- Coach actions persist in `coach_actions`.

### Daily Check-In

- Check-in flow at `/{locale}/dashboard/assessment`.
- Stores readiness scores, notes, consent flags, session context, training load, and attachments.
- Supports create and update flows.
- Trainer/admin users can select athletes; athlete users are scoped to their own linked profile.

### Athlete Management

- Trainer/admin athlete management at `/{locale}/dashboard/athletes`.
- Athlete profiles include identity fields, baseline fields, consent flags, soft-delete/restore behavior, metrics, and history.
- `/api/athletes` is the product-language alias over the legacy `/api/children` implementation.

### Planning

- Weekly planning route at `/{locale}/dashboard/planning`.
- Uses readiness, missing check-ins, location scope, and load state to generate weekly planning guidance.
- Saves plans through `/api/session-plans` into `session_plans`.
- Saved plans appear back on athlete detail pages where scope matches.

### Users And Teams

- Admin settings manage approved users, linked athlete accounts, team assignments, and restore/governance views.
- `/api/users` is admin-owned for writes and protects the final admin.
- `/api/teams` lets admins create/update/delete teams and lets trainers read their assigned teams.

### News

- Public news lives at `/{locale}/news`.
- Posts are stored in `content/news/posts.json`.
- News is fail-closed by locale: a post only renders in a locale if that exact locale content exists.

### Reports

- Athlete and record pages support PDF/report exports.
- Report copy must use locale message files, not inline strings.
- PDF generation is client-side with `jsPDF` and `jspdf-autotable`.

## Authentication

Production SSO uses DoneIsBetter:

- login starts at `/api/auth/login`
- callback completes at `/api/oauth/callback`
- logout uses `/api/auth/logout`
- session state is stored in the signed `survey_session` cookie

Local authorization remains in the `users` collection. If no users exist, the first successful SSO login bootstraps as `admin`; after that, emails must be approved locally.

## Data Collections

- `children`: athlete profiles
- `assessments`: check-ins
- `habit_records`: habit records
- `coach_actions`: trainer action trace
- `session_plans`: weekly plans
- `teams`: team membership
- `users`: local authorization records
- `settings`: global settings and legal/company data

## Documentation State

Canonical docs:

- `README.md`: current product and setup overview
- `docs/architecture.md`: current application architecture and data boundaries
- `docs/api.md`: API reference
- `docs/deployment.md`: deployment and environment setup
- `docs/sso-setup.md`: SSO client setup
- `docs/design-system.md`: live design-system implementation
- `docs/dod.md`: definition of done
- `ROADMAP.md`: current roadmap
- `.codex/memory/architecture.md`: Codex automation architecture and operating constraints

## Current Risks

- Some older files and database collections still use legacy `child` and `assessment` names. Product-facing code should use aliases or facade modules.
- i18n coverage has improved, but hardcoded strings still need regular audit before release.
- The centralized form-system work exists on a feature branch and should not be documented as shipped on `main` until merged.
- Team invitations are still admin-managed records, not outbound email invites.
- GitHub Project state can drift from merged work if branches are merged manually without issue/board updates.

## Validation

Run before merging meaningful changes:

```bash
npm run lint
npm run test
npm run build
npm run typecheck
```

For database/env validation:

```bash
npm run db:ping
```
