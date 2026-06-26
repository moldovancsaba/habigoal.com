# AthleteIQ Stakeholder Projection Contract

Last updated: 2026-06-26

This is the shipped contract for issue `#228` / capability `AIQ-1300`.

## Purpose

Stakeholder projections compose shared AthleteIQ state into role-safe coach, parent, and team views. The layer uses existing local data only: Daily IQ, Pain Safety, Mental Edge, Daily Plan, Digital Athlete Twin projections, teams, and coach actions.

## Data Contract

- `StakeholderView = coach | parent | team`
- `CoachProjection = alerts, athleteCards, actionQueue, teamTrends`
- `ParentProjection = dailySummary, completedTasks, safeNotes, nextSupportAction`
- `TeamProjection = readinessDistribution, flagsCount, unavailableCount, sourceLabels`

Version: `aiq-stakeholder-1300.1`

## APIs

- `GET /api/athleteiq/coach/dashboard?teamId=&date=&timezone=`
- `GET /api/athleteiq/parents/summary?athleteId=&date=&timezone=`
- `GET /api/athleteiq/team/overview?teamId=&date=&timezone=`
- `POST /api/athleteiq/coach/alerts/:id/actions`

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
resolve team or athlete relationship
load Daily IQ, Pain Safety alerts, Mental Edge, Daily Plan, and Twin projection
apply stakeholder redaction matrix
aggregate team metrics only above privacy threshold
return render-ready projection
record coach alert actions into coach_actions
```

## Privacy Rules

- Parent projections redact pain risk detail, mental risk detail, raw mental signals, pain locations, and coach-only alerts.
- Coach projections include actionable alerts but exclude private reflection/raw mental fields.
- Team readiness distribution is suppressed for teams smaller than `3` athletes.
- Incomplete athletes remain visible as incomplete instead of being silently dropped.

## Observability

Structured logs use `capabilityKey: "AIQ-1300"` and include correlation id, projection view, team or athlete id, alert counts, privacy classification, success/failure status, and latency.

Events:

- `athleteiq.coach.dashboard_viewed`
- `athleteiq.parent.summary_viewed`
- `athleteiq.team.overview_viewed`
- `athleteiq.coach.alert_action_recorded`

## UX And Accessibility Contract

No new UI shell is shipped in this issue. Any stakeholder UI must use GDS-only components and provide keyboard-reachable action controls, table/list fallback for team overview, visible redaction labels, non-color-only buckets, loading/empty/error states, and screen-reader names for alert actions.

## Rollback And Recovery

Rollback is additive: remove consumers of the stakeholder endpoints or disable the capability in the module registry. Existing `coach_actions` records remain valid because they use the already shipped coach action contract.

## Verification

```bash
npm run test -- lib/athleteiq-stakeholder.test.ts
npm run typecheck
npm run build
```
