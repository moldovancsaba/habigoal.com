# Habigoal Settings Guide

Last updated: 2026-06-26

Settings are available to admins at `/{locale}/dashboard/settings`. Trainers must not be able to open this route when authentication is enforced.

This guide documents shipped settings behavior only. Future admin or onboarding ideas must stay out of this guide until the relevant route, API, and project issue are delivered on `origin/main`.

## User Rights

Admins manage local authorization records in the `users` collection through `/api/users`.

Supported roles:

- `athlete`: self-scoped to one linked athlete profile.
- `trainer`: scoped through team membership.
- `admin`: organization-wide access to settings and governance operations.

Safety rules:

- every saved user must have at least one role
- the final admin cannot be deleted
- an admin cannot remove their own admin role
- athlete users should have `athleteId` set before they are expected to use the athlete app
- trainer access depends on team membership rather than global athlete visibility
- blocked users should see a redirect or unavailable state, not leaked settings data

Legacy role aliases `conductor` and `observer` are still normalized by compatibility code, but new settings work should use `trainer` and `athlete`.

## Teams

Teams are stored in the `teams` collection and managed through `/api/teams`.

A team contains:

- `name`
- `trainerEmails[]`
- `athleteIds[]`

Trainer access is derived from team membership. If a trainer cannot see an athlete, verify that the trainer email and athlete id are both attached to the same team.

Team updates should be checked from both sides:

- the trainer dashboard should show only assigned athletes
- the athlete app should still show only the linked athlete profile for athlete users
- settings should keep enough admin access to recover incorrect membership

## Restore Bin

The settings restore area shows soft-deleted athletes and check-ins.

Restore behavior:

- restoring an athlete reactivates the athlete profile
- restoring a check-in reactivates that record
- deleting an athlete also soft-deletes associated check-in history

Use restore carefully because restored historical records immediately become visible again to users who have access to the athlete.

## Governance Metrics

Governance metrics summarize operational data quality, including:

- deleted athlete count
- deleted check-in count
- check-ins missing report consent
- check-ins missing athlete links

These metrics are intended to reveal cleanup work, not to replace full audit logs.

## Admin Onboarding

Admin onboarding is delivered through the shared onboarding runtime. Prompts are role-scoped, dismissible, and non-blocking. They should reinforce safe setup behavior for users, teams, standards, restore workflows, and governance metrics.

The runtime uses:

- `GET /api/onboarding/state`
- `POST /api/onboarding/events`
- `docs/onboarding-architecture.md` as the architecture contract

The shipped onboarding renderer is a GDS modal/checklist primitive with dismiss, snooze, complete, retry, blocked, error, and completed states. It is not a separate anchored bubble/popover. Do not describe a bubble-only journey as shipped unless the implementation has been delivered and `docs/onboarding-architecture.md` has been updated.

## Company And Legal Profile

Company/legal settings are persisted through `/api/settings` and displayed in:

- dashboard footer
- public legal pages
- reports where applicable

Legal pages remain public when auth is enforced.

## Version Domains

Settings exposes multiple version concepts. They must not be merged in client-facing language:

- App version: developer-managed in `lib/app-version.ts`, displayed in the dashboard footer and public legal pages, and validated with `npm run version:audit`.
- Package version: `package.json` and `package-lock.json`; must match the app version when release versioning changes.
- Readiness standards version: admin-managed in settings under `settings.standards.activeVersion` and `settings.standards.versions`; affects scoring interpretation and check-in history.
- API/OpenAPI version: `lib/openapi-spec.ts`; describes API contract metadata and can differ from the app version.
- Product surface registry version: `/api/product-surfaces`; describes Habigoal/Athlete IQ surface contract phase.
- Local model/scoring versions: registry metadata for local processing engines; not a hosted AI provider version and not the app version.

Before release sign-off:

```bash
npm run version:audit
```

If the version audit fails, update the relevant source-controlled version references before publishing manuals.

## Locations

Locations are global settings used by check-ins, athlete filtering, and planning context. Keep naming consistent because location text appears in records and weekly plans.

## Readiness Standards

Readiness standards are versioned in settings. Published standards should not be edited casually because check-ins can store the standards version used during scoring.

Operational rules:

- draft a new standards version before major scoring changes
- publish only after validation
- run `npm run db:backfill-standards-version` only when intentionally aligning older records
- document any standards change in release notes when scoring interpretation changes
- keep standards rollback explicit by retaining the previous version instead of overwriting it

## Alerting Thresholds

Alert thresholds influence the trainer command center, missed check-in escalation, and support flags. Threshold changes should be validated on the trainer dashboard with real or seeded data.

## Route And Access Verification

The settings guide references shipped localized routes from `app/[locale]`:

- `/{locale}/dashboard/settings`
- `/{locale}/dashboard`
- `/{locale}/dashboard/athletes`
- `/{locale}/dashboard/assessment`
- `/{locale}/dashboard/planning`
- `/{locale}/dashboard/reports`
- `/{locale}/dashboard/wearables`
- `/{locale}/legal/gtc`
- `/{locale}/legal/privacy`

If a settings instruction references another route, first confirm the route exists in `app/` and that its role behavior matches middleware and dashboard shell redirects.

## Validation Checklist

After settings changes:

```bash
npm run version:audit
npm run i18n:audit
npm run lint
npm run typecheck
npm run build
```

Then manually verify:

- admin can still access settings
- trainer cannot access settings
- athlete cannot access settings or other athlete profiles
- public news and legal pages still load without login
