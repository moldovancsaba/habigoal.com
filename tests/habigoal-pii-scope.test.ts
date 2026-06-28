import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// #432: the Habigoal consumer surface must resolve only the signed-in athlete's
// own profile (or a parent's own child). It must never fall back to an arbitrary
// athlete (the old `listChildren()[0]` path leaked another person's PII onto the
// consumer surface for open-access roles).
const service = readFileSync(join(process.cwd(), "services/habigoal-product.service.ts"), "utf8");

describe("Habigoal athlete resolution scope (#432)", () => {
  it("does not enumerate all athletes (no listChildren) in the consumer service", () => {
    expect(service).not.toMatch(/listChildren/);
  });

  it("does not fall back to an arbitrary athlete (no children[0] / children[index])", () => {
    expect(service).not.toMatch(/children\s*\[\s*0\s*\]/);
    expect(service).not.toMatch(/children\.find\(/);
  });

  it("no longer depends on the broad access-resolver for athlete selection", () => {
    expect(service).not.toMatch(/resolveAccessibleAthleteIds/);
  });
});
