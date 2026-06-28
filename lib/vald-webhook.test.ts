import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { normalizeValdEvent, rawPayloadFromVald, verifyValdSignature, VALD_NORMALISATION_VERSION, type ValdEvent } from "@/lib/vald-webhook";

const secret = "vald-test-secret";
const now = new Date("2026-06-28T12:00:00.000Z");

function sign(body: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

describe("verifyValdSignature", () => {
  it("accepts a valid HMAC-SHA256 signature (bare and sha256= prefixed)", () => {
    const body = JSON.stringify({ eventId: "e1" });
    expect(verifyValdSignature(body, secret, sign(body))).toBe(true);
    expect(verifyValdSignature(body, secret, `sha256=${sign(body)}`)).toBe(true);
  });

  it("rejects an invalid or missing signature", () => {
    const body = JSON.stringify({ eventId: "e1" });
    expect(verifyValdSignature(body, secret, "deadbeef")).toBe(false);
    expect(verifyValdSignature(body, secret, sign("other body"))).toBe(false);
    expect(verifyValdSignature(body, secret, null)).toBe(false);
    expect(verifyValdSignature(body, "wrong-secret", sign(body))).toBe(false);
  });
});

describe("normalizeValdEvent", () => {
  const event: ValdEvent = {
    eventId: "e1",
    testDateUtc: "2026-06-28T09:30:00.000Z",
    results: { peakForceNewtons: 2200, jumpHeightCm: 41.5, leftRightAsymmetryPct: 6.2 }
  };

  it("maps VALD results to canonical metrics with correct units", () => {
    const metrics = normalizeValdEvent(event, "a1", "org1", now);
    const byKey = Object.fromEntries(metrics.map((m) => [m.canonicalKey, m]));
    expect(byKey.peak_force_newtons).toMatchObject({ value: 2200, unit: "newtons", source: "vald" });
    expect(byKey.jump_height_cm).toMatchObject({ value: 41.5, unit: "centimeters" });
    expect(byKey.left_right_asymmetry_percentage).toMatchObject({ value: 6.2, unit: "percentage" });
    expect(metrics.every((m) => m.normalisationVersion === VALD_NORMALISATION_VERSION)).toBe(true);
  });

  it("produces a deterministic metricId (idempotent re-delivery)", () => {
    const [m] = normalizeValdEvent({ ...event, results: { peakForceNewtons: 2200 } }, "a1", "org1", now);
    expect(m.metricId).toBe("a1:2026-06-28:vald:peak_force_newtons");
  });

  it("skips events with no test date and non-numeric fields", () => {
    expect(normalizeValdEvent({ eventId: "e1", results: { peakForceNewtons: 2200 } }, "a1", "org1", now)).toHaveLength(0);
    expect(normalizeValdEvent({ ...event, results: { peakForceNewtons: "high" } }, "a1", "org1", now)).toHaveLength(0);
  });
});

describe("rawPayloadFromVald", () => {
  it("keys the raw payload by event id for idempotent storage", () => {
    const raw = rawPayloadFromVald({ eventId: "e1" }, "a1", "{}", now);
    expect(raw.payloadId).toBe("vald:e1");
    expect(raw.source).toBe("vald");
    expect(raw.athleteId).toBe("a1");
  });
});
