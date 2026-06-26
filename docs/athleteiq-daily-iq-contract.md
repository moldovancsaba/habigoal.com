# AthleteIQ Daily IQ Composite Contract

Last updated: 2026-06-26

This is the shipped contract for issue `#220` / capability `AIQ-1220`.

## Purpose

Daily IQ is a transparent composite over readiness, Mental Edge, habit consistency, safe load, pain guardrails, and confidence. It consumes the adaptive check-in contract from `AIQ-1210`; it does not replace the legacy operating-score compatibility layer.

## Inputs

- Adaptive check-in snapshot from `athleteiq_checkins`
- Habit record from `habit_records`
- Session load from check-in `trainingLoad` or `training_load_records`
- Module registry version from `AIQ-1201`

No check-in returns `confidence: "insufficient"` and `dailyIqScore: null`.

## Algorithm

Algorithm version: `aiq-daily-iq-1220.1`

Weights:

- readiness: `0.40`
- mentalEdge: `0.30`
- habit: `0.20`
- safeLoad: `0.10`

Readiness uses sleep quality, inverted fatigue, inverted stress, and mood. Mental Edge uses mood, inverted stress, confidence, focus, and motivation. Habit score uses the canonical weighted habit scorer. Safe load uses the existing training-load scoring utility.

High pain (`pain >= 8`) caps Daily IQ at `60` and blocks high-intensity recommendations. Moderate pain (`pain >= 5`) caps Daily IQ at `75`. The score is not a diagnosis.

## Snapshot

Every recalculation inserts an immutable document in `athleteiq_daily_iq_snapshots`:

- `calculationId`
- `athleteId`
- `localDate`
- `timezone`
- `mode`
- `checkInSnapshotId`
- `dailyIqScore`
- `readinessScore`
- `mentalEdgeScore`
- `habitScore`
- `safeLoadScore`
- `painRiskLevel`
- `confidence`
- `dataUsed`
- `missingData`
- `explanation`
- `algorithmVersion`
- `moduleRegistryVersion`
- `componentWeights`
- `painCapApplied`
- `highIntensityBlocked`
- `createdAt`

Today and history APIs return the latest recalculation per local date.

## APIs

- `POST /api/athleteiq/daily-iq/recalculate`
- `GET /api/athleteiq/daily-iq/today?athleteId=&mode=&timezone=`
- `GET /api/athleteiq/daily-iq/history?athleteId=&from=&to=&mode=&timezone=`

All errors use:

```ts
{
  code: string;
  messageKey: string;
  retryable: boolean;
  correlationId: string;
}
```

## Runtime Flow

```ts
correlationId = createAthleteIqCorrelationId()
user = getAuthUser()
authorize athlete access
load check-in, habit record, training load, registry version
compute readiness, mentalEdge, habit, safeLoad
apply pain caps and confidence rules
insert immutable Daily IQ snapshot
project response by role
return source-labeled snapshot with correlationId
```

## Role Privacy

Daily IQ does not expose raw check-in values. Parent projections redact `mentalEdgeScore` and `painRiskLevel`. Coaches, performance staff, physios, admins, and the athlete can see component scores and pain risk labels.

## UX And Accessibility Contract

No new UI shell is shipped in this issue. Any UI consumer must use GDS-only components and must never show a bare score without confidence, explanation, data-used, and missing-data labels.

Required states: loading, empty, insufficient confidence, low confidence, recalculating, success, validation error, authorization error, retryable failure, and stale snapshot. Score visuals need text alternatives and non-color-only labels.

## Observability

Recalculation emits a structured JSON log with:

- `capabilityKey: "AIQ-1220"`
- `event: "athleteiq.daily_iq.recalculated"`
- `correlationId`
- `athleteId`
- `localDate`
- `confidence`
- `success`
- `latencyMs`

Authorization denials emit separate privacy-safe warning logs.

## Retries And Timeouts

Clients may retry only responses with `retryable: true`. Recalculation is duplicate-safe because snapshots are immutable; repeated requests create a new audit-preserving calculation and latest reads choose the newest snapshot.

Database timeout behavior is inherited from the shared MongoDB client. Async downstream recommendations should consume snapshots by `calculationId` and apply their own bounded retry/dead-letter policy.

## Rollback And Recovery

Rollback is additive: revert the commit that introduced `AIQ-1220` and remove consumers of the three `/api/athleteiq/daily-iq/*` endpoints. The `athleteiq_daily_iq_snapshots` collection can remain because existing routes do not depend on it.

If a check-in, habit, or session-load record is corrected, call `POST /api/athleteiq/daily-iq/recalculate` again for the same athlete/date/mode. The latest read APIs will surface the newest calculation while older snapshots remain available for audit.

## Edge Cases

- Missing check-in returns insufficient confidence and no numeric composite.
- Missing habit data lowers confidence but can still produce a score when check-in data exists.
- Missing session load lowers confidence and excludes safe-load weight.
- Invalid date range returns `VALIDATION_ERROR`.
- Pain guardrails override otherwise high scores.
- Future/lite modules are not promoted to active claims by Daily IQ.

## Verification

```bash
npm run test -- lib/athleteiq-daily-iq.test.ts
npm run build
npm run typecheck
```
