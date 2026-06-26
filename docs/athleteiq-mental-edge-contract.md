# AthleteIQ Mental Edge Contract

Last updated: 2026-06-26

This is the shipped contract for issue `#221` / capability `AIQ-1230`.

## Purpose

Mental Edge is an MVP-active pillar for safe self-report scoring, supportive athlete routines, and coach-visible alert candidates for repeated concern patterns. It is non-clinical and does not expose private reflection body text.

## Inputs

- Adaptive check-in mental fields: `mood`, `stress`, `motivation`, `confidence`, `focus`
- Recent check-ins for two-of-three-day pattern detection
- Routine completion records

Reflection body is excluded by default. `reflectionTone` remains an explicit missing signal until a safe metadata source exists.

## Algorithm

Algorithm version: `aiq-mental-edge-1230.1`

- Positive fields normalize from 1-10 to 0-100.
- Stress is inverted.
- Score is the average of available mental signals.
- `stable`: score `>= 60`
- `watch`: score `< 60`
- `concern`: score `< 40`
- `urgent`: stress `>= 9`, mood `<= 2`, or confidence `<= 2`
- `insufficient`: no mental check-in

A moderate coach alert is created when a low pattern repeats in two of three days. A high alert candidate is created on extreme thresholds.

## APIs

- `GET /api/athleteiq/mental-edge/today?athleteId=&timezone=&localDate=`
- `POST /api/athleteiq/mental-edge/routines/:routineId/complete`
- `GET /api/athleteiq/coach/mental-alerts?teamId=&timezone=&localDate=`

Routine ids:

- `breathing-reset`
- `confidence-note`
- `recovery-reflection`
- `coach-check-in`

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
authorize athlete or team access
load today's check-in and two previous days
compute score, risk level, trend, routines, and alert candidate
exclude reflection body from all coach/parent responses
return render-ready payload with source labels and missing signals
```

## Coach Alerts

Coach alerts contain only:

- `athleteId`
- `localDate`
- `severity`
- `reasonCodes`
- `recommendedCoachAction`
- `visibleSourceLabels`
- `score`
- `trend`
- `privateFieldsExcluded`

They do not include journal/reflection body text.

## UX And Accessibility Contract

No new UI shell is shipped in this issue. Any UI consumer must use GDS-only components.

Required states: loading, empty, insufficient data, stable, watch, concern, urgent, routine completed, validation error, authorization error, retryable failure, acknowledge, resolve, and dismiss. Coach queues must expose reason, trend, source labels, and state using text, not color alone.

## Observability

Structured logs use `capabilityKey: "AIQ-1230"` and include correlation id, event name, risk level or alert count, success/failure status, and latency. Authorization denials are logged without private mental content.

## Retries And Timeouts

Routine completion is idempotent by `athleteId + routineId + localDate`. Clients may retry only `retryable: true` errors. Database timeouts inherit the shared MongoDB client behavior.

## Rollback And Recovery

Rollback is additive: revert the commit that introduced `AIQ-1230` and remove consumers of the three Mental Edge endpoints. The `athleteiq_mental_routine_completions` collection can remain because existing routes do not depend on it.

Dismissed or completed routines remain auditable by date. If a check-in is corrected, read endpoints recompute the current Mental Edge response from the latest check-in data.

## Edge Cases

- Missing mental fields suppress coach alerts unless an explicit help-request routine is completed later.
- Lifestyle check-ins with only mood/stress can produce a lower-confidence score but will show missing motivation/confidence/focus.
- Private reflections stay hidden unless a future explicit sharing contract is implemented.
- Alerts are candidates; coach acknowledgement/resolution remains a separate coach action workflow.

## Verification

```bash
npm run test -- lib/athleteiq-mental-edge.test.ts
npm run build
npm run typecheck
```
