# AthleteIQ Session Lifecycle Contract

Last updated: 2026-06-26

This is the shipped contract for issue `#225` / capability `AIQ-1270`.

## Purpose

The session lifecycle turns a Daily Plan recommendation into an executable training session with blocks, state transitions, debrief capture, and training-load logging. It is additive to the Daily OS and uses the existing Habigoal database.

## Inputs

- Daily Plan recommendation for `athleteId + localDate`
- Pain Safety guardrail for the same athlete/date
- Authenticated actor and server-side athlete access check
- Debrief fields: RPE, completion percentage, pain after, mood after, optional notes

## Session Contract

- `SessionState = draft | active | paused | completed | abandoned`
- `SessionBlock = type, durationMinutes, intensity, instructionsKey, safetyNotesKey`
- `SessionLog = sessionId, athleteId, startedAt, completedAt, rpe, completionPct, painAfter, moodAfter, notes, sourcePlanId, estimatedLoadPoints`

Version: `aiq-session-1270.1`

## APIs

- `POST /api/athleteiq/sessions/from-plan`
- `GET /api/athleteiq/sessions?athleteId=&from=&to=`
- `PATCH /api/athleteiq/sessions/:id/state`
- `POST /api/athleteiq/sessions/:id/debrief`

All API errors use the AthleteIQ structured error shape:

```ts
{
  code: string;
  messageKey: string;
  retryable: boolean;
  correlationId: string;
  details?: unknown;
}
```

## Runtime Flow

```ts
correlationId = createAthleteIqCorrelationId()
user = getAuthUser()
authorize athlete access before create/list/mutate
load daily plan and pain guardrail
create deterministic draft session from athleteId + localDate
validate pain guardrail before start
persist auditable state transitions
capture debrief and completed load estimate
write session RPE into the training-load collection
emit session.completed and score.recalculate_requested events
```

## Load Algorithm

Session load estimate:

```ts
durationMinutes * intensityFactor * boundedRpe
```

Intensity factors:

- high: `1`
- moderate: `0.8`
- low: `0.6`
- recovery: `0.4`

The result is capped at `900` load points.

## UX And Accessibility Contract

No new UI shell is shipped in this issue. Any UI consumer must use GDS-only components.

Required UI states are draft, active, paused, completed, abandoned, loading, saving, retryable error, validation error, safety-blocked start, empty session list, and restored-after-network-interruption. Timer UI must not rely on animation alone; reduced-motion users need static elapsed/remaining text.

## Observability

Structured logs use `capabilityKey: "AIQ-1270"` and include correlation id, event name, session id, athlete id where allowed, state, success/failure status, and latency.

Events:

- `athleteiq.session.created_from_plan`
- `athleteiq.sessions.listed`
- `athleteiq.session.state_updated`
- `athleteiq.session.completed`
- `athleteiq.score.recalculate_requested`

## Retries And Timeouts

- Creating from plan is idempotent by `athleteId + localDate`.
- Repeating the same state transition returns the current session without duplicating audit work.
- Debrief writes are upserted into training RPE by `sessionId + athleteId`.
- Clients must preserve debrief input when receiving retryable errors.

## Rollback And Recovery

Rollback is additive: remove consumers of the session endpoints or disable the capability in the module registry. Existing `athleteiq_sessions` and `session_rpe_results` data remains readable and does not block older Daily Plan flows.

Abandoned sessions require a reason and cannot be debriefed. If pain worsens mid-session, the client should transition to `abandoned` or complete with debrief values that trigger coach review downstream.

## Verification

```bash
npm run test -- lib/athleteiq-session.test.ts
npm run typecheck
npm run build
```
