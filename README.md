# Habigoal

Habigoal is a daily athlete support workspace for athletes, trainers, and admins. It captures daily readiness, habits, training load, coach actions, weekly plans, and operational reports in one role-aware web app.

## Current Product Surface

- Public landing page at `/{locale}` with explicit product entry cards for Habigoal and Athlete IQ.
- Product surfaces:
  - Habigoal at `/{locale}/habigoal` for client wellbeing, habit tracking, status capture, and lightweight guidance.
  - Athlete IQ at `/{locale}/athlete-iq` for coaches, academies, professional dashboards, and advanced services.
- Public news and release notes at `/{locale}/news`.
- Public legal pages at `/{locale}/legal/gtc` and `/{locale}/legal/privacy`.
- Athlete app at `/{locale}/athletes` and `/{locale}/athletes/[id]`.
- Trainer dashboard at `/{locale}/dashboard`.
- Daily check-in flow at `/{locale}/dashboard/assessment`.
- Athlete management and athlete detail views at `/{locale}/dashboard/athletes`.
- Check-in record list and record detail views at `/{locale}/dashboard/records`.
- Weekly session planning at `/{locale}/dashboard/planning`.
- Admin settings, users, teams, restore bin, and governance views at `/{locale}/dashboard/settings`.

## Shipped Capabilities

- Daily athlete check-in with nine readiness signals across physical readiness, mental balance, and sport brain.
- Athlete profiles with longitudinal history, readiness trends, habits, training load, memory summaries, and weekly operating summaries.
- Persisted habit records through the `habit_records` collection and `/api/athletes/:id/habits`, with optional weighted summaries via `summary=true`.
- Training-load capture in check-ins plus standalone `/api/athletes/:id/training-load` ledger records with weekly load zones.
- Coach command center with priority athletes, missed check-ins, readiness buckets, next-best-action recommendations, session blueprints, escalation digest, and coach action tracking.
- Persisted coach action status through the `coach_actions` collection and `/api/coach-actions`.
- Weekly session planning through `/dashboard/planning`, persisted in `session_plans`, and reflected on athlete detail pages.
- PDF/report export surfaces for athlete and check-in records.
- Phase 1 product split between Habigoal and Athlete IQ with a shared function registry exposed via `/api/product-surfaces`.
- Shared Baseline route and API compatibility preserved while splitting runtime UI surfaces.
- Public weekly news surface backed by `content/news/posts.json`, with locale-specific fail-closed rendering.
- DoneIsBetter SSO integration with local user authorization.
- Role model: `athlete`, `trainer`, and `admin`.
- Athlete users are scoped to their linked athlete profile.
- Trainer users are scoped through team membership.
- Empty athlete surfaces use role-aware `StateBlock` guidance and must not rely on sample/demo fallback data.
- Admin users manage users, teams, settings, restore workflows, and governance data.
- Team management through the `teams` collection and `/api/teams`.
- Soft-delete and restore workflows for athletes and check-ins.
- Multilingual UI for `en`, `hu`, `es`, `de`, `ar`, and `he`, including RTL layout support for Arabic and Hebrew.
- Critical athlete check-in copy is message-catalog driven and covered by the i18n audit hardcoded-copy gate.
- Codex automation control plane under `.codex/` for audit, planning, implementation, and documentation loops.

## Documentation

- [API Reference](docs/api.md)
- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md)
- [Design System](docs/design-system.md)
- [General Design System Adoption](docs/gds-adoption.md)
- [GDS Verification Matrix](docs/gds-verification-matrix.md)
- [GDS Adoption Manifest](gds-adoption.json)
- [Definition of Done](docs/dod.md)
- [User Guide](docs/user-guide.md)
- [Settings Guide](docs/settings-guide.md)
- [Legal and Company Info](docs/legal.md)
- [SSO Setup](docs/sso-setup.md)
- [Product Roadmap](ROADMAP.md)
- [Athlete IQ Gap Analysis](docs/athlete-iq-gap-analysis-2026-05-25.md)
- [I18n Audit](docs/i18n-audit-2026-05-12.md)
- [Codex Automation Architecture](.codex/memory/architecture.md)

## Technology

Package ranges are defined in `package.json`; the active lockfile currently resolves to:

- Next.js: `15.5.19`
- React: `19.2.5`
- TypeScript: `5.9.3`
- MongoDB driver: `6.21.0`
- next-intl: `4.9.2`
- Mantine: `8.3.18`
- General Design System: runtime package is `@doneisbetter/gds`, with `@doneisbetter/gds-eslint-config` and `@doneisbetter/gds-compliance` for governance. Habigoal currently consumes the live npm package line at `^3.4.7`.
- Node.js: `22.x`
- App version: `0.5.1`

## Local Development

```bash
cp .env.example .env
npm install
npm run db:ping
npm run db:setup
npm run db:seed-showcase
npm run dev
```

The default Next.js dev server runs on `http://localhost:3000`.

## Required Environment Variables

```txt
MONGODB_URI=
MONGODB_DB=habigoal
MONGODB_APP_NAME=habigoal
IMGBB_API_KEY=

APP_URL=https://habigoal.com
SSO_CLIENT_ID=
SSO_CLIENT_SECRET=
SSO_BASE_URL=https://sso.doneisbetter.com
SSO_REDIRECT_URI=https://habigoal.com/api/oauth/callback
SSO_LOGOUT_URL=
AUTH_SECRET=
HABIGOAL_ENFORCE_AUTH=true
```

`HABIGOAL_ENFORCE_AUTH=false` is useful for local open-mode development. Production should run with `HABIGOAL_ENFORCE_AUTH=true`.

### Product Surfaces

- Habigoal: `/{locale}/habigoal`
- Athlete IQ: `/{locale}/athlete-iq`
- Product registry endpoint: `/api/product-surfaces`

## Validation Commands

```bash
npm run lint
npm run test
npm run gds:audit
npm run gds:compliance
npm run i18n:audit
npm run version:audit
npm run build
npm run typecheck
npm run db:ping
```

`npm run i18n:audit` is required when UI copy, reports, public news, or locale files change. It checks catalog key parity, ICU placeholder parity, public news locale completeness, known legacy copy leaks, and hardcoded critical UI copy in the athlete check-in and brand surfaces. `npm run version:audit` verifies app-version truth across `package.json`, `package-lock.json`, `lib/app-version.ts`, README, and legal docs. `npm run semantic:audit` is a targeted design-system cleanup check. `npm run gds:audit` is the strict GDS-only readiness check and must pass with the manifest set to `governed`. `npm run gds:compliance` runs the shared GDS compliance package and is a release gate. `npm run typecheck` is the standalone TypeScript validation path. `npm run build` also performs Next.js compile and type validation.

Design authority lives in `/Users/Shared/Projects/general-design-system`. Habigoal-local design docs describe only adapter details, migration state, validation commands, and approved exceptions.

## Data Collections

- `children`: athlete profiles. This is a compatibility collection name; product-facing code and docs should say athlete.
- `assessments`: daily check-ins and legacy-compatible records. This is a compatibility collection name; product-facing code and docs should say check-in.
- `habit_records`: athlete habit adherence records.
- `coach_actions`: trainer acknowledgements and applied recommendation records.
- `session_plans`: persisted weekly planning records.
- `teams`: team membership for trainers and athletes.
- `users`: local authorization records linked to SSO identity.
- `settings`: global settings, company/legal profile, alerting thresholds, and restore/governance state.

## Authentication And Access

SSO identifies the person. Habigoal authorizes the person through the local `users` collection.

- Athletes land in the athlete app and can access only their linked athlete profile, history, habits, and check-ins.
- Trainers land in the trainer dashboard and manage athletes through team membership.
- Admins land in settings and manage users, teams, global settings, restore workflows, and governance views.

Middleware protects personal-data pages when `HABIGOAL_ENFORCE_AUTH=true`. Public pages are limited to the landing page, news, and legal pages.

## Codex Automation

The repository includes a Codex-first automation control plane under `.codex/`.

- GitHub stores source control, issues, pull requests, and project state.
- Codex handles audit, planning, implementation, and documentation loops.
- Autonomous loops use branch and PR delivery.
- Direct autonomous pushes to `main` are not part of the unattended automation policy.

## Documentation Maintenance Rules

- Product-facing documentation uses `athlete`, `trainer`, `admin`, `team`, `check-in`, and `report`.
- Legacy terms such as `child`, `assessment`, `conductor`, `observer`, `survey`, and `kidex` are documented only when explaining compatibility layers, migration helpers, or persisted collection names.
- User-facing UI copy belongs in `messages/*.json` or structured localized content.
- Public news posts must remain locale-specific and fail closed when a locale is missing.

## GitHub Project Bootstrap

The repository includes scripts and config for creating or syncing a project board:

```bash
./scripts/bootstrap-gh-project-board.sh moldovancsaba habigoal.com
```

The board definition lives in `config/gh-project-board.json`.
