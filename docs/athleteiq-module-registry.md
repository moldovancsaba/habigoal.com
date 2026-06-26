# AthleteIQ Module Maturity Registry

Last updated: 2026-06-26

This is the shipped registry contract for issue `#218` / capability `AIQ-1201`. It prevents AthleteIQ from presenting roadmap, partner, or manual/lite concepts as active product functionality.

## Runtime Contract

Source:

- `lib/athleteiq-modules.ts`
- Registry version: `aiq-modules-1201.1`
- Capability key: `AIQ-1201`

Maturity values:

- `active`: usable now from live Habigoal data or user input.
- `lite_manual`: available only with explicit manual-entry/source limitation labels.
- `planned`: documented as near roadmap and not actionable as MVP functionality.
- `future`: visible only to roadmap/education consumers when explicitly requested with `includeFuture=true`.

Claim boundaries:

- `backed_by_user_input`
- `backed_by_manual_entry`
- `partner_future`
- `roadmap_only`

Every registry item declares allowed roles, routes, report visibility, data sources, dependencies, and operational event names.

## API

### `GET /api/athleteiq/modules?role=&athleteId=&includeFuture=`

Returns role-filtered, render-ready module definitions. Future modules are hidden unless `includeFuture=true`.

### `GET /api/athleteiq/modules/:key?role=&athleteId=&includeFuture=`

Returns a single permitted module. Unknown keys return a structured `404`. Future modules return `409 FUTURE_MODULE_NOT_ACTIONABLE` unless `includeFuture=true`.

Structured errors use:

```ts
{
  code: string;
  messageKey: string;
  retryable: boolean;
  correlationId: string;
}
```

## Privacy And Role Behavior

- Athlete users receive athlete-safe modules only.
- Trainer, performance coach, physio, analyst, and club management roles receive only the modules assigned to those roles.
- Parent users receive parent-safe summary modules only.
- Admin users can inspect registry behavior across roles.
- `athleteId` is checked through the existing server-side athlete-access helper before any module response is returned.
- Unsupported roles return an empty permitted set with `deniedReason`, not future or unauthorized module details.

## Active Registry Keys

- `readiness`
- `mental_edge`
- `pain_safety`
- `habits`
- `daily_plan`
- `session_log`
- `calendar`
- `reflection`
- `coach_alerts`
- `parent_summary`
- `team_overview`
- `recovery_lite`
- `fuel_lite`
- `learning_lite`
- `wearable_manual_sync`
- `cognitive_lite`
- `cogleague_future`
- `gameflow_future`
- `sports_lab_future`

## Validation Rules

`validateAthleteIqModuleRegistry()` fails when:

- module keys are duplicated
- an active module depends on a planned/future data source
- a module depends on an unknown module
- an active module depends on a future module

## Observability

API responses include `correlationId`, `registryVersion`, `capabilityKey`, `generatedAt`, and `latencyMs`.

Privacy-safe server logs are emitted for:

- authorization denial with `aiq.modules.authorization_denied`
- empty authorized role set with `aiq.modules.empty_authorized_set`

Logs must not include athlete notes, pain details, mental/reflection text, medical data, secrets, or raw form content.

## Retry / Timeout / Recovery

- Read requests are deterministic and do not mutate state.
- Registry validation failures are non-retryable until fixed in source.
- Authentication failures are retryable after login/session recovery.
- Future-module action attempts are non-retryable because they represent claim-boundary enforcement.
- Existing athlete, check-in, habit, plan, and report data remains readable if the registry is rolled back.

## Rollback

Rollback options:

1. Revert the registry/API commit.
2. Remove the `/api/athleteiq/modules` consumers while leaving the typed registry in place.
3. Keep product-surface routes live; this registry is additive and does not migrate persisted data.

## Verification

```bash
npm run test -- lib/athleteiq-modules.test.ts
npm run typecheck
npm run build
```

