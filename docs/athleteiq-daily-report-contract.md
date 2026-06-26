# AthleteIQ Active-Module Daily Report Contract

Last updated: 2026-06-26

This is the shipped contract for issue `#229` / capability `AIQ-1310`.

## Purpose

Daily reports persist immutable snapshots that include only permitted active and lite/manual modules for the requested view. Future modules are excluded from report sections and appear only in the roadmap appendix.

## Data Contract

- `DailyReportSnapshot = id, athleteId, teamId, reportType, localDate, sections, roadmapAppendix, dataUsed, missingData, moduleRegistryVersion, algorithmVersions, generatedAt`
- `ReportSection = key, titleKey, maturity, visibility, claimBoundary, facts, recommendations, evidenceLabels, dataUsed, missingData, confidence`

Version: `aiq-daily-report-1310.1`

## APIs

- `POST /api/athleteiq/reports/daily/generate`
- `GET /api/athleteiq/reports/daily?athleteId=&teamId=&date=&view=`
- `GET /api/athleteiq/reports/daily/:id/export.json`

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
authorize athlete or team relationship
load Daily IQ, Daily Plan, and stakeholder projections where relevant
filter modules by report visibility
include active modules with live evidence labels
include lite/manual modules with manual claim boundaries
exclude future modules from live sections
persist immutable report snapshot
return latest snapshot or JSON export
```

## Claim Boundaries

- Reports reproduce stored scores and do not recalculate independently.
- Low or insufficient confidence sections use review/missing-data language instead of prescriptive recommendations.
- Lite/manual modules are labeled with `backed_by_manual_entry`.
- Future modules are visible only in the roadmap appendix.

## Observability

Structured logs use `capabilityKey: "AIQ-1310"` and include correlation id, report id, report type, section count, export format, success/failure status, and latency.

Events:

- `athleteiq.daily_report.generated`
- `athleteiq.daily_report.viewed`
- `athleteiq.daily_report.exported_json`

## UX And Accessibility Contract

No new UI shell is shipped in this issue. Any report UI must use GDS-only components and put confidence, missing data, data-used labels, claim boundaries, and version labels near each recommendation. JSON export labels must match rendered UI labels.

## Rollback And Recovery

Rollback is additive: remove consumers of the daily report endpoints or disable the capability in the module registry. Existing `athleteiq_daily_reports` snapshots remain readable and do not affect scoring or planning.

## Verification

```bash
npm run test -- lib/athleteiq-daily-report.test.ts
npm run typecheck
npm run build
```
