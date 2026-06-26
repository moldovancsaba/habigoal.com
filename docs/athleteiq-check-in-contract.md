# AthleteIQ Adaptive Check-In Contract

Last updated: 2026-06-26

This is the shipped contract for issue `#219` / capability `AIQ-1210`.

## Modes

- `lifestyle`: five required wellness fields plus optional note.
- `performance`: lifestyle fields plus optional performance/manual-device fields.

Lifestyle required fields:

- `sleepQuality`
- `fatigue`
- `pain`
- `stress`
- `mood`

Performance optional fields:

- `motivation`
- `confidence`
- `focus`
- `trainingLoad`
- `sorenessAreas`
- `sleepHours`
- `manualHrv`
- `manualRestingHr`
- `deviceSourceStatus`

## Normalization

Integer 1-10 fields are normalized with:

```ts
normalized = (value - 1) / 9 * 100
```

No Daily IQ score is computed in this capability.

## Snapshot

Snapshots are persisted in `athleteiq_checkins` with:

- `athleteId`
- `mode`
- `localDate`
- `timezone`
- `values`
- `missingFields`
- `sourceLabels`
- `submittedAt`
- `updatedAt`
- `idempotencyKey`
- `auditHistory`

Same-day duplicate submissions update the existing snapshot for `athleteId + localDate + mode` and append audit history.

Athlete timezone controls `localDate`. If a supplied timezone cannot be formatted by the runtime, the API falls back to the server UTC date instead of rejecting the submission.

## Runtime Flow

```ts
correlationId = createAthleteIqCorrelationId()
user = getAuthUser()
body = readJson(request)
snapshot = buildAthleteIqCheckInSnapshot(body)
authorize(user, snapshot.athleteId)
persist snapshot by athleteId + localDate + mode
if pain >= 8:
  write audit event for downstream safety workflow
  emit structured operational log
return snapshot without Daily IQ computation
```

`buildAthleteIqCheckInSnapshot` is pure and contains the field parsing, normalization, source-label assignment, missing-field detection, and high-pain signal calculation. Persistence is isolated in `repositories/athleteiq-check-in.repository.ts`.

## APIs

- `GET /api/athleteiq/check-ins/schema?athleteId=&mode=`
- `POST /api/athleteiq/check-ins`
- `GET /api/athleteiq/check-ins/today?athleteId=&mode=&timezone=`

All errors use:

```ts
{
  code: string;
  messageKey: string;
  retryable: boolean;
  correlationId: string;
}
```

## Safety

High pain (`pain >= 8`) emits a privacy-safe operational event for downstream safety workflows. It does not diagnose injury and must not produce medical claims.

## Observability

Every API response includes `correlationId`, `generatedAt`, and `latencyMs`. Authorization denials, successful submissions, and high-pain reports emit structured JSON logs with `capabilityKey: "AIQ-1210"`.

High-pain reports also write a non-blocking audit event with `resourceType: "athleteiq_checkin_safety_event"`. Audit failure is swallowed by the shared audit helper so the athlete's check-in is not lost because a secondary safety event sink is unavailable.

## Retries And Timeouts

MongoDB server selection is controlled by the shared database client timeout. Clients may retry only `retryable: true` errors. Validation and authorization errors are not retryable without changing the request or permissions.

Use a stable `idempotencyKey` such as `athleteId:localDate:mode` for client retries. The canonical duplicate behavior is same-day update by `athleteId + localDate + mode`; repeated submissions replace current values and append `auditHistory`.

## Rollback And Recovery

Rollback is additive: revert the commit that introduced `AIQ-1210` and remove consumers of the three `/api/athleteiq/check-ins/*` endpoints. The `athleteiq_checkins` collection can remain in MongoDB because no existing route depends on it.

If bad data is submitted, recover by posting a corrected same-day snapshot for the same athlete, timezone, and mode. The repository updates the current snapshot and preserves audit history.

## Edge Cases

- Missing required lifestyle fields return `VALIDATION_ERROR`; no imputation occurs.
- Integer wellness/performance fields must be whole numbers from 1 to 10.
- Manual HRV, resting heart rate, sleep hours, and training load are range checked but not normalized.
- `sorenessAreas` accepts up to 20 trimmed strings.
- `deviceSourceStatus` accepts `manual`, `connected`, or `unavailable`.
- Invalid or missing `mode` defaults to `lifestyle`.
- The contract does not infer injury, readiness, or Daily IQ.

## Accessibility / UI Contract

No new UI shell is shipped in this issue. Any UI consumer must use GDS-only components and provide loading, saving, validation, disabled, submitted, retry, and empty states with keyboard access, visible focus, screen-reader labels, and non-color-only state.

## Verification

```bash
npm run test -- lib/athleteiq-check-in.test.ts
npm run build
npm run typecheck
```
