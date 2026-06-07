# Habigoal Handover

This document describes the current implementation state of Habigoal and the main operational boundaries for future work.

## Stack

- Framework: Next.js App Router
- UI: Mantine through the governed `@doneisbetter/gds` runtime
- Language: TypeScript
- i18n: next-intl with locale-prefixed routes
- Database: MongoDB Atlas through the MongoDB Node driver
- Auth: DoneIsBetter SSO plus local authorization in `users`
- Runtime: Node.js `22.x`
- Deployment target: Vercel

The lockfile currently resolves the core runtime to Next.js `15.5.15`, React `19.2.5`, TypeScript `5.9.3`, MongoDB driver `6.21.0`, next-intl `4.9.2`, Mantine `8.3.6`, and GDS `2.6.4`.

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
- session state is stored in the signed `habigoal_session` cookie

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
- `docs/user-guide.md`: role-based user guide
- `docs/settings-guide.md`: admin/settings operations guide
- `docs/sso-setup.md`: SSO client setup
- `docs/design-system.md`: GDS adapter and migration state
- `docs/gds-adoption.md`: GDS package, manifest, exceptions, and validation state
- `docs/gds-verification-matrix.md`: GDS route and accessibility verification matrix
- `docs/dod.md`: definition of done
- `ROADMAP.md`: current roadmap
- `.codex/memory/architecture.md`: Codex automation architecture and operating constraints

## Current Risks

- Some older files and database collections still use legacy `child` and `assessment` names. Product-facing code should use aliases or facade modules.
- i18n coverage has improved and `npm run i18n:audit` is now the repeatable release gate for catalog parity, placeholders, public news localization, and known legacy copy leaks. Hardcoded strings still need cleanup as form/report surfaces are migrated.
- The centralized form-system foundation exists on `main` for check-in setup, training-load, and coach-note fields. The full rollout across athlete profile, admin, team, and settings forms is still incomplete.
- Team invitations are still admin-managed records, not outbound email invites.
- GitHub Project state can drift from merged work if branches are merged manually without issue/board updates. GDS package/provider issues must be reconciled against `npm run gds:audit`, `npm run gds:compliance`, `gds-adoption.json`, and `package.json`.

## GitHub Project Board Operations

GitHub Project 14 is the operational planning board for Habigoal:

- URL: `https://github.com/users/moldovancsaba/projects/14`
- Repository: `moldovancsaba/habigoal.com`
- Preferred tool: GitHub CLI from this workspace

Use the project board as the live execution layer and use `ROADMAP.md`, `docs/architecture.md`, and this handover as the source-of-truth comparison inputs.

### Board Update Workflow

1. Read local state first:

```bash
git status --short
sed -n '1,260p' ROADMAP.md
sed -n '1,260p' docs/architecture.md
sed -n '1,260p' handover.md
```

2. Read GitHub issue state with REST first, because it is less likely to hit the GraphQL project limit:

```bash
gh api repos/moldovancsaba/habigoal.com/issues?state=open\&per_page=100 \
  --jq '.[] | {number,title,labels:[.labels[].name],updated_at,html_url}'
```

3. Compare open issues against the current active themes:

- `priority:now`: i18n reliability, centralized forms foundation, athlete-only experience, route/access correctness, critical reporting/news reliability.
- `priority:next`: team invitations, admin/trainer membership UX, release-note automation, report/i18n hardening, form migrations.
- `priority:later`: match center, testing library, finance/admin operations, resources, device integrations, large expansion themes.

4. Create missing issues with the same quality structure:

```markdown
## Objective
Clear one-sentence outcome.

## Context
Why this exists, based on code/docs/product state.

## Scope
- Concrete work item
- Concrete work item

## Acceptance Criteria
- Verifiable outcome
- Verifiable outcome
```

5. Use existing label conventions:

- area labels: `area:athletes`, `area:coaches`, `area:analytics`, `area:reporting`, `area:platform`
- priority labels: `priority:now`, `priority:next`, `priority:later`
- track labels: `track:command-center`, `track:daily-flow`, `track:guidance`, `track:weekly-ops`, `track:expansion`
- type labels: `feature`, `bug`, `documentation`

6. Patch issue labels with REST when GraphQL is exhausted:

```bash
gh api -X PATCH repos/moldovancsaba/habigoal.com/issues/ISSUE_NUMBER \
  -f labels[]='feature' \
  -f labels[]='area:platform' \
  -f labels[]='priority:now' \
  -f labels[]='track:guidance'
```

7. Close issues only when `main` and the documentation agree that the work is shipped:

```bash
gh api -X POST repos/moldovancsaba/habigoal.com/issues/ISSUE_NUMBER/comments \
  -f body='Closed during project reconciliation. Main contains the shipped behavior and validation passed.'

gh api -X PATCH repos/moldovancsaba/habigoal.com/issues/ISSUE_NUMBER \
  -f state=closed \
  -f state_reason=completed
```

### Project 14 Sync

Project item and field updates use GitHub GraphQL. Check the limit before running board sync:

```bash
gh api rate_limit --jq '{graphql:.resources.graphql}'
```

If GraphQL is available, add issues to Project 14 and update project fields:

```bash
gh project item-add 14 --owner moldovancsaba --url https://github.com/moldovancsaba/habigoal.com/issues/ISSUE_NUMBER
gh project field-list 14 --owner moldovancsaba --format json
gh project item-list 14 --owner moldovancsaba --limit 500 --format json
```

Do not delete custom project fields during reconciliation. The existing `scripts/sync-gh-project-14.sh` can add manifest issues and set basic status, but it currently deletes non-default fields; do not run it unless that destructive behavior is removed or explicitly desired.

If GraphQL is exhausted, create/update issues with REST immediately, then schedule or resume the same thread after the reset time shown by `gh api rate_limit`.

### Recent Reconciliation Notes

On 2026-05-20, the board was compared against code and documentation. Issues `#62` to `#66` were created for the missing active roadmap gaps.

On 2026-05-21, `#62` received the first shipped audit gate in commit `30e122f`. Keep the issue open until the remaining hardcoded form/report copy cleanup is complete.

- i18n audit gates
- trainer/athlete invitation workflow
- athlete-only check-in shell and task UX
- weekly GitHub-based release-note news posts
- legacy compatibility retirement plan

Issue `#29` was closed because typecheck validation is stable on `main`.

On 2026-05-31, the GDS documentation and project-board state were reconciled after `@doneisbetter/gds@2.6.4` adoption. `npm run gds:audit` and `npm run gds:compliance` pass on `main`, so issue/project references that describe GDS runtime adoption as blocked by package publication or Mantine compatibility are obsolete.

## Validation

Run before merging meaningful changes:

```bash
npm run lint
npm run test
npm run semantic:audit
npm run gds:audit
npm run i18n:audit
npm run build
npm run typecheck
```

`npm run semantic:audit` should remain a UI/design-system cleanup gate. `npm run gds:audit` and `npm run gds:compliance` are expected to pass on `main`; treat a failure as drift between code, docs, and the GDS adoption manifest.

GDS migration and rollback checks are documented in [docs/gds-verification-matrix.md](docs/gds-verification-matrix.md).

For database/env validation:

```bash
npm run db:ping
```
