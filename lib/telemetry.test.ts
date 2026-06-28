import { describe, expect, it } from "vitest";
import { buildTelemetryEvent, isPiiKey } from "@/lib/telemetry";

const NOW = "2026-06-28T22:00:00.000Z";

describe("telemetry PII guard (#88)", () => {
  it("flags PII-shaped keys", () => {
    for (const k of ["email", "userEmail", "fullName", "phone", "ipAddress", "authToken", "dob", "birthDate"]) {
      expect(isPiiKey(k)).toBe(true);
    }
    for (const k of ["count", "durationMs", "status", "athleteCount"]) {
      expect(isPiiKey(k)).toBe(false);
    }
  });

  it("drops PII keys and keeps safe scalars", () => {
    const e = buildTelemetryEvent("checkin.saved", {
      now: NOW,
      props: { email: "a@b.com", name: "Jane", count: 3, ok: true, ratio: 0.5 },
    });
    expect(e.props).toEqual({ count: 3, ok: true, ratio: 0.5 });
    expect(e.event).toBe("checkin.saved");
    expect(e.occurredAt).toBe(NOW);
  });

  it("drops non-scalar values (objects/arrays) defensively", () => {
    const e = buildTelemetryEvent("x", { now: NOW, props: { nested: { a: 1 }, list: [1, 2], n: 5 } });
    expect(e.props).toEqual({ n: 5 });
  });

  it("includes correlationId only when provided", () => {
    expect(buildTelemetryEvent("x", { now: NOW }).correlationId).toBeUndefined();
    expect(buildTelemetryEvent("x", { now: NOW, correlationId: "c1" }).correlationId).toBe("c1");
  });
});
