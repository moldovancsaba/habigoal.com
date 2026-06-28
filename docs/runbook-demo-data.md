# Runbook — Demo ecosystem (Haho) data (#427)

The demo roster powers visual verification and client demos: **5 trainers**
(`trainer1@haho.ai` … `trainer5@haho.ai`), each with **5 athletes**
(`athlete{T}{1..5}@haho.ai`, 25 total), and **seeded historical data**
(check-ins, habits, training load, daily IQ/plan) across a multi-week window.

These are **real persisted users** created via the canonical collections, not
hardcoded fixtures — so all surfaces (Habigoal + Athlete IQ) render them
naturally (streaks, charts, dashboards populate).

## Why the data can "disappear"

The seed **script** lives in the repo, but the **data** only exists once the
script has been run against the target database. If the database was reset or
the seed never ran, the apps show empty states. Presence of the script ≠ seeded
data.

## Seed it

```bash
# requires MONGODB_URI (+ MONGODB_DB) for the target environment
npm run db:seed-haho-ecosystem
```

- **Idempotent:** safe to re-run. Records upsert on unique keys
  (`athleteiq_checkins` by `athleteId+localDate+mode`, `habit_records` by
  `athleteId+date`, etc.), so a second run reconciles rather than duplicates.
- **Deterministic:** values are derived from each athlete/day index (no RNG), so
  re-runs reproduce the same roster and history.
- **Dry run:** the script supports a dry-run path that computes the manifest
  without writing — use it to preview counts.
- **Manifest:** each run records a `haho_seed_manifests` entry with counts and a
  validation block (`expectedTrainerCount: 5`, `expectedAthleteCount: 25`).

## Verify

After seeding, sign in as e.g. `athlete11@haho.ai` (Habigoal) or
`trainer1@haho.ai` (Athlete IQ) and confirm dashboards, streaks and the
last-7-days chart are populated.

Contract guarded by `tests/haho-seed.test.ts`.
