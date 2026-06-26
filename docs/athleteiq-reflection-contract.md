# AthleteIQ Reflection Memory Contract

Last updated: 2026-06-26

This is the shipped contract for issue `#227` / capability `AIQ-1290`.

## Purpose

The reflection memory contract stores raw daily reflection text private by default and creates deterministic safe tags for next-day planning. It uses local rules only; no external AI provider or OpenAI integration is used.

## Data Contract

- `ReflectionVisibility = private | coach_summary | parent_summary`
- `ReflectionEntry = id, athleteId, localDate, body, moodTag, visibility, safeSummary, derivedTags, createdAt, updatedAt`
- `MemoryHandoff = athleteId, fromDate, toDate, tags, summaryForPlanning, sourceReflectionIds, excludedPrivateContent`

Version: `aiq-reflection-1290.1`

## APIs

- `POST /api/athleteiq/reflections`
- `GET /api/athleteiq/reflections/day?athleteId=&date=`
- `PATCH /api/athleteiq/reflections/:id/visibility`
- `GET /api/athleteiq/memory-handoff?athleteId=&date=`

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
authorize athlete access
save raw reflection as private by default
derive deterministic safe tags from local keyword rules
return role-redacted reflection views
build next-day memory handoff from tags and shared summaries
exclude private raw text from planning handoff
```

## Privacy Rules

- Raw reflection body is visible only to the linked athlete.
- Coach and parent views receive summaries/tags only when visibility allows it.
- Private reflections can still contribute derived tags to the athlete's own planning handoff, but raw text is excluded.
- Unsharing updates future views because handoff reads current visibility at request time.

## Observability

Structured logs use `capabilityKey: "AIQ-1290"` and include correlation id, athlete id, reflection id where available, privacy classification, success/failure status, and latency.

Events:

- `athleteiq.reflection.created`
- `athleteiq.reflection.skipped_blank`
- `athleteiq.reflections.day_viewed`
- `athleteiq.reflection.visibility_updated`
- `athleteiq.memory_handoff.viewed`

## UX And Accessibility Contract

No new UI shell is shipped in this issue. Any reflection UI must use GDS-only components and provide keyboard-reachable privacy controls, visible sharing labels, non-hover-only disclosure text, loading/saving/error states, and screen-reader names for visibility toggles.

## Rollback And Recovery

Rollback is additive: remove consumers of the reflection endpoints or disable the capability in the module registry. Existing `athleteiq_reflections` data remains readable and does not block check-in, Daily Plan, session, or calendar flows.

## Verification

```bash
npm run test -- lib/athleteiq-reflection.test.ts
npm run typecheck
npm run build
```
