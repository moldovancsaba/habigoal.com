# VALD performance webhook

Ingests VALD (ForceDecks-style) performance events into canonical metrics that
feed the digital twin and reports. `POST /api/performance/vald/webhook`.

## Flow

1. **501** if `VALD_WEBHOOK_SECRET` is unset (config gap, never an open ingest).
2. Read the raw body (1 MB cap) and verify `x-vald-signature` — HMAC-SHA256 of
   the raw body, constant-time compared (bare hex or `sha256=<hex>`). Bad/missing
   signature → **401**, nothing stored.
3. Parse JSON; missing `eventId` → **400**.
4. Resolve the internal athlete: explicit `athleteId`, else `providerAthleteId`
   mapped via a VALD `device_connections` record (`externalUserId`). Unmappable →
   **200** ack with `unmapped: true` (per provider replay policy), nothing canonical.
5. `upsertRawPayload` (idempotent by `payloadId = vald:<eventId>`) +
   `upsertManyCanonicalMetrics` (idempotent by deterministic `metricId`).
6. **200** `{ ok: true, persisted: n }`.

Idempotency: re-delivered events overwrite (deterministic raw + canonical ids),
never double-write. The secret and signature are never logged. Observability:
`vald.webhook.{verified,rejected,persisted,failed}`.

## Event shape

```json
{
  "eventId": "string",
  "athleteId": "internal-id (optional)",
  "providerAthleteId": "vald-id (optional; mapped via device_connections)",
  "testDateUtc": "2026-06-28T09:30:00.000Z",
  "results": { "peakForceNewtons": 2200, "jumpHeightCm": 41.5, "leftRightAsymmetryPct": 6.2 }
}
```

## Canonical mapping

| VALD field              | Canonical key                     | Unit          |
|-------------------------|-----------------------------------|---------------|
| `peakForceNewtons`      | `peak_force_newtons`              | `newtons`     |
| `jumpHeightCm`          | `jump_height_cm`                  | `centimeters` |
| `leftRightAsymmetryPct` | `left_right_asymmetry_percentage` | `percentage`  |

## Configuration

`VALD_WEBHOOK_SECRET` (env). Webhook URL: `{APP_BASE_URL}/api/performance/vald/webhook`.
Metrics are retrievable via the existing `/api/v1/metrics` path. Health data is
PII; the `canonical_metrics` and `raw_metrics` collections are already in the
GDPR PII registry.

## Status & limitations

- Signature verification, normalization, idempotency, and athlete mapping are
  unit-tested. End-to-end verification needs a real VALD secret + a captured
  sample event to replay.

## Rollback

Revert the commit (restores the 501 stub). Writes are additive to
`raw_metrics`/`canonical_metrics`; clean up with
`db.canonical_metrics.deleteMany({ source: "vald" })` and
`db.raw_metrics.deleteMany({ source: "vald" })`.
