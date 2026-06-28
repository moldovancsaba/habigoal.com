# Wearable telemetry sync engine

The sync engine turns a connected wearable into live `CanonicalMetric` rows that
feed the digital twin, readiness, and reports. It is provider-agnostic: a new
provider is just a connector + a normalizer registered in
`services/wearable-sync.service.ts`.

## Components

- `services/wearable-sync.service.ts` — orchestration (`syncConnection`,
  `syncAllDueConnections`), per-connection in-process lock, window computation.
- `services/connectors/oura.connector.ts` — Oura adapter (`WearableConnector`).
- `lib/oura-normalize.ts` — pure Oura raw → `CanonicalMetric[]` mapping.
- `repositories/device-connection.repository.ts` — `recordSyncResult`,
  `listSyncableConnections`.
- `app/api/athletes/[id]/devices/[connectionId]/sync/route.ts` — manual "Sync now".

## Flow (`syncConnection`)

1. Skip if a sync for this connection is already in-flight (lock → `{ skipped: "in_progress" }`).
2. Refresh the access token if it expires within `TOKEN_REFRESH_SKEW_MS` (5 min).
3. Compute the window: from `max(lastSyncAt, now - WEARABLE_LOOKBACK_MS)` to `now`
   (`WEARABLE_LOOKBACK_MS` = 7 days backfill cap). An empty window is a no-op.
4. `connector.fetchMetrics(window)` → persist raw payloads.
5. `normalize(raw)` → upsert canonical metrics (idempotent by `metricId`).
6. Record `lastSyncStatus`: `ok` (stamps `lastSyncAt`, clears error) or, on
   failure, `error` with the message — recoverable, the next run retries.

Idempotency: canonical `metricId` is deterministic
(`${athleteId}:${date}:${source}:${canonicalKey}`), so re-syncing overwrites
rather than duplicating.

## Triggers

- Manual: `POST /api/athletes/[id]/devices/[connectionId]/sync` — access-gated via
  `canAccessAthlete`; `409` if a sync is already running; `502` on provider
  failure (with `lastSyncStatus="error"` recorded).
- Batch: `syncAllDueConnections(now)` — processes active connections whose
  `lastSyncAt + syncIntervalHours` has elapsed, with bounded concurrency; a
  single failure does not abort the batch. Intended for the scheduler.

## Authoring a new provider adapter

1. Implement `WearableConnector` (`types/wearable-connector.ts`):
   `fetchMetrics(connection, from, to)` returns `RawPayload[]` where each
   `payload` carries a provider-type discriminator and the resource fields;
   `refreshTokenIfNeeded`, `healthCheck`, `revokeAccess`.
2. Write a pure normalizer `(payloads, { athleteId, organisationId }, now) => CanonicalMetric[]`.
3. Register both in `CONNECTOR_FACTORIES` and `NORMALIZERS` (and a version in
   `NORMALISATION_VERSIONS`) in `services/wearable-sync.service.ts`.

No engine changes are required.

## Whoop canonical mapping (API v1)

| Whoop resource | Field                          | Canonical key            | Unit          |
|----------------|--------------------------------|--------------------------|---------------|
| `recovery`     | `recovery_score`               | `energy_score`           | `score_0_100` |
| `recovery`     | `resting_heart_rate`           | `resting_heart_rate_bpm` | `bpm`         |
| `recovery`     | `hrv_rmssd_milli`              | `hrv_rmssd_ms`           | `ms`          |
| `sleep`        | `sleep_performance_percentage` | `sleep_quality_score`    | `score_0_100` |
| `sleep`        | `total_sleep_minutes`          | `sleep_duration_minutes` | `minutes`     |

Whoop OAuth + connector are gated on `WHOOP_CLIENT_ID`/`WHOOP_CLIENT_SECRET`
(see `docs/wearable-oauth.md`); they report "not configured" until set. The
connect flow dispatches by provider via `lib/wearable-oauth-providers.ts`.

## Oura canonical mapping (API v2)

| Oura resource    | Field                  | Canonical key                 | Unit         | Transform |
|------------------|------------------------|-------------------------------|--------------|-----------|
| `daily_sleep`    | `score`                | `sleep_quality_score`         | `score_0_100`| —         |
| `sleep`          | `total_sleep_duration` | `sleep_duration_minutes`      | `minutes`    | sec / 60  |
| `sleep`          | `efficiency`           | `sleep_efficiency_percentage` | `percentage` | —         |
| `sleep`          | `average_hrv`          | `hrv_rmssd_ms`                | `ms`         | —         |
| `sleep`          | `lowest_heart_rate`    | `resting_heart_rate_bpm`      | `bpm`        | —         |
| `daily_readiness`| `score`                | `energy_score`                | `score_0_100`| —         |

## Configuration

- `OURA_CLIENT_ID`, `OURA_CLIENT_SECRET` — OAuth credentials. The Oura
  connector's live fetch/refresh report "not configured" until both are set.
- `OURA_API_BASE_URL` — defaults to `https://api.ouraring.com`.

Tokens are stored AES-256-GCM encrypted, decrypted in-memory only, and never
logged or returned.

## Status & limitations

- The engine, lock, window logic, and Oura normalization are unit-tested and
  fully functional.
- The Oura **live** fetch/token-refresh paths require real credentials and a
  sandbox account to verify end-to-end; without configuration they fail closed.
- Garmin and Whoop adapters are follow-on work (their connectors currently
  report "not configured").

## Rollback

Revert the commit. Additive only: the new `lastSyncStatus` connection field and
canonical/raw rows. To clean up ingested data:
`db.canonical_metrics.deleteMany({ source: "oura" })` and
`db.raw_payloads.deleteMany({ source: "oura" })`.
