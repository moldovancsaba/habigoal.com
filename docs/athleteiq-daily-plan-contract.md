# AthleteIQ Daily Plan Contract

Last updated: 2026-06-26

This is the shipped contract for issue `#223` / capability `AIQ-1250`.

## Purpose

Daily Plan generates a short daily checklist and one session recommendation from Daily IQ, Mental Edge, pain guardrails, habits, and available day context. It is explainable, source-labeled, and safety-first.

## Inputs

- Latest Daily IQ snapshot
- Mental Edge snapshot and routines
- Pain Safety guardrail
- Habit record
- Existing daily plan for completion preservation

Calendar context is represented by live session-planning contracts when available; no hidden fallback advice is generated.

## Plan Contract

- `DailyPlan = id, athleteId, localDate, status, tasks, recommendation, dataUsed, missingData, generatedAt, version`
- `DailyTask = id, category, titleKey, descriptionKey, priority, sourceReasonCodes, dueWindow, completionState`
- `SessionRecommendation = intensity, type, durationRange, rationale, blockedByPainGuardrail`

Version: `aiq-daily-plan-1250.1`

## Algorithm

1. Add safety tasks first.
2. Add setup prompt when Daily IQ is missing or insufficient.
3. Add incomplete Mental Edge routines.
4. Add habit-gap tasks from canonical habit definitions.
5. Cap to seven tasks.
6. Select session recommendation from Daily IQ confidence/score and Pain Safety guardrail.

Priority sort: safety, score-driven/mental, habit, setup fallback. High intensity is forbidden under pain cap or low confidence.

## APIs

- `POST /api/athleteiq/daily-plan/generate`
- `GET /api/athleteiq/daily-plan/today?athleteId=&timezone=&localDate=`
- `PATCH /api/athleteiq/daily-plan/tasks/:id`

Patch request:

```json
{
  "athleteId": "athlete-id",
  "localDate": "2026-06-26",
  "completionState": "completed"
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
load Daily IQ, Mental Edge, Pain Guardrail, habits, previous plan
generate deterministic task ids
preserve completed/dismissed task states when tasks remain valid
persist one active plan per athlete/localDate
return render-ready checklist and recommendation
```

## UX And Accessibility Contract

No new UI shell is shipped in this issue. Any UI consumer must use GDS-only components.

Required states: loading, empty, setup prompt, generated, stale, task completed, task dismissed, validation error, authorization error, retryable failure, regeneration, and safety-blocked recommendation. The session recommendation must show reason labels and pain/confidence blockers as text, not color alone.

## Observability

Structured logs use `capabilityKey: "AIQ-1250"` with correlation id, event name, task count or task id, success/failure status, and latency.

## Retries And Timeouts

Generation is idempotent by `athleteId + localDate`; repeated generation updates the active plan and preserves valid completed task states. Task PATCH can be retried only when the API returns `retryable: true`.

## Rollback And Recovery

Rollback is additive: revert the commit that introduced `AIQ-1250` and remove consumers of the daily-plan endpoints. The `athleteiq_daily_plans` collection can remain because existing routes do not depend on it.

If check-in, Daily IQ, pain, mental, or habit data changes, call generate again for the same athlete/date. Safety-invalid tasks are replaced by the new plan, while still-valid completed tasks preserve state.

## Edge Cases

- Before check-in, the plan includes a conservative setup prompt.
- High intensity is blocked under pain cap or low confidence.
- Completed tasks survive recalculation when their deterministic id remains present.
- No task is generated from future/lite modules as an active claim.

## Verification

```bash
npm run test -- lib/athleteiq-daily-plan.test.ts
npm run build
npm run typecheck
```
