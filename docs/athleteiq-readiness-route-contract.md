# AthleteIQ Readiness Route Contract

Issue: `#234`  
Capability: `AIQ-1245`  
Version: `aiq-readiness-route-1245.1`

## Scope

The readiness route engine maps Daily IQ readiness and pain guardrails into `green`, `amber`, or `red` routes. It records the rules used, caps applied, missing data, confidence, and allowed/blocked actions. It does not replace Daily IQ or pain safety; it consumes those existing contracts.

## APIs

- `GET /api/athleteiq/readiness-route/today?athleteId=&localDate=&timezone=`
- `POST /api/athleteiq/readiness-route/recalculate`

Both APIs return structured errors `{ code, messageKey, retryable, correlationId }`.

## Route Rules

- Green requires readiness at or above 70, sufficient confidence, and no high-pain/high-intensity block.
- Amber covers moderate readiness, missing Daily IQ, low/insufficient confidence, or partial data.
- Red covers high pain, coach-review pain, high-intensity block, or readiness below 45.

High pain overrides the base score and prevents green.

## Persistence

Snapshots are stored in `athleteiq_readiness_routes` by athlete and local date. Recalculation appends audit history rather than allowing manual overwrite.

## UX And Accessibility Contract

Any UI must use the General Design System only. Route badges must include a text label, allowed action, and rule reason; color cannot be the only state indicator. Loading, saving, empty, retry, error, and completed states must be announced and keyboard reachable.

## Observability

Events:

- `athleteiq.readiness_route.viewed`
- `athleteiq.readiness_route.recalculated`

Each event includes `capabilityKey=AIQ-1245`, correlation id, athlete id where permitted, route, and latency.

## Rollback

Disable route exposure or hide the feature through module registry/feature flag. Historical snapshots remain readable because they are source-labelled and versioned.
