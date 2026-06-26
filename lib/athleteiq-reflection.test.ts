import { describe, expect, it } from "vitest";
import { GET as getMemoryHandoffRoute } from "@/app/api/athleteiq/memory-handoff/route";
import { POST as postReflection } from "@/app/api/athleteiq/reflections/route";
import { PATCH as patchVisibility } from "@/app/api/athleteiq/reflections/[id]/visibility/route";
import {
  ATHLETEIQ_REFLECTION_VERSION,
  buildMemoryHandoff,
  buildReflectionEntry,
  deriveSafeReflection,
  redactReflectionForUser,
  validateReflectionInput
} from "@/lib/athleteiq-reflection";
import type { AuthUser } from "@/lib/access";

describe("AthleteIQ reflection memory contract", () => {
  it("derives deterministic safe tags without exposing raw journal content", () => {
    const result = deriveSafeReflection("I slept badly and feel stress before school.", "low");

    expect(ATHLETEIQ_REFLECTION_VERSION).toBe("aiq-reflection-1290.1");
    expect(result.derivedTags).toEqual(["sleep", "stress", "school", "mood:low"]);
    expect(result.safeSummary).not.toContain("slept badly");
  });

  it("redacts raw body for non-athlete views", () => {
    const entry = buildReflectionEntry({
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      body: "private body",
      visibility: "coach_summary"
    });

    expect(redactReflectionForUser(user("trainer"), entry)).toMatchObject({
      body: undefined,
      rawBodyAvailable: false,
      redacted: true
    });
    expect(redactReflectionForUser({ ...user("athlete"), athleteId: "athlete-1" }, entry).body).toBe("private body");
  });

  it("builds next-day handoff from tags and shared summaries only", () => {
    const privateEntry = buildReflectionEntry({ athleteId: "athlete-1", localDate: "2026-06-26", body: "pain and stress", visibility: "private" });
    const sharedEntry = buildReflectionEntry({ athleteId: "athlete-1", localDate: "2026-06-26", body: "confident after match", visibility: "coach_summary" });
    const handoff = buildMemoryHandoff({ athleteId: "athlete-1", fromDate: "2026-06-26", toDate: "2026-06-27", entries: [privateEntry, sharedEntry] });

    expect(handoff.tags).toEqual(["pain", "stress", "confidence", "competition"]);
    expect(handoff.summaryForPlanning).toContain("confidence");
    expect(handoff.summaryForPlanning).not.toContain("pain and stress");
    expect(handoff.excludedPrivateContent).toBe(true);
  });

  it("allows blank reflections to be skipped after base validation", () => {
    expect(validateReflectionInput({ athleteId: "athlete-1", localDate: "2026-06-26", body: "" })).toEqual([]);
  });
});

describe("AthleteIQ reflection API validation", () => {
  it("validates athlete id before reflection persistence", async () => {
    const response = await postReflection(new Request("http://localhost/api/athleteiq/reflections", {
      method: "POST",
      body: JSON.stringify({ localDate: "2026-06-26", body: "test" })
    }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("VALIDATION_ERROR");
    expect(payload.correlationId).toMatch(/^aiq-/);
  });

  it("validates visibility before loading a reflection", async () => {
    const response = await patchVisibility(new Request("http://localhost/api/athleteiq/reflections/reflection-1/visibility", {
      method: "PATCH",
      body: JSON.stringify({ visibility: "public" })
    }), { params: Promise.resolve({ id: "reflection-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("VALIDATION_ERROR");
    expect(payload.correlationId).toMatch(/^aiq-/);
  });

  it("validates date before memory handoff access", async () => {
    const response = await getMemoryHandoffRoute(new Request("http://localhost/api/athleteiq/memory-handoff?athleteId=athlete-1&date=bad"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("VALIDATION_ERROR");
    expect(payload.correlationId).toMatch(/^aiq-/);
  });
});

function user(primaryRole: AuthUser["primaryRole"]): AuthUser {
  return {
    email: `${primaryRole}@habigoal.local`,
    name: primaryRole,
    primaryRole,
    roles: [primaryRole],
    teamIds: []
  };
}
