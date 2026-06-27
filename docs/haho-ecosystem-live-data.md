# Haho Ecosystem Live Data Enablement

Date: 2026-06-27
Scope: GitHub issues `#319` to `#328`
Canonical quality standard: `sovereignsquad/general-design-system#81`

## Product Contract

Habigoal and Athlete IQ are separate product surfaces over the same athlete identity, profile, and history.

Habigoal is the mobile-first home app. It narrows the workflow to the daily habit loop, simple wellbeing check-in, status review, and one safe next action. It must behave like a mobile app on mobile: fixed bottom navigation, no viewport zoom, short task steps, and status shown only after the daily check-in and habit review have been saved.

Athlete IQ is the professional team and athlete operating system. Trainers manage teams, athletes, service coverage, risks, and actions. Athletes can also use Athlete IQ to view their own professional workspace and record or review the same daily state.

The same email account can open both products when the account has both entitlements. Simple Habigoal users can exist with Habigoal-only access, but the current onboarding rule is email-first Athlete IQ registration for the Haho live cohort. Habigoal reads and writes the same canonical daily records, so a future Athlete IQ relationship can use the historical data.

## Architecture

- `users` is the entitlement and login source. All pseudo-login users are email-only and store `normalizedEmail`.
- `children` stores the canonical athlete profile used by both products.
- `teams` connects trainers to athlete rosters for Athlete IQ.
- `athleteiq_checkins` stores the canonical lifestyle and performance check-ins.
- `habit_records` stores the canonical daily habit completion state.
- `athleteiq_daily_iq_snapshots`, `athleteiq_daily_plans`, `athleteiq_pain_alerts`, and `coach_actions` are downstream engine outputs.
- `services/shared-daily-state.service.ts` is the bridge that projects canonical AIQ check-in and habit data into the Habigoal daily state and writes both products back to the same records.

## Runtime Flow

1. The app selector routes the user to the selected product login with the selected persona.
2. The login endpoint normalizes the email, resolves or creates the user, applies product entitlements, creates the session, and redirects to the product surface.
3. Habigoal loads `getHabigoalTodayProjection()`, which reads the authenticated athlete profile, AIQ lifestyle check-in, and habit record for the Budapest local day.
4. Habigoal daily operation writes through `patchSharedDailyState()`, then runs `runAthleteIqDailyEngine()` to recalculate Daily IQ, plans, pain guardrails, twin projections, and coach actions.
5. Athlete IQ dashboard loads `getAthleteIqProductDashboardProjection()`, scoped by the authenticated user and accessible athlete IDs.
6. Athlete IQ athlete persona receives `AiqAthleteWorkspace`; trainer and professional personas receive the team and club command workspace.
7. `GET/PATCH /api/daily-state` exposes the same shared daily state contract for product clients and runs the engine after writes.

## API Contracts

`GET /api/daily-state?product=habigoal|athlete-iq&athleteId=&date=&timezone=`

- Requires an authenticated user.
- Requires entitlement to the selected product.
- Requires athlete access for explicit `athleteId`.
- Creates no fallback records.
- Returns `projection`, `correlationId`, `generatedAt`, and `latencyMs`.

`PATCH /api/daily-state`

Body:

```json
{
  "product": "habigoal",
  "athleteId": "507f1f77bcf86cd799439011",
  "localDate": "2026-06-27",
  "timezone": "Europe/Budapest",
  "values": {
    "energy": 80,
    "mood": 70,
    "sleep": 75,
    "soreness": 20
  },
  "habits": ["hydrate", "move", "sleep"],
  "idempotencyKey": "product:athlete:date"
}
```

- `values` must include `energy`, `mood`, `sleep`, and `soreness` as `0-100`.
- `habits` uses Habigoal keys and maps to canonical `habit_records` fields.
- Writes `athleteiq_checkins` in `lifestyle` mode and `habit_records`.
- Runs the Athlete IQ daily engine after the write.
- Returns `projection`, `engineRun`, `correlationId`, `generatedAt`, and `latencyMs`.

`POST /api/habigoal/daily-operation`

- Uses the same shared daily-state write path.
- Runs the same Athlete IQ daily engine.
- Returns the refreshed Habigoal projection for the mobile app.

## Seed Operation

Command:

```bash
npm run db:seed-haho-ecosystem -- --reset
```

Dry run:

```bash
npm run db:seed-haho-ecosystem -- --dry-run
```

Rollback:

```bash
npm run db:seed-haho-ecosystem -- --rollback
```

The seed is scoped by `generatedBy: "haho-ecosystem-live-data-v1"` and creates:

- 5 trainers: `trainer1@haho.ai` to `trainer5@haho.ai`
- 25 athletes: `athlete11@haho.ai` to `athlete55@haho.ai`
- 5 teams with five athletes each
- 90 Budapest-local days of lifestyle check-ins, performance check-ins, habit records, training load records, Daily IQ snapshots, daily plans, pain alerts where needed, and coach actions
- Both Habigoal and Athlete IQ entitlements for all 30 users

The requested typo `athlete25@haho.au` is corrected to `athlete25@haho.ai` and recorded in the seed manifest.

The seed must not be used as hidden UI fallback data. It creates Atlas records only. A new login not present in Atlas remains empty until the user records data.

## UX States

Habigoal daily flow:

1. `empty_day`: profile exists but no daily data.
2. `check_in_in_progress`: at least one check-in value is missing.
3. `habits_in_progress`: check-in values are complete but habit review is not saved.
4. `ready_to_save`: check-in and habit review are ready.
5. `saving`: write is in progress.
6. `saved_status`: saved daily state and status are available.
7. `save_failed_retryable`: transient write or engine failure.
8. `save_failed_blocked`: entitlement, profile, or athlete access failure.

Athlete IQ states:

- Trainer view: team command, active queue, roster, service coverage, and operational actions.
- Athlete view: own Daily IQ/readiness/mental state, daily state, support queue, and shared data context.
- Empty view: authenticated user with no connected athlete records sees product-owned empty state only, with no generated UI data.

## Accessibility

- Product UI uses GDS primitives and GDS action vocabulary.
- Habigoal mobile navigation has an accessible `nav` label and fixed bottom positioning.
- Sliders expose `aria-label`.
- Status and error feedback uses `role="status"` or `role="alert"`.
- Product logos are decorative where adjacent text provides the product name.
- The selector and product pages must not include copy that says the surface is temporary, sample-only, or only for a sales walkthrough.

## Observability

- Habigoal daily operation logs `habigoal.daily_operation.start`, `.success`, and `.failure`.
- Shared daily API logs `shared_daily_state.loaded` and `shared_daily_state.patched`.
- Logs include correlation IDs, latency, product, hashed athlete identifiers, and engine partial-failure counts.
- Structured error responses include `correlationId`, `retryable`, and stable error codes.

## Retries And Recovery

- Client writes send an `idempotencyKey`.
- Daily check-in persistence is upserted by athlete, local date, and mode.
- Habit persistence is upserted by athlete and date.
- The daily engine reports partial failures instead of discarding the successful write.
- Seed rollback deletes only records marked with `generatedBy: "haho-ecosystem-live-data-v1"`.
- The release gate can skip Atlas validation with `HAHO_RELEASE_GATE_SKIP_ATLAS=1` for local static verification.

## Verification

Static and local verification:

```bash
npm run test -- services/shared-daily-state.service.test.ts lib/product-entitlements.test.ts app/api/auth/login/route.test.ts
npm run typecheck
HAHO_RELEASE_GATE_SKIP_ATLAS=1 npm run haho:release-gate
npm run i18n:audit
npm run product-boundary:audit
npm run build
```

Atlas verification after seeding:

```bash
npm run db:seed-haho-ecosystem -- --reset
npm run haho:release-gate
```

The release gate checks required artifacts, package scripts, banned product wording, AIQ/Habigoal UI markers, and Atlas coverage for the 30-person Haho cohort when Atlas validation is enabled.
