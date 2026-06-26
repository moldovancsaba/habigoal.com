# AthleteIQ Cognitive Lite And CogLeague Boundary Contract

Issue: `#231`  
Capability: `AIQ-1330`  
Version: `aiq-cognitive-boundary-1330.1`

## Scope

Cognitive Lite is a local, non-benchmark trait journey based on athlete profile baselines. CogLeague remains a future partner module. The implementation must never present local Cognitive Lite results as CogLeague tournament results, partner benchmarks, rewards, rankings, scouting, or revenue claims.

## Runtime Flow

1. Resolve authenticated user and athlete access.
2. Read athlete profile baseline fields where available.
3. Render six trait results: `alertness`, `impulse_control`, `attention`, `risk`, `reasoning`, and `memory_retention`.
4. Label every result as `benchmarkStatus=non_benchmark`, `moduleMaturity=lite_manual`, and `source=local_profile` or `missing_local_profile`.
5. Return partial journeys with explicit missing-data labels.
6. Return CogLeague only as a disabled future boundary until partner agreement, consent, tournament windows, cohort contracts, and ranking tie-breakers are implemented.

## APIs

- `GET /api/athleteiq/cognitive-lite/results?athleteId=...`
- `GET /api/athleteiq/cogleague/tournaments`

Both APIs return structured errors `{ code, messageKey, retryable, correlationId }`. Profile reads use a bounded `2500ms` timeout and return retryable `TIMEOUT` on timeout.

## Contracts

- `CognitiveTraitResult`: trait, score, band, explanation key, signature key, improvement tip key, source, source label, data-used, missing-data, and claim boundary.
- `CogLeagueTournament`: id, year, quarter, cohorts, `attemptLimit=3`, disabled status, future maturity, ranking disabled state, requirements, data-used, and missing-data.
- `CogLeagueCheckpoint`: athlete id, tournament id, attempt number, completed time, trait results, lock status, data-used, and missing-data.

## Ranking Boundary

CogLeague ranking is disabled. Ranking can only launch inside a cohort and tournament window after tie-breakers are documented and partner/consent gates are live.

## UX And Accessibility Contract

Any Cognitive Lite UI must use General Design System navigation, score gauges, explanation text, signature text, improvement tips, back controls, and next controls. Score visuals require text alternatives and non-color-only bands. Empty, partial, locked, roadmap, loading, error, and retry states must be keyboard reachable and announced.

## Observability

Events use `capabilityKey=AIQ-1330`, correlation id, module registry version where available, status, success/failure, and latency:

- `athleteiq.cognitive_lite.results_viewed`
- `athleteiq.cogleague_future.boundary_viewed`

## Rollback

Disable `cognitive_lite` through the module registry or hide the route. Existing profile data remains unchanged. CogLeague is already disabled and can be removed from route exposure without data migration because no tournament state is persisted.
