# AthleteIQ GameFlow Future Boundary Contract

Issue: `#232`  
Capability: `AIQ-1340`  
Version: `aiq-gameflow-boundary-1340.1`

## Scope

GameFlow is a future match-intelligence module. The MVP Daily OS must not ingest video, segment matches, generate match analytics, or include GameFlow metrics in active daily reports.

## API

- `GET /api/athleteiq/gameflow/matches/:id/timeline`

The endpoint returns disabled roadmap metadata only. It does not return production segments, model output, active-football percentage, dead-time ratio, friction count, delay confidence, model error bounds, rankings, or partner claims.

## Contracts

- `GameFlowSegmentType`: `active_football | preparation | dead_time | friction | delay`
- `GameFlowMatchTimeline`: match id, future source, disabled status, empty segments, null quality metrics, unavailable attribution contexts, unreviewed model version, requirements, data-used, and missing-data.
- `GameFlowRoadmapRequirement`: `video_rights | event_source | model_validation | reviewer_workflow | legal_approval`

## Guardrails

- If module maturity is `future`, only roadmap metadata is returned.
- `segments` must remain empty.
- `dataUsed` must remain empty.
- `missingData` must include video rights, event source, model validation, reviewer workflow, and legal approval.
- GameFlow cannot appear in active daily report sections; it remains in roadmap/future appendices only.

## UX And Accessibility Contract

Any future UI must use the General Design System only. Roadmap views may show prerequisites and concept status but no fake production match charts. Future charts require keyboard access, text alternatives, non-color-only states, reduced-motion support, and status announcements.

## Observability

Event: `athleteiq.gameflow_future.timeline_viewed` with `capabilityKey=AIQ-1340`, correlation id, match id, enabled flag, and latency.

## Rollback

Remove route exposure or disable `gameflow_future` in the module registry. No data migration is required because this issue persists no match timelines.
