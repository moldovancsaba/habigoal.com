# AthleteIQ Pain Safety Contract

Last updated: 2026-06-26

This is the shipped contract for issue `#222` / capability `AIQ-1240`.

## Purpose

Pain Safety converts high or repeated pain signals into deterministic readiness caps, coach alerts, and recovery-first routing. It is not a diagnosis and cannot be overridden to permit high-intensity recommendations while the cap applies.

## Inputs

- Adaptive check-in `pain`
- Optional `sorenessAreas`
- Optional check-in `trainingLoad`
- Three-day recurrence window

## Algorithm

Algorithm version: `aiq-pain-safety-1240.1`

- Pain `<= 3`: `none`
- Missing pain: `monitor`
- Pain `4-6`: `monitor`
- Pain `>= 7`: `capped`
- Pain `>= 5` for three days: `coach_review`

`capped` and `coach_review` set `dailyIqCap: 60` and `maxTrainingIntensity: "recovery"`.

## State Machine

States:

- `none`
- `monitor`
- `capped`
- `coach_review`
- `resolved`
- `dismissed`

System evaluation can create or update `monitor`, `capped`, and `coach_review`. Coach/performance roles can patch alerts to `resolved`, `dismissed`, `monitor`, or `coach_review`. Audit history is appended on state transitions.

## APIs

- `GET /api/athleteiq/pain-alerts?athleteId=&timezone=&localDate=`
- `PATCH /api/athleteiq/pain-alerts/:id`
- `GET /api/athleteiq/pain-guardrail/today?athleteId=&timezone=&localDate=`

Patch request:

```json
{
  "state": "resolved",
  "note": "Coach reviewed and moved athlete to recovery session."
}
```

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
load pain signals for today and prior two days
evaluate state, risk, Daily IQ cap, and max intensity
upsert alert when state is monitor/capped/coach_review
append audit history on PATCH transitions
return guardrail or alert list with source and missing-data labels
```

## UX And Accessibility Contract

No new UI shell is shipped in this issue. Any UI consumer must use GDS-only components.

Required states: loading, no pain alert, monitor, capped, coach review, resolved, dismissed, validation error, authorization error, retryable failure, acknowledge, resolve, and dismiss. Pain state must be shown with text and icons/labels, not color alone.

## Observability

Structured logs use `capabilityKey: "AIQ-1240"` and include correlation id, event name, state, alert count, success/failure status, and latency. Logs must not include diagnosis claims.

## Retries And Timeouts

Alert creation is idempotent by `athleteId + localDate`. PATCH transitions append audit history and can be retried only when the API returns `retryable: true`. Database timeout behavior is inherited from the shared MongoDB client.

## Rollback And Recovery

Rollback is additive: revert the commit that introduced `AIQ-1240` and remove consumers of the pain endpoints. The `athleteiq_pain_alerts` collection can remain because existing routes do not depend on it.

If same-day check-in pain is edited, call the guardrail or alert-list endpoint again. The current alert updates unless a coach already resolved or dismissed it.

## Edge Cases

- Missing pain blocks high-intensity recommendation through `monitor`.
- Coach override cannot bypass a `capped` or `coach_review` guardrail.
- Repeated moderate pain escalates even without a single high-pain day.
- Resolved or dismissed alerts remain auditable.

## Verification

```bash
npm run test -- lib/athleteiq-pain-safety.test.ts
npm run build
npm run typecheck
```
