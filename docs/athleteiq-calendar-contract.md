# AthleteIQ Daily Reality Map Contract

Last updated: 2026-06-26

This is the shipped contract for issue `#226` / capability `AIQ-1280`.

## Purpose

The daily reality map stores local athlete day entries and returns a readiness-relevant timeline for sleep, school, training, recovery, travel, personal, and task windows. It does not depend on external calendar providers.

## Data Contract

- `DayEntryType = sleep | school | training | match | recovery | travel | personal | task`
- `DayEntry = id, athleteId, localDate, type, startAt, endAt, titleKeyOrText, visibility, source, linkedPlanTaskId, linkedSessionId`
- `DayContext = athleteId, localDate, timezone, entries, unscheduledEntries, loadWindows, recoveryWindows, conflicts, dataUsed, missingData`

Version: `aiq-calendar-1280.1`

## APIs

- `GET /api/athleteiq/calendar/day?athleteId=&date=&timezone=`
- `POST /api/athleteiq/calendar/entries`
- `PATCH /api/athleteiq/calendar/entries/:id`
- `DELETE /api/athleteiq/calendar/entries/:id`

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
load manual day entries from athleteiq_calendar_entries
load Daily Plan tasks for the local date
load AthleteIQ sessions for the local date
merge entries, plan tasks, and session blocks
sort timed entries
place unknown-time entries into unscheduledEntries
flag overlaps and insufficient recovery windows
return role-safe render-ready DayContext
```

## Rules

- Unknown-time entries are valid when both `startAt` and `endAt` are omitted.
- Timed entries must provide both `startAt` and `endAt`, and `startAt` must be before `endAt`.
- Overlaps are reported as conflicts without deleting or rewriting source data.
- Recovery-window signals are rule-based context only and are not medical readiness claims.
- Deletes are soft deletes so audit history survives rollback and recovery.

## Observability

Structured logs use `capabilityKey: "AIQ-1280"` and include correlation id, athlete id, date, entry counts, conflict counts, success/failure status, and latency.

Events:

- `athleteiq.calendar.day_viewed`
- `athleteiq.calendar.entry_created`
- `athleteiq.calendar.entry_updated`
- `athleteiq.calendar.entry_deleted`

## UX And Accessibility Contract

No new UI shell is shipped in this issue. Any timeline UI must use GDS-only components and provide keyboard navigation, list fallback, visible conflict labels, non-color-only statuses, reduced-motion-safe timing displays, empty state, saving state, validation state, and retryable error state.

## Rollback And Recovery

Rollback is additive: remove consumers of the calendar endpoints or disable the capability in the module registry. Existing `athleteiq_calendar_entries` data remains readable and does not block Daily Plan or session flows.

## Verification

```bash
npm run test -- lib/athleteiq-calendar.test.ts
npm run typecheck
npm run build
```
