import { createHmac } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/performance/vald/webhook/route";

const SECRET = "vald-route-secret";

vi.mock("@/config/env", () => ({ env: { valdWebhookSecret: "vald-route-secret" } }));
vi.mock("@/repositories/raw-payload.repository", () => ({ upsertRawPayload: vi.fn(async () => {}) }));
vi.mock("@/repositories/canonical-metric.repository", () => ({ upsertManyCanonicalMetrics: vi.fn(async () => {}) }));
vi.mock("@/repositories/device-connection.repository", () => ({ findConnectionByExternalUser: vi.fn(async () => null) }));

import { env } from "@/config/env";
import { upsertRawPayload } from "@/repositories/raw-payload.repository";
import { upsertManyCanonicalMetrics } from "@/repositories/canonical-metric.repository";
import { findConnectionByExternalUser } from "@/repositories/device-connection.repository";

function sign(body: string): string {
  return createHmac("sha256", SECRET).update(body, "utf8").digest("hex");
}

function request(body: string, signature?: string): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (signature !== undefined) headers["x-vald-signature"] = signature;
  return new Request("http://localhost/api/performance/vald/webhook", { method: "POST", headers, body });
}

describe("VALD webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (env as { valdWebhookSecret?: string }).valdWebhookSecret = SECRET;
  });

  it("returns 501 when the secret is not configured", async () => {
    (env as { valdWebhookSecret?: string }).valdWebhookSecret = undefined;
    const res = await POST(request("{}", "x"));
    expect(res.status).toBe(501);
    expect(upsertRawPayload).not.toHaveBeenCalled();
  });

  it("returns 401 and persists nothing on an invalid signature", async () => {
    const body = JSON.stringify({ eventId: "e1", athleteId: "a1", testDateUtc: "2026-06-28", results: { peakForceNewtons: 2000 } });
    const res = await POST(request(body, "badsig"));
    expect(res.status).toBe(401);
    expect(upsertRawPayload).not.toHaveBeenCalled();
    expect(upsertManyCanonicalMetrics).not.toHaveBeenCalled();
  });

  it("persists raw + canonical metrics for a valid signed event", async () => {
    const body = JSON.stringify({ eventId: "e1", athleteId: "a1", testDateUtc: "2026-06-28", results: { peakForceNewtons: 2000, leftRightAsymmetryPct: 5 } });
    const res = await POST(request(body, sign(body)));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.persisted).toBe(2);
    expect(upsertRawPayload).toHaveBeenCalledOnce();
    expect(upsertManyCanonicalMetrics).toHaveBeenCalledOnce();
    const metrics = vi.mocked(upsertManyCanonicalMetrics).mock.calls[0][0];
    expect(metrics.every((m) => m.source === "vald" && m.athleteId === "a1")).toBe(true);
  });

  it("maps the provider athlete id via a VALD connection", async () => {
    vi.mocked(findConnectionByExternalUser).mockResolvedValueOnce({ athleteId: "mapped-1" } as never);
    const body = JSON.stringify({ eventId: "e2", providerAthleteId: "vald-123", testDateUtc: "2026-06-28", results: { peakForceNewtons: 1800 } });
    const res = await POST(request(body, sign(body)));
    expect(res.status).toBe(200);
    expect(findConnectionByExternalUser).toHaveBeenCalledWith("vald", "vald-123");
    expect(vi.mocked(upsertManyCanonicalMetrics).mock.calls[0][0][0].athleteId).toBe("mapped-1");
  });

  it("acks (200) but persists no canonical metrics for an unmappable athlete", async () => {
    const body = JSON.stringify({ eventId: "e3", testDateUtc: "2026-06-28", results: { peakForceNewtons: 1800 } });
    const res = await POST(request(body, sign(body)));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.unmapped).toBe(true);
    expect(upsertManyCanonicalMetrics).not.toHaveBeenCalled();
  });
});
