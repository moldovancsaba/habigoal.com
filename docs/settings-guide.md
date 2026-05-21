# Habigoal Settings Guide

Last updated: 2026-05-21

Settings are available to admins at `/{locale}/dashboard/settings`. Trainers must not be able to open this route when authentication is enforced.

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

Legacy role aliases `conductor` and `observer` are still normalized by compatibility code, but new settings work should use `trainer` and `athlete`.

## Teams

Teams are stored in the `teams` collection and managed through `/api/teams`.

A team contains:

- `name`
- `trainerEmails[]`
- `athleteIds[]`

Trainer access is derived from team membership. If a trainer cannot see an athlete, verify that the trainer email and athlete id are both attached to the same team.

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

## Company And Legal Profile

Company/legal settings are persisted through `/api/settings` and displayed in:

- dashboard footer
- public legal pages
- reports where applicable

Legal pages remain public when auth is enforced.

## Locations

Locations are global settings used by check-ins, athlete filtering, and planning context. Keep naming consistent because location text appears in records and weekly plans.

## Readiness Standards

Readiness standards are versioned in settings. Published standards should not be edited casually because check-ins can store the standards version used during scoring.

Operational rules:

- draft a new standards version before major scoring changes
- publish only after validation
- run `npm run db:backfill-standards-version` only when intentionally aligning older records

## Alerting Thresholds

Alert thresholds influence the trainer command center, missed check-in escalation, and support flags. Threshold changes should be validated on the trainer dashboard with real or seeded data.

## Validation Checklist

After settings changes:

```bash
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
