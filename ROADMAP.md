# Habigoal Product Roadmap

Habigoal is evolving from a daily check-in product into a role-aware athlete operating system for athletes, trainers, and admins.

Last updated: 2026-05-31

## Shipped Baseline

- Daily athlete check-in with nine readiness signals.
- Athlete profiles with history, trends, training load, habit adherence, memory summaries, and weekly operating summaries.
- Trainer command center with priority queues, readiness buckets, alerts, recommendations, coach actions, and session blueprint guidance.
- Weekly session planning with persisted plans and athlete-page visibility.
- PDF/report exports for athlete and check-in review.
- DoneIsBetter SSO preparation and local approved-user authorization.
- Role model: `athlete`, `trainer`, `admin`.
- Athlete self-scope, trainer team-scope, and admin organization-scope.
- Team creation and membership assignment.
- Public news/release-note surface with fail-closed locale behavior.
- Repeatable i18n audit gate for locale key parity, ICU placeholder parity, news localization completeness, and known legacy copy leaks.
- Public legal pages.
- MongoDB Atlas integration, health checks, seed scripts, and migration/backfill helpers.
- Codex automation control plane for branch-and-PR audit/planning/implementation/docs loops.
- GDS governed runtime baseline with `@doneisbetter/gds@2.6.4`, passing `npm run gds:audit` and `npm run gds:compliance`.

## Current Active Engineering Themes

### 1. i18n Reliability

Goal: eliminate mixed-language UI and unsafe fallbacks.

Next work:

- clear remaining hardcoded strings in athlete management and check-in surfaces
- keep `npm run i18n:audit` part of regular validation
- keep news posts locale-specific and fail-closed
- avoid adding visible copy outside `/messages` or structured content files
- extend the audit as centralized forms and report labels are migrated

### 2. Centralized Forms

Goal: reduce page-owned form logic and keep labels, validation, visibility, and onboarding targets consistent.

Status: active roadmap work; GDS `FormField`, `SemanticButton`, and `ChoiceChip` are in production surfaces. The central form registry/renderer now covers check-in setup, training load, and coach-note fields, but the full rollout across profile, admin, team, and settings forms is not complete on `main`.

Next work:

- central form definitions
- field registry and renderer
- daily check-in migration
- athlete profile/baseline form migration
- admin/team form migration
- governance rules that prevent new page-owned forms where shared definitions exist

### 3. User Rights And Team Operations

Goal: complete the practical admin/trainer/athlete model.

Next work:

- richer team editing and membership management
- trainer-only team views
- invitation workflow for trainers and athletes
- clearer admin audit trail for access changes

### 4. Athlete App Quality

Goal: make the athlete experience self-contained rather than a dashboard reuse.

Next work:

- dedicated athlete-only check-in shell
- athlete-first habit and task UX
- clearer weekly summary and reflection views
- stricter self-profile route handling and copy review

### 5. Reporting And News

Goal: make weekly app changes and athlete operations easy to share.

Next work:

- automated weekly news posts from GitHub activity
- localized release-note workflow
- richer shareable operating reports
- report i18n regression checks

### 6. GDS Completion And Documentation Reconciliation

Goal: keep code, docs, comments, and GitHub Project 14 aligned with the governed GDS runtime state.

Next work:

- close or downgrade obsolete package-adoption blockers
- keep GDS component-family issues focused on remaining UI surface migrations
- update issue bodies when validation proves a blocker is resolved
- keep `docs/design-system.md`, `docs/gds-adoption.md`, `docs/gds-verification-matrix.md`, and `handover.md` synchronized after each GDS delivery

## Backlog Themes

- Custom questionnaire builder on top of centralized forms.
- Testing and measurement library.
- Training session operations center.
- Match center with sport-specific reports and stats.
- Health events and return-to-play workflows.
- Parent/guardian access mode.
- Evidence and file library.
- Import/export connectors.
- External benchmarking hub.
- Finance, dues, resources, and admin operations.

## Roadmap Governance

GitHub Project 14 is the operational planning source for issue status and priority. This file records product direction and should be updated when shipped capabilities or active themes change.
