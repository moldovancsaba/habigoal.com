# Habigoal Production Delivery

## Source

GitHub issues `#299` through `#308` define this delivery slice. They follow the canonical engineering issue structure in `sovereignsquad/general-design-system#81`.

This delivery follows the shared athlete profile contract in [Product Surface Shared Athlete Profile Contract](product-surface-shared-athlete-profile-contract.md). Habigoal is an independent white-label habitbuilder for any signed-in person. It stores personal routine records in the shared athlete-compatible profile and daily history collections so Athlete IQ can consume them later only when professional entitlement, assignment, and consent rules allow it; it is not a copy, demo, or separate local data store.

## Production Rules

- Habigoal is a live mobile app surface.
- Habigoal writes to a personal routine profile and canonical daily history that Athlete IQ can consume when professional entitlement, assignment, and consent rules allow it.
- Habigoal-only users must not be able to enter Athlete IQ.
- Athlete IQ users may use Habigoal as a simpler personal habitbuilder.
- Trainer, coach, admin, and staff Habigoal sessions remain personal routine sessions, not assigned-athlete management sessions.
- The app must not render presentation, theme, demo, lorem ipsum, or internal engine language.
- MongoDB Atlas is the source of truth for users, personal routine profiles, check-ins, habits, and projections.
- A new Habigoal account starts empty. Profile provisioning creates only a personal routine shell, not measurements, habits, check-ins, or scores.
- UI, spacing, action controls, and accessibility states must stay inside the approved GDS/Mantine adapter already governed by the project GDS manifest.

## Runtime Flow

1. The selector sends the user to `/{locale}/login` with a selected product surface and persona.
2. `POST /api/auth/login` normalizes the email, upserts the user, stores the selected persona in the session, and redirects only to the matching product.
3. `/{locale}/habigoal` requires Habigoal entitlement before loading data.
4. `getHabigoalTodayProjection` resolves or creates an empty personal routine profile shell for a first-time Habigoal user.
5. The projection reads today's check-in and habit records from MongoDB Atlas.
6. If today's check-in and habits are incomplete, the UI starts with the recording journey, not with a daily status result.
7. The user records today's check-in signals and daily habits.
8. `POST /api/habigoal/daily-operation` saves the check-in and habits, resolving the personal routine profile when no `athleteId` is supplied, runs the mirrored Athlete IQ daily engine, and returns the refreshed Habigoal projection.
9. The backend daily status service returns `score: null` when no live daily data exists and returns today's status only after the daily operation is recorded.
10. The UI shows status, rationale, and next action after save succeeds.

## Habigoal Daily UX Flow

Status is a post-recording outcome. It must not be the first primary card for an incomplete day.

1. Entry state: show today's progress and the next required action.
2. Check-in state: collect wellbeing signals with labeled mobile controls.
3. Habits state: collect completed daily habits.
4. Review state: summarize today's check-in and habits before save.
5. Saving state: disable repeated submits and keep input visible.
6. Status state: show score/status, reason, confidence, and next action only after the save succeeds.
7. Returning state: if today's operation exists, show today's saved status; if not, show the recording CTA and keep previous history secondary.

## API Contract

`POST /api/habigoal/daily-operation`

```json
{
  "athleteId": "507f1f77bcf86cd799439011",
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

`athleteId` is optional for Habigoal personal routine saves. When omitted, the server resolves or creates the signed-in user's personal routine profile before writing.

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
