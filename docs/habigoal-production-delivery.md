# Habigoal Production Delivery

## Source

GitHub issues `#299` through `#308` define this delivery slice. They follow the canonical engineering issue structure in `sovereignsquad/general-design-system#81`.

## Production Rules

- Habigoal is a live mobile app surface.
- The app must not render presentation, theme, demo, lorem ipsum, or internal engine language.
- MongoDB Atlas is the source of truth for users, athlete profiles, check-ins, habits, and projections.
- A new athlete account starts empty. Profile provisioning creates only an athlete shell, not measurements, habits, check-ins, or scores.
- UI, spacing, action controls, and accessibility states must stay inside the approved GDS/Mantine adapter already governed by the project GDS manifest.

## Runtime Flow

1. The selector sends the user to `/{locale}/login` with a selected persona.
2. `POST /api/auth/login` normalizes the identifier, upserts the user, stores the selected persona in the session, and redirects only to the matching product.
3. `/{locale}/habigoal` requires an athlete session before loading data.
4. `getHabigoalTodayProjection` resolves or creates an empty athlete profile shell for a first-time athlete user.
5. The projection reads today's check-in and habit records from MongoDB Atlas.
6. The backend daily status service returns `score: null` when no live daily data exists.
7. `POST /api/habigoal/daily-operation` saves the check-in and habits, runs the existing Athlete IQ daily engine, and returns the refreshed Habigoal projection.

## API Contract

`POST /api/habigoal/daily-operation`

```json
{
  "athleteId": "string",
  "localDate": "YYYY-MM-DD",
  "timezone": "Europe/Budapest",
  "idempotencyKey": "string",
  "values": {
    "energy": 80,
    "mood": 70,
    "sleep": 85,
    "soreness": 20
  },
  "habits": ["hydrate", "move"]
}
```

Success returns `{ ok: true, operationId, status, projection, correlationId }`.

Failure returns `{ ok: false, code, retryable, correlationId }`.

## Observability

Habigoal flows emit redacted structured events:

- `habigoal.projection.empty`
- `habigoal.projection.loaded`
- `habigoal.daily_operation.start`
- `habigoal.daily_operation.success`
- `habigoal.daily_operation.failure`

Logs include hashed user/athlete identifiers only. Check-in values, habit details, emails, cookies, and tokens must not be logged.

## Verification

Run:

```bash
npm run habigoal:audit
npm run i18n:audit
npm run semantic:audit
npm run gds:audit
npm run test
npm run typecheck
npm run build
```

For a full local release gate:

```bash
npm run habigoal:release-gate
```

## Rollback

If the new daily operation fails in production:

1. Keep the pseudo-login and profile shell behavior in place.
2. Disable the Habigoal daily-operation submit button by feature flag or hotfix only if writes are unsafe.
3. Revert the daily-operation route and UI submit handler together.
4. Do not restore zero-filled projections or fake scores.
5. Use the emitted `correlationId` and `operationId` to inspect failed saves.
