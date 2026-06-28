import { describe, expect, it, vi } from "vitest";
import { computeSyncWindow, isSyncLocked, syncConnection, WEARABLE_LOOKBACK_MS, type SyncDeps } from "@/services/wearable-sync.service";
import type { DeviceConnection, WearableConnector } from "@/types/wearable-connector";
import type { CanonicalMetric, RawPayload } from "@/types/canonical-metric";

const now = new Date("2026-06-28T12:00:00.000Z");

function connection(overrides: Partial<DeviceConnection> = {}): DeviceConnection {
  return {
    connectionId: "c1",
    athleteId: "a1",
    organisationId: "org1",
    source: "oura",
    status: "active",
    externalUserId: "ext1",
    scopes: ["daily"],
    accessToken: "enc-access",
    refreshToken: "enc-refresh",
    syncIntervalHours: 12,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...overrides
  };
}

function rawPayload(): RawPayload {
  return { payloadId: "p1", athleteId: "a1", source: "oura", receivedAt: now.toISOString(), payload: { ouraType: "daily_sleep", day: "2026-06-28", score: 80 }, normalised: false };
}
function metric(): CanonicalMetric {
  return { metricId: "a1:2026-06-28:oura:sleep_quality_score", athleteId: "a1", organisationId: "org1", source: "oura", sourceMetric: "daily_sleep.score", canonicalKey: "sleep_quality_score", value: 80, unit: "score_0_100", confidence: "high", periodStart: "2026-06-28T00:00:00.000Z", periodEnd: "2026-06-28T23:59:59.999Z", date: "2026-06-28", normalisedAt: now.toISOString(), normalisationVersion: "oura-1.0.0", processingState: "normalised", createdAt: now.toISOString(), updatedAt: now.toISOString() };
}

function fakeConnector(overrides: Partial<WearableConnector> = {}): WearableConnector {
  return {
    source: "oura",
    fetchMetrics: vi.fn(async () => [rawPayload()]),
    refreshTokenIfNeeded: vi.fn(async (c) => c),
    healthCheck: vi.fn(async () => true),
    revokeAccess: vi.fn(async () => {}),
    ...overrides
  };
}

function makeDeps(connector: WearableConnector, normalizeReturn: CanonicalMetric[] = [metric()]): SyncDeps {
  return {
    connector,
    normalize: vi.fn(() => normalizeReturn),
    upsertManyRawPayloads: vi.fn(async () => {}),
    upsertManyCanonicalMetrics: vi.fn(async () => {}),
    recordSyncResult: vi.fn(async () => {})
  };
}

describe("computeSyncWindow", () => {
  it("uses the lookback floor when never synced", () => {
    const w = computeSyncWindow({ lastSyncAt: undefined }, now);
    expect(w.from).toBe(new Date(now.getTime() - WEARABLE_LOOKBACK_MS).toISOString());
    expect(w.to).toBe(now.toISOString());
  });

  it("resumes from the last sync when within the lookback cap", () => {
    const last = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    expect(computeSyncWindow({ lastSyncAt: last }, now).from).toBe(last);
  });

  it("clamps a very old last sync to the lookback floor", () => {
    const last = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString();
    expect(computeSyncWindow({ lastSyncAt: last }, now).from).toBe(new Date(now.getTime() - WEARABLE_LOOKBACK_MS).toISOString());
  });
});

describe("syncConnection", () => {
  it("fetches, persists raw + canonical, and records success", async () => {
    const connector = fakeConnector();
    const deps = makeDeps(connector);
    const result = await syncConnection(connection(), deps, now);

    expect(connector.fetchMetrics).toHaveBeenCalledOnce();
    expect(deps.upsertManyRawPayloads).toHaveBeenCalledWith([rawPayload()]);
    expect(deps.upsertManyCanonicalMetrics).toHaveBeenCalledWith([metric()]);
    expect(deps.recordSyncResult).toHaveBeenCalledWith("c1", "ok", now.toISOString());
    expect(result).toEqual({ persisted: 1, lastSyncedAt: now.toISOString() });
  });

  it("refreshes the token when near expiry, and not otherwise", async () => {
    const nearExpiry = fakeConnector();
    await syncConnection(connection({ tokenExpiresAt: new Date(now.getTime() + 60_000).toISOString() }), makeDeps(nearExpiry), now);
    expect(nearExpiry.refreshTokenIfNeeded).toHaveBeenCalledOnce();

    const farExpiry = fakeConnector();
    await syncConnection(connection({ tokenExpiresAt: new Date(now.getTime() + 3_600_000).toISOString() }), makeDeps(farExpiry), now);
    expect(farExpiry.refreshTokenIfNeeded).not.toHaveBeenCalled();
  });

  it("records an error and rethrows on provider failure", async () => {
    const connector = fakeConnector({ fetchMetrics: vi.fn(async () => { throw new Error("boom"); }) });
    const deps = makeDeps(connector);
    await expect(syncConnection(connection(), deps, now)).rejects.toThrow("boom");
    expect(deps.recordSyncResult).toHaveBeenCalledWith("c1", "error", now.toISOString(), "boom");
    expect(deps.upsertManyCanonicalMetrics).not.toHaveBeenCalled();
  });

  it("treats an empty fetch as a successful no-op", async () => {
    const connector = fakeConnector({ fetchMetrics: vi.fn(async () => []) });
    const deps = makeDeps(connector, []);
    const result = await syncConnection(connection(), deps, now);
    expect(deps.upsertManyRawPayloads).not.toHaveBeenCalled();
    expect(deps.upsertManyCanonicalMetrics).not.toHaveBeenCalled();
    expect(deps.recordSyncResult).toHaveBeenCalledWith("c1", "ok", now.toISOString());
    expect(result.persisted).toBe(0);
  });

  it("serializes concurrent syncs with a per-connection lock", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const connector = fakeConnector({ fetchMetrics: vi.fn(() => gate.then(() => [])) });
    const deps = makeDeps(connector, []);

    const inflight = syncConnection(connection(), deps, now);
    expect(isSyncLocked("c1")).toBe(true);
    const second = await syncConnection(connection(), deps, now);
    expect(second).toEqual({ skipped: "in_progress" });

    release();
    await inflight;
    expect(isSyncLocked("c1")).toBe(false);
    expect(connector.fetchMetrics).toHaveBeenCalledOnce();
  });
});
