import { describe, expect, it } from "vitest";
import { buildSessionFromBlueprint } from "./athleteiq-session";
import { getBlueprintByKey } from "./session-blueprints";

const NOW = new Date("2026-06-29T09:00:00.000Z");

describe("buildSessionFromBlueprint (#83 TRN-002)", () => {
  it("maps every drill to a block and sums duration into the load estimate", () => {
    const blueprint = getBlueprintByKey("standard-technical")!;
    const session = buildSessionFromBlueprint({ athleteId: "a1", localDate: "2026-06-29", blueprint }, NOW);
    expect(session.blocks).toHaveLength(blueprint.drills.length);
    expect(session.state).toBe("draft");
    expect(session.log.estimatedLoadPoints).toBeGreaterThan(0);
    // first drill is a warm-up block, intensity follows the variant (moderate)
    expect(session.blocks[0].type).toBe("warmup");
    expect(session.blocks[0].intensity).toBe("moderate");
  });

  it("uses a stable per-blueprint session id and an unrestricted guardrail", () => {
    const blueprint = getBlueprintByKey("recovery-flow")!;
    const session = buildSessionFromBlueprint({ athleteId: "a1", localDate: "2026-06-29", blueprint }, NOW);
    expect(session.sessionId).toBe("aiq-session:blueprint:a1:recovery-flow:2026-06-29");
    expect(session.painGuardrail.state).toBe("none");
    expect(session.recommendation.intensity).toBe("recovery");
    // recovery variant → every block is a recovery block
    expect(session.blocks.every((b) => b.type === "recovery")).toBe(true);
  });
});
