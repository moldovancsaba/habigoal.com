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

The lockfile currently resolves the core runtime to Next.js `15.5.19`, React `19.2.5`, TypeScript `5.9.3`, MongoDB driver `6.21.0`, next-intl `4.9.2`, Mantine `8.3.18`, and GDS `3.6.0`.

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

The product now runs in two separate surfaces:

- Habigoal at `/{locale}/habigoal`: client wellbeing, habit tracking, daily check-ins, and supportive feedback.
- Athlete IQ at `/{locale}/athlete-iq`: professional athletes, coaches, dashboards, planning, services, and advanced analytics.

Athlete IQ includes Habigoal through shared contracts in `lib/product-surfaces.ts` and the registry payload from `/api/product-surfaces`.

## 2026-06-27 Haho Ecosystem Live Data Delivery

Implemented scope for GitHub issues `#319` to `#328`:

- Email-only pseudo-login now stores `normalizedEmail`, supports role selection, and grants Athlete IQ athlete access when the user registers through Athlete IQ.
- Habigoal remains the mobile-first home app, but it is now a filtered live surface over the same canonical Athlete IQ athlete profile and daily records.
- Athlete IQ now supports both trainer/professional and athlete personas behind the Athlete IQ product surface.
- `services/shared-daily-state.service.ts` bridges Habigoal values and habits to canonical `athleteiq_checkins` and `habit_records`.
- Native Athlete IQ performance check-ins now persist through `services/athleteiq-check-in-persistence.service.ts`, which mirrors required wellness fields into the `lifestyle` snapshot Habigoal reads; shared daily-state reads also fall back to the performance snapshot for older records that do not yet have a mirror.
- Legacy assessment/check-in saves now call `services/assessment-daily-state-bridge.service.ts`, which maps completed 1-5 check-in answers into canonical Athlete IQ `lifestyle` and `performance` snapshots, updates the same Habigoal-readable daily state, and runs the Athlete IQ daily engine with the authenticated actor.
- `POST /api/habigoal/daily-operation` writes through the shared daily-state bridge and then runs the Athlete IQ daily engine.
- `GET/PATCH /api/daily-state` exposes the same shared contract for product clients and runs the engine after writes.
- `scripts/seed-haho-ecosystem.mjs` creates the Haho live cohort in MongoDB Atlas: 5 trainers, 25 athletes, 5 teams, and 90 Budapest-local days of measurements, habits, plans, Daily IQ snapshots, pain alerts, and coach actions.
- `scripts/haho-ecosystem-release-gate.mjs` validates required artifacts, package scripts, product wording gates, UI markers, and Atlas coverage when Atlas validation is enabled.
- Full contract, rollback, and verification notes are in [docs/haho-ecosystem-live-data.md](docs/haho-ecosystem-live-data.md).

Operational commands:

```bash
npm run db:seed-haho-ecosystem -- --dry-run
npm run db:seed-haho-ecosystem -- --reset
npm run db:seed-haho-ecosystem -- --rollback
HAHO_RELEASE_GATE_SKIP_ATLAS=1 npm run haho:release-gate
npm run haho:release-gate
```

## Application Routes

Public routes:

- `/{locale}` landing page
- `/{locale}/news`
- `/{locale}/news/[slug]`
- `/{locale}/legal/gtc`
- `/{locale}/legal/privacy`
- `/{locale}/habigoal`
- `/{locale}/athlete-iq`

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

## Client QA Delivery Handover - 2026-06-26

This section records the direct GitHub artifact delivery for the client-reported Habigoal inconsistencies around user manuals, popup/bubble onboarding, and version numbers.

### Canonical Standard

All created or rewritten issues follow the production-grade issue structure from:

- `https://github.com/sovereignsquad/general-design-system/issues/81`

Mandatory constraints applied to every UI/UX/frontend issue:

- all UI/UX/frontend work must use only `https://github.com/sovereignsquad/general-design-system`
- accessibility is mandatory
- no parallel visual system
- no vague umbrella tickets
- every issue must be independently executable

### GitHub Scope Delivered

Repository:

- `moldovancsaba/habigoal.com`

Project board:

- Project 14: `{habigoal.com} - From IDEA to LIVE`
- URL: `https://github.com/users/moldovancsaba/projects/14`

Milestone:

- `Client QA - manuals, onboarding, version reconciliation`

Labels added or used:

- `client-reported`
- `source:client-qa`
- `area:onboarding`
- `area:release-governance`
- `type:testing`
- existing GDS, accessibility, priority, track, type, and area labels

Project fields added:

- `Client QA Lane`
- `Client QA Sequence`
- `Client QA Dependencies`

### Issue Decomposition

The broad ticket `#213` was closed as `not planned` and moved to project status `Declined (NEVER)` because it was an umbrella task. It is superseded by the concrete issues below.

| Sequence | Issue | Lane | Board Status | Dependencies | Purpose |
| --- | --- | --- | --- | --- | --- |
| 101 | `#214` Docs: Onboarding architecture - canonical runtime and accessibility contract | Onboarding | Todo (NEXT) | None | Create the missing canonical onboarding architecture document and runtime/accessibility contract. |
| 102 | `#50` Onboarding: State API - per-user module eligibility and event persistence | Onboarding | Todo (NEXT) | `#214` | Implement onboarding state, eligibility, and idempotent event persistence. |
| 103 | `#215` UI: Onboarding bubble primitive - GDS-only accessible prompt and checklist renderer | Onboarding | Todo (NEXT) | `#214`, `#50` | Build the reusable GDS-only accessible popup/bubble/checklist primitive. |
| 104 | `#85` Athlete Profile: First-login baseline - required setup contract and recovery states | Onboarding | Todo (NEXT) | `#214`, `#50` | Define and persist athlete first-login baseline setup and recovery behavior. |
| 105 | `#49` Onboarding: Athlete journey - first-login and check-in completion prompts | Onboarding | Todo (NEXT) | `#214`, `#50`, `#215`, `#85` | Wire athlete-specific onboarding prompts and completion behavior. |
| 106 | `#48` Onboarding: Trainer journey - dashboard planning and recommendation guidance prompts | Onboarding | Backlog (SOONER) | `#214`, `#50`, `#215` | Wire trainer-specific onboarding prompts and completion events. |
| 107 | `#51` Onboarding: Admin journey - settings teams users and governance setup prompts | Onboarding | Backlog (SOONER) | `#214`, `#50`, `#215` | Wire admin-specific onboarding prompts and completion events. |
| 108 | `#216` Docs: User manuals - reconcile role journeys with shipped route and onboarding truth | Manuals | Todo (NEXT) | `#214`; runtime claims blocked by `#50`, `#215`, `#49`, `#48`, `#51` | Reconcile user/settings manuals with actual route and onboarding truth. |
| 109 | `#217` Release: Version governance - package runtime docs and rendered UI drift gate | Version Governance | Todo (NEXT) | None | Add a version drift gate for package, runtime, docs, legal, and rendered UI truth. |

### Issue Body Requirements Delivered

Every active issue above defines, where relevant:

- executive summary
- product context
- current state
- problem statement
- functional, technical, and UX goals
- non-goals
- mandatory GDS constraint
- architecture
- data model/contracts
- API contracts
- pseudo-code
- UX/operator behavior
- accessibility requirements
- edge cases
- performance expectations
- security/privacy requirements
- acceptance criteria
- testing requirements
- documentation requirements
- dependencies
- execution order
- operational behavior
- handover and rollback plan

### Current GitHub State

Open active client-QA issues in the milestone:

- `#214`
- `#50`
- `#215`
- `#85`
- `#49`
- `#48`
- `#51`
- `#216`
- `#217`

Closed superseded issue:

- `#213` - closed as `not planned`, board status `Declined (NEVER)`

The issue bodies contain the complete dependency and sequencing information even when the project field text is not perfect.

### Code And Documentation Delivered

The implementation pass delivered the runtime and documentation that the client QA issues decomposed:

- Onboarding module registry, route normalization, role gating, module state resolution, and event validation in `lib/onboarding.ts` and `types/onboarding.ts`.
- Mongo-backed onboarding event persistence with idempotency in `repositories/onboarding.repository.ts`.
- Onboarding APIs:
  - `GET /api/onboarding/state`
  - `POST /api/onboarding/events`
- Athlete baseline API:
  - `PATCH /api/athletes/:id/baseline`
- GDS-only accessible onboarding prompt/checklist renderer in `components/onboarding/OnboardingPrompt.tsx`.
- Dashboard, athlete-profile, and athlete check-in wiring through `DashboardShell`, `/{locale}/athletes/:id`, and `/{locale}/athletes/:id/check-in`.
- Athlete first-login baseline setup UI on `/{locale}/athletes/:id`, including weekly goal, preferred training days, support preferences, localized copy, GDS controls, save/error states, and page-state refresh after `PATCH /api/athletes/:id/baseline`.
- Successful athlete check-in saves emit the `complete-check-in` onboarding step event without blocking the save or redirect.
- Athlete baseline persistence fields in `repositories/child.repository.ts`.
- Canonical onboarding architecture documentation in `docs/onboarding-architecture.md`.
- Manual reconciliation in `docs/user-guide.md`, `docs/settings-guide.md`, and `docs/api.md`.
- Version drift gate in `scripts/version-audit.mjs`, exposed as `npm run version:audit`.
- GDS governance reconciliation to `@doneisbetter/gds@^3.6.0` in README, `docs/design-system.md`, `gds-adoption.json`, and `scripts/gds-audit.mjs`.
- GDS compliance cleanup for raw color literals and product-authored news exception metadata.

The implementation preserves the mandatory frontend constraint: onboarding UI imports interactive primitives from `@doneisbetter/gds/client` and does not introduce a parallel UI system.

### AthleteIQ Session Lifecycle Delivered

Issue `#225` / capability `AIQ-1270` now has an executable backend lifecycle for Daily Plan session recommendations:

- Session draft creation from Daily Plan and Pain Safety guardrail through `POST /api/athleteiq/sessions/from-plan`.
- Session listing through `GET /api/athleteiq/sessions?athleteId=&from=&to=`.
- Access-checked state transitions through `PATCH /api/athleteiq/sessions/:id/state`.
- Debrief capture through `POST /api/athleteiq/sessions/:id/debrief`, including RPE persistence into `session_rpe_results`.
- Session persistence in `athleteiq_sessions` with deterministic `athleteId + localDate` session ids and audit history.
- Structured AthleteIQ errors with `code`, `messageKey`, `retryable`, and `correlationId`.
- Operational events for `athleteiq.session.created_from_plan`, `athleteiq.sessions.listed`, `athleteiq.session.state_updated`, `athleteiq.session.completed`, and `athleteiq.score.recalculate_requested`.
- Contract documentation in `docs/athleteiq-session-lifecycle-contract.md`.

Rollback is additive: remove consumers of the session endpoints or disable the capability in the module registry. Existing `athleteiq_sessions` and `session_rpe_results` records can remain because older Daily Plan flows do not depend on them.

### AthleteIQ Daily Reality Map Delivered

Issue `#226` / capability `AIQ-1280` now has a local day-planning backend without external calendar dependency:

- Local entry persistence in `athleteiq_calendar_entries`.
- Day context API through `GET /api/athleteiq/calendar/day?athleteId=&date=&timezone=`.
- Manual entry creation through `POST /api/athleteiq/calendar/entries`.
- Manual entry update/delete through `PATCH` and `DELETE /api/athleteiq/calendar/entries/:id`.
- Daily Plan tasks and AthleteIQ session blocks are merged into the returned `DayContext`.
- Unknown-time entries are preserved in an unscheduled bucket.
- Overlap and insufficient-recovery conflicts are labeled without deleting source data.
- Contract documentation in `docs/athleteiq-calendar-contract.md`.

Rollback is additive: remove consumers of the calendar endpoints or disable the capability in the module registry. Existing `athleteiq_calendar_entries` records can remain because Daily Plan and session lifecycles do not depend on them.

### AthleteIQ Reflection Memory Delivered

Issue `#227` / capability `AIQ-1290` now has a private-by-default daily reflection and next-day memory handoff backend:

- Raw reflection persistence in `athleteiq_reflections`.
- Reflection creation through `POST /api/athleteiq/reflections`, with blank reflections skipped without persistence.
- Role-redacted day views through `GET /api/athleteiq/reflections/day?athleteId=&date=`.
- Visibility updates through `PATCH /api/athleteiq/reflections/:id/visibility`.
- Next-day planning handoff through `GET /api/athleteiq/memory-handoff?athleteId=&date=`.
- Deterministic local tag derivation only; no external AI provider and no OpenAI integration.
- Raw body is visible only to the linked athlete. Coach/parent summaries use derived safe summary and tags only when visibility allows it.
- Contract documentation in `docs/athleteiq-reflection-contract.md`.

Rollback is additive: remove consumers of the reflection endpoints or disable the capability in the module registry. Existing `athleteiq_reflections` records can remain because check-in, Daily Plan, sessions, and calendar flows do not depend on them.

### AthleteIQ Stakeholder Projections Delivered

Issue `#228` / capability `AIQ-1300` now has role-safe stakeholder projection APIs:

- Coach dashboard projection through `GET /api/athleteiq/coach/dashboard?teamId=&date=&timezone=`.
- Parent-safe summary projection through `GET /api/athleteiq/parents/summary?athleteId=&date=&timezone=`.
- Team aggregate overview through `GET /api/athleteiq/team/overview?teamId=&date=&timezone=`.
- Coach alert action recording through `POST /api/athleteiq/coach/alerts/:id/actions`.
- Projection composition from Daily IQ, Pain Safety, Mental Edge, Daily Plan, Digital Athlete Twin, teams, and coach actions.
- Parent projections redact mental risk details, pain risk details, pain locations, raw mental signals, and coach-only alerts.
- Team readiness aggregates are suppressed for teams smaller than three athletes.
- Contract documentation in `docs/athleteiq-stakeholder-projection-contract.md`.

Rollback is additive: remove consumers of the stakeholder endpoints or disable the capability in the module registry. Alert actions use the existing `coach_actions` contract and remain auditable.

### AthleteIQ Daily Reports Delivered

Issue `#229` / capability `AIQ-1310` now has immutable active-module daily report snapshots:

- Report generation through `POST /api/athleteiq/reports/daily/generate`.
- Latest report lookup through `GET /api/athleteiq/reports/daily?athleteId=&teamId=&date=&view=`.
- JSON export through `GET /api/athleteiq/reports/daily/:id/export.json`.
- Snapshot persistence in `athleteiq_daily_reports`.
- Active and lite/manual modules are included according to the module registry and report visibility.
- Future modules are excluded from live sections and exposed only in the roadmap appendix.
- Reports reproduce stored Daily IQ and Daily Plan facts; they do not recalculate scores independently.
- Low or insufficient confidence sections suppress prescriptive recommendations.
- Contract documentation in `docs/athleteiq-daily-report-contract.md`.

Rollback is additive: remove consumers of the daily report endpoints or disable the capability in the module registry. Existing `athleteiq_daily_reports` snapshots remain readable and do not affect scoring or planning.

### GitHub Issue Updates Added

REST issue comments were added on 2026-06-26 to:

- `#214`
- `#50`
- `#215`
- `#85`
- `#49`
- `#48`
- `#51`
- `#216`
- `#217`

Each comment records that the implementation is present locally, lists the delivered runtime/manual/version scope, and records the passing validation set. REST was used because the GitHub GraphQL project API rate limit was exhausted.

### Remaining Board Field Cleanup

GitHub GraphQL project API rate limit was hit near the end of board-field cleanup.

On 2026-06-26 at 09:33 CEST, active GitHub board work was intentionally paused and a one-time local automation was scheduled to retry the handover project-board cleanup at 2026-06-26 17:00 CEST.

Scheduled automation:

- LaunchAgent: `~/Library/LaunchAgents/com.habigoal.client-qa-handover-update.plist`
- Script: `scripts/client-qa-handover-project-update-once.sh`
- Logs:
  - `~/Library/Logs/Habigoal/client-qa-handover-update.log`
  - `~/Library/Logs/Habigoal/client-qa-handover-update.err.log`

The script reads this handover context, verifies the expected Client QA delivery section exists, checks GitHub GraphQL availability, applies the remaining `Client QA Dependencies` cleanup for `#215` and `#216`, and attempts to move the active client-QA project items to `Review (ALMOST)`. It unloads and removes its LaunchAgent before running so it is one-time behavior.

Rate-limit snapshot at the time of handover:

```json
{
  "graphql": {
    "limit": 5000,
    "remaining": 5,
    "reset": 1782459398,
    "used": 4995
  }
}
```

Reset time from the local machine:

```text
2026-06-26 09:36:38 CEST
```

The only known incomplete board-field cleanup is cosmetic:

- Project field `Client QA Dependencies` for `#215` should be changed from `Docs architecture and state API` to `#214, #50`.
- Project field `Client QA Dependencies` for `#216` should be changed from `Onboarding architecture; do not claim runtime onboarding until implementation ships` to `#214; runtime claims blocked by #50, #215, #49, #48, #51`.
- Project item statuses should be advanced from planning statuses to review/done statuses after the local implementation changes are pushed or otherwise accepted.

After GraphQL reset, run:

```bash
project_id=$(gh project view 14 --owner moldovancsaba --format json --jq '.id')
items=$(gh project item-list 14 --owner moldovancsaba --limit 350 --format json)
item215=$(printf '%s' "$items" | jq -r '.items[] | select(.content.repository=="moldovancsaba/habigoal.com" and .content.number==215) | .id')
item216=$(printf '%s' "$items" | jq -r '.items[] | select(.content.repository=="moldovancsaba/habigoal.com" and .content.number==216) | .id')
gh project item-edit --project-id "$project_id" --id "$item215" --field-id PVTF_lAHOACGtF84BXSjzzhWcRxU --text '#214, #50'
gh project item-edit --project-id "$project_id" --id "$item216" --field-id PVTF_lAHOACGtF84BXSjzzhWcRxU --text '#214; runtime claims blocked by #50, #215, #49, #48, #51'
```

### Verification Commands Run

GitHub issue verification:

```bash
for n in 48 49 50 51 85 214 215 216 217 213; do
  gh issue view "$n" --repo moldovancsaba/habigoal.com --json number,title,state,labels,milestone
done
```

Project board verification:

```bash
gh project item-list 14 --owner moldovancsaba --limit 350 --format json
gh project field-list 14 --owner moldovancsaba --format json
```

Local repository status at handover time:

```text
Working tree contains the delivered local implementation files and documentation updates listed in this handover section.
```

Local validation completed after implementation:

```bash
npm run lint
npm test
npm run typecheck
npm run version:audit
npm run i18n:audit
npm run gds:audit
npm run gds:compliance
npm run build
```

Results:

- ESLint: passed with no warnings or errors.
- Vitest: 13 test files passed, 41 tests passed.
- TypeScript: passed with `tsc --noEmit`.
- Version audit: passed for app version `0.5.1`; OpenAPI version remains `2.0.0`.
- i18n audit: passed for 6 locales, 6 message catalogs, and localized news content.
- GDS audit: passed for Habigoal on GDS `3.6.0`.
- GDS compliance: passed for `habigoal`.
- Next.js production build: passed; new routes include `/api/onboarding/state`, `/api/onboarding/events`, and `/api/athletes/[id]/baseline`.

Local dev server verification:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
curl -I http://127.0.0.1:3000/en
curl -I http://127.0.0.1:3000/en/habigoal
curl -I http://127.0.0.1:3000/en/athlete-iq
curl -I http://127.0.0.1:3000/en/dashboard
```

All four HTTP checks returned `HTTP/1.1 200 OK`.

### Recent Reconciliation Notes

On 2026-05-20, the board was compared against code and documentation. Issues `#62` to `#66` were created for the missing active roadmap gaps.

On 2026-05-21, `#62` received the first shipped audit gate in commit `30e122f`. Keep the issue open until the remaining hardcoded form/report copy cleanup is complete.

- i18n audit gates
- trainer/athlete invitation workflow
- athlete-only check-in shell and task UX
- weekly GitHub-based release-note news posts
- legacy compatibility retirement plan

Issue `#29` was closed because typecheck validation is stable on `main`.

On 2026-05-31, the GDS documentation and project-board state were reconciled after `@doneisbetter/gds@2.6.4` adoption. On 2026-06-27, the repository is reconciled to `@doneisbetter/gds@3.6.0`; `npm run gds:audit` and `npm run gds:compliance` pass locally, so issue/project references that describe GDS runtime adoption as blocked by package publication or Mantine compatibility are obsolete.

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

## 2026-06-26 AthleteIQ Lite Module Gateway Delivery

Delivered issue `#230` in local implementation:

- Added `AIQ-1320` lite/manual gateway contracts for recovery, fuel, learning, and manual wearable-style entries.
- Added `athleteiq_lite_module_entries` persistence with idempotent writes by athlete, module, and idempotency key.
- Added APIs:
  - `GET /api/athleteiq/lite-modules`
  - `POST /api/athleteiq/recovery-lite/entries`
  - `POST /api/athleteiq/fuel-lite/entries`
  - `POST /api/athleteiq/learning/progress`
  - `POST /api/athleteiq/wearables/manual-entry`
- Manual wearable entries explicitly set `deviceConnectionClaim=false`, `integrationStatus=not_connected_manual_only`, and keep `wearable_normalisation` as missing data.
- Out-of-range wearable values hard fail; plausible but unusual values return warnings for UI review.
- Added plan/report summary generation with source labels, plan reason labels, evidence labels, and confidence boundaries.
- Added documentation at `docs/athleteiq-lite-module-gateway-contract.md`.
- No UI primitive was added, so no General Design System request issue was required for this issue.

## 2026-06-26 AthleteIQ Cognitive Lite And CogLeague Boundary Delivery

Delivered issue `#231` in local implementation:

- Added `AIQ-1330` Cognitive Lite local trait journey contracts for alertness, impulse control, attention, risk, reasoning, and memory retention.
- Cognitive Lite results are normalized to 0-100 where profile baseline data exists and are always marked `benchmarkStatus=non_benchmark`.
- Partial trait journeys expose completed count, missing-data labels, local source labels, and non-benchmark claim boundaries.
- Added disabled CogLeague future boundary with tournament template, cohorts, `attemptLimit=3`, partner/consent requirements, no rewards, no revenue claims, and ranking disabled until tie-breakers are documented.
- Added APIs:
  - `GET /api/athleteiq/cognitive-lite/results?athleteId=...`
  - `GET /api/athleteiq/cogleague/tournaments`
- Added Cognitive Lite value summaries to the AthleteIQ twin projection lite dimensions without promoting them to active or benchmarked claims.
- Added documentation at `docs/athleteiq-cognitive-cogleague-boundary-contract.md`.
- No UI primitive was added, so no General Design System request issue was required for this issue.

## 2026-06-26 AthleteIQ GameFlow Future Boundary Delivery

Delivered issue `#232` in local implementation:

- Added `AIQ-1340` GameFlow future boundary contracts for match timelines, segment types, quality metrics, attribution, and roadmap prerequisites.
- Added disabled roadmap API `GET /api/athleteiq/gameflow/matches/:id/timeline`.
- The endpoint returns no production segments, no live data, no model output, no active-football percentage, no dead-time ratio, no friction count, no delay confidence, and no model error bounds.
- Missing data explicitly includes video rights, event source, model validation, reviewer workflow, and legal approval.
- Added documentation at `docs/athleteiq-gameflow-future-boundary-contract.md`.
- No UI primitive was added, so no General Design System request issue was required for this issue.

## 2026-06-26 AthleteIQ Readiness Route Delivery

Delivered issue `#234` in local implementation:

- Added `AIQ-1245` green/amber/red readiness route engine.
- Route snapshots consume Daily IQ and pain guardrail outputs instead of duplicating readiness or pain logic.
- Added persisted `athleteiq_readiness_routes` snapshots with route, action, readiness score, confidence, rules used, caps applied, allowed/blocked actions, data-used, missing-data, and audit history.
- Added APIs:
  - `GET /api/athleteiq/readiness-route/today?athleteId=&localDate=&timezone=`
  - `POST /api/athleteiq/readiness-route/recalculate`
- High pain and coach-review pain override the base score and block green/high-intensity actions.
- Missing Daily IQ or insufficient confidence routes amber rather than making unsupported green claims.
- Added documentation at `docs/athleteiq-readiness-route-contract.md`.
- No UI primitive was added, so no General Design System request issue was required for this issue.
