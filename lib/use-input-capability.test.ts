import { describe, expect, it } from "vitest";
import { CAPABILITY_QUERIES, resolveInputCapability } from "@/lib/use-input-capability";

function mm(matching: string[]) {
  return (query: string) => ({ matches: matching.includes(query) });
}

describe("resolveInputCapability", () => {
  it("reports a mouse-only device (fine, hover, not coarse)", () => {
    const cap = resolveInputCapability(mm([CAPABILITY_QUERIES.hasFine, CAPABILITY_QUERIES.canHover]));
    expect(cap).toEqual({ hasCoarse: false, hasFine: true, canHover: true });
  });

  it("reports a touch-only device (coarse, no hover)", () => {
    const cap = resolveInputCapability(mm([CAPABILITY_QUERIES.hasCoarse]));
    expect(cap).toEqual({ hasCoarse: true, hasFine: false, canHover: false });
  });

  it("reports a hybrid (touch laptop / iPad + trackpad) as both coarse and fine with hover", () => {
    const cap = resolveInputCapability(mm([CAPABILITY_QUERIES.hasCoarse, CAPABILITY_QUERIES.hasFine, CAPABILITY_QUERIES.canHover]));
    expect(cap.hasCoarse).toBe(true);
    expect(cap.hasFine).toBe(true);
    expect(cap.canHover).toBe(true);
  });

  it("uses the union (any-pointer/any-hover), not width", () => {
    expect(Object.values(CAPABILITY_QUERIES).every((q) => q.includes("any-"))).toBe(true);
    expect(Object.values(CAPABILITY_QUERIES).some((q) => q.includes("width"))).toBe(false);
  });
});
