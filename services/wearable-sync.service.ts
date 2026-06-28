// Provider-agnostic wearable telemetry sync engine.
//
// syncConnection() orchestrates: refresh-if-near-expiry -> compute window ->
// fetch raw -> persist raw -> normalize -> persist canonical (idempotent) ->
// record sync status. It is recoverable (errors are recorded, next run retries)
// and serialized per connection by an in-process lock so concurrent triggers
// cannot double-write.
//
// All collaborators are injected via `deps` so the orchestration is unit-testable
// with a fake connector and spy repositories; the default wiring resolves the
// real connector + normalizer for the connection's source. Adding a new provider
// is just a new entry in CONNECTOR_FACTORIES + NORMALIZERS.

import type { DeviceConnection, WearableConnector } from "@/types/wearable-connector";
import type { CanonicalMetric, MetricSource, RawPayload } from "@/types/canonical-metric";
import { normalizeOuraPayloads, OURA_NORMALISATION_VERSION } from "@/lib/oura-normalize";
import { normalizeWhoopPayloads, WHOOP_NORMALISATION_VERSION } from "@/lib/whoop-normalize";
import { OuraConnector } from "@/services/connectors/oura.connector";
import { WhoopConnector } from "@/services/connectors/whoop.connector";
import { upsertManyCanonicalMetrics } from "@/repositories/canonical-metric.repository";
import { upsertManyRawPayloads } from "@/repositories/raw-payload.repository";
import { listSyncableConnections, recordSyncResult } from "@/repositories/device-connection.repository";

export const WEARABLE_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000; // backfill cap
export const TOKEN_REFRESH_SKEW_MS = 5 * 60 * 1000; // refresh slightly early

type Normalizer = (payloads: RawPayload[], connection: { athleteId: string; organisationId: string }, now: Date) => CanonicalMetric[];

const CONNECTOR_FACTORIES: Partial<Record<MetricSource, () => WearableConnector>> = {
  oura: () => new OuraConnector(),
  whoop: () => new WhoopConnector()
};

const NORMALIZERS: Partial<Record<MetricSource, Normalizer>> = {
  oura: normalizeOuraPayloads,
  whoop: normalizeWhoopPayloads
};

export const NORMALISATION_VERSIONS: Partial<Record<MetricSource, string>> = {
  oura: OURA_NORMALISATION_VERSION,
  whoop: WHOOP_NORMALISATION_VERSION
};

export type SyncDeps = {
  connector: WearableConnector;
  normalize: Normalizer;
  upsertManyRawPayloads: (payloads: RawPayload[]) => Promise<void>;
  upsertManyCanonicalMetrics: (metrics: CanonicalMetric[]) => Promise<void>;
  recordSyncResult: (connectionId: string, status: "ok" | "error", syncedAt: string, error?: string) => Promise<void>;
};

export type SyncResult = { skipped?: "in_progress"; persisted?: number; lastSyncedAt?: string };

// In-process per-connection lock. Serializes concurrent triggers within a single
// runtime; the persisted lastSyncStatus is the cross-instance source of truth.
const activeLocks = new Set<string>();

export function isSyncLocked(connectionId: string): boolean {
  return activeLocks.has(connectionId);
}

export function getConnectorForSource(source: MetricSource): WearableConnector {
  const factory = CONNECTOR_FACTORIES[source];
  if (!factory) throw new Error(`No wearable connector registered for source: ${source}`);
  return factory();
}

export function getNormalizerForSource(source: MetricSource): Normalizer {
  const normalizer = NORMALIZERS[source];
  if (!normalizer) throw new Error(`No wearable normalizer registered for source: ${source}`);
  return normalizer;
}

function defaultDeps(source: MetricSource): SyncDeps {
  return {
    connector: getConnectorForSource(source),
    normalize: getNormalizerForSource(source),
    upsertManyRawPayloads,
    upsertManyCanonicalMetrics,
    recordSyncResult
  };
}

// Sync window: from the last successful sync (clamped to the lookback cap) up to
// `now`. Returns ISO strings. An empty window (from >= to) is a valid no-op.
export function computeSyncWindow(connection: Pick<DeviceConnection, "lastSyncAt">, now: Date): { from: string; to: string } {
  const lookbackFloor = now.getTime() - WEARABLE_LOOKBACK_MS;
  const lastSynced = connection.lastSyncAt ? Date.parse(connection.lastSyncAt) : Number.NaN;
  const fromMs = Number.isFinite(lastSynced) ? Math.max(lastSynced, lookbackFloor) : lookbackFloor;
  return { from: new Date(Math.min(fromMs, now.getTime())).toISOString(), to: now.toISOString() };
}

function tokenNeedsRefresh(connection: DeviceConnection, now: Date): boolean {
  if (!connection.tokenExpiresAt) return false;
  const expiresAt = Date.parse(connection.tokenExpiresAt);
  return Number.isFinite(expiresAt) && expiresAt <= now.getTime() + TOKEN_REFRESH_SKEW_MS;
}

export async function syncConnection(
  connection: DeviceConnection,
  deps: SyncDeps = defaultDeps(connection.source),
  now: Date = new Date()
): Promise<SyncResult> {
  if (activeLocks.has(connection.connectionId)) {
    return { skipped: "in_progress" };
  }
  activeLocks.add(connection.connectionId);

  try {
    let conn = connection;
    if (tokenNeedsRefresh(conn, now)) {
      conn = await deps.connector.refreshTokenIfNeeded(conn);
    }

    const window = computeSyncWindow(conn, now);
    const raw = await deps.connector.fetchMetrics(conn, window.from, window.to);
    if (raw.length > 0) {
      await deps.upsertManyRawPayloads(raw);
    }

    const metrics = deps.normalize(raw, conn, now);
    if (metrics.length > 0) {
      await deps.upsertManyCanonicalMetrics(metrics);
    }

    const lastSyncedAt = now.toISOString();
    await deps.recordSyncResult(conn.connectionId, "ok", lastSyncedAt);
    return { persisted: metrics.length, lastSyncedAt };
  } catch (error) {
    // Recoverable: record the failure so the next run retries; do not leave a
    // partial-corrupt state (canonical upserts are idempotent by metricId).
    await deps.recordSyncResult(connection.connectionId, "error", now.toISOString(), (error as Error).message);
    throw error;
  } finally {
    activeLocks.delete(connection.connectionId);
  }
}

function isConnectionDue(connection: DeviceConnection, now: Date): boolean {
  if (connection.status !== "active") return false;
  if (!connection.lastSyncAt) return true;
  const intervalMs = Math.max(connection.syncIntervalHours ?? 24, 1) * 60 * 60 * 1000;
  const last = Date.parse(connection.lastSyncAt);
  return !Number.isFinite(last) || last + intervalMs <= now.getTime();
}

// Batch entrypoint for the scheduler. Processes due connections with bounded
// concurrency; a single connection failure does not abort the batch.
export async function syncAllDueConnections(
  now: Date = new Date(),
  options: { concurrency?: number; list?: () => Promise<DeviceConnection[]> } = {}
): Promise<{ processed: number; succeeded: number; failed: number; skipped: number }> {
  const list = options.list ?? listSyncableConnections;
  const concurrency = Math.max(options.concurrency ?? 4, 1);
  const due = (await list()).filter((connection) => isConnectionDue(connection, now) && NORMALIZERS[connection.source]);

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < due.length) {
      const connection = due[cursor++];
      try {
        const result = await syncConnection(connection, defaultDeps(connection.source), now);
        if (result.skipped) skipped++;
        else succeeded++;
      } catch {
        failed++;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, due.length) }, () => worker()));
  return { processed: due.length, succeeded, failed, skipped };
}
