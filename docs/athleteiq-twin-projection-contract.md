# AthleteIQ Digital Athlete Twin Projection Contract

Last updated: 2026-06-26

This is the shipped contract for issue `#224` / capability `AIQ-1260`.

## Purpose

The Digital Athlete Twin projection composes a role-filtered profile across active MVP data, lite/manual indicators, and future roadmap dimensions. It preserves module maturity truth and does not invent values for future modules.

## Inputs

- Athlete profile from the existing athlete/children collection
- Latest Daily IQ snapshot
- Mental Edge snapshot
- Pain Safety guardrail
- Habit record
- Daily Plan
- AthleteIQ module maturity registry

## Projection Contract

- `AthleteTwinProjection = athlete, activeDimensions, liteDimensions, futureDimensions, sourceConfidence, updatedAt`
- `ProfileDimension = key, status, valueSummary, sourceLabels, visibilityByRole, lastUpdatedAt`

Projection version: `aiq-twin-projection-1260.1`

Dimension statuses:

- `active`
- `lite_manual`
- `future`
- `setup_required`
- `redacted`

Future dimensions always return `valueSummary: null` and `sourceLabels: ["future_source_only"]`.

## APIs

- `GET /api/athleteiq/athletes/:id/twin?view=athlete|coach|parent|team`
- `POST /api/athleteiq/athletes/:id/twin/rebuild`

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
authorize athlete access and requested view
load athlete profile and module snapshots
compose active dimensions first
append lite/manual indicators
append future roadmap dimensions with null values
redact private mental and pain details for parent view
return render-ready projection with source confidence and maturity labels
```

`POST /rebuild` persists the latest projection snapshot in `athleteiq_twin_projections`. `GET` composes live and does not require a persisted projection.

## Role Privacy

Parent view redacts Mental Edge and Pain Safety details. Redacted dimensions expose `status: "redacted"`, `sourceLabels: ["redacted_by_role"]`, and explicit `redactedFields` instead of private values.

## UX And Accessibility Contract

No new UI shell is shipped in this issue. Any UI consumer must use GDS-only components. Required UI states: loading, active, setup-required, redacted, lite/manual, future roadmap, empty, validation error, authorization error, retryable failure, and rebuild success. Badges/tabs/cards/tables must use GDS and non-color-only labels.

If a required GDS component or state pattern is missing, create a request issue in `sovereignsquad/general-design-system` before adding local UI.

## Observability

Structured logs use `capabilityKey: "AIQ-1260"` with correlation id, view, athlete id, success/failure status, and latency. Logs must not include private mental or pain content.

## Retries And Timeouts

`GET` is read-only and can be retried on retryable structured errors. `POST /rebuild` is idempotent by `athleteId + view` and overwrites the stored projection snapshot.

## Rollback And Recovery

Rollback is additive: revert the commit that introduced `AIQ-1260` and remove consumers of the twin projection endpoints. The `athleteiq_twin_projections` collection can remain because existing routes do not depend on it.

If source module data changes, call `POST /rebuild` again or use `GET` for live composition.

## Edge Cases

- No check-in or Daily IQ returns setup-required active dimensions.
- Parent view excludes private mental and pain details.
- Future dimensions never show fake values.
- Lite/manual dimensions show manual requirement labels rather than active claims.

## Verification

```bash
npm run test -- lib/athleteiq-twin-projection.test.ts
npm run build
npm run typecheck
```
