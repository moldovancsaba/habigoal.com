# AthleteIQ Lite Module Gateway Contract

Issue: `#230`  
Capability: `AIQ-1320`  
Version: `aiq-lite-gateway-1320.1`

## Scope

The lite module gateway makes recovery, fuel, learning, and manual wearable-style data executable without claiming automated partner integrations. Each module stays registered as `lite_manual` in the AthleteIQ module registry and every runtime response carries source, maturity, data-used, missing-data, and claim-boundary labels.

## Runtime Flow

1. Resolve authenticated user, role, athlete access, locale/date, and module registry version.
2. Validate the target module is `lite_manual`.
3. Validate the request body, including date format, bounded numeric ranges, and workflow-specific fields.
4. Persist a source-labelled manual entry in `athleteiq_lite_module_entries`.
5. Return the saved entry, warnings, correlation id, and latency.
6. Build daily summaries for plan/report consumers from manual entries only.

## APIs

- `GET /api/athleteiq/lite-modules`
- `POST /api/athleteiq/recovery-lite/entries`
- `POST /api/athleteiq/fuel-lite/entries`
- `POST /api/athleteiq/learning/progress`
- `POST /api/athleteiq/wearables/manual-entry`

Mutating routes accept `Idempotency-Key` or `idempotencyKey` and reuse an existing entry for the same athlete, module, and key.

Server persistence and summary reads use a bounded `2500ms` gateway timeout. Timeout responses use `{ code: "TIMEOUT", messageKey, retryable: true, correlationId }`; clients should preserve entered values and retry with the same idempotency key.

## Contracts

- `LiteModuleStatus`: `manual_available | content_available | planned_integration`
- `RecoveryLiteEntry`: `protocolKey`, `completedAt`, `perceivedRecovery`
- `FuelGuidanceEntry`: `mealTimingStatus`, `hydrationStatus`, optional `note`
- `LearningItemProgress`: `itemId`, `status`, optional `completedAt`
- `ManualWearableEntry`: `metricKey`, `value`, `unit`, `measuredAt`, `source=manual`, `deviceConnectionClaim=false`

Manual wearable entries keep `integrationStatus=not_connected_manual_only` and `missingData` includes `wearable_normalisation` until a real credentialed integration exists.

## UX And Accessibility Contract

Any UI built on these APIs must use the General Design System only. Required states are loading, empty/manual-limited, validation warning, retryable error, saved, and completed. All controls must be keyboard-completable, screen-reader named, non-color-only, and preserve input on retryable failures.

## Observability

Events use `capabilityKey=AIQ-1320`, a correlation id, status, athlete id where permitted, warnings, and latency:

- `athleteiq.lite_modules.viewed`
- `athleteiq.recovery_lite.entry_saved`
- `athleteiq.fuel_lite.entry_saved`
- `athleteiq.learning_lite.progress_saved`
- `athleteiq.wearable_manual.entry_saved`

## Rollback

Disable the affected module through the AthleteIQ module registry or route exposure. Existing `athleteiq_lite_module_entries` records remain readable and source-labelled. Reports and plans fall back to missing-data labels if no entries are available.

## Testing

Coverage includes module capability listing, validation, manual source labels, wearable outlier warnings, no device-integration claims, plan/report summary labels, and structured API validation errors.
