import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/api")>();
  return { ...actual, requireRole: vi.fn() };
});
vi.mock("@/lib/access", () => ({
  getAuthUser: vi.fn(),
  resolveAccessibleAthleteIds: vi.fn(),
}));
vi.mock("@/repositories/child.repository", () => ({ listChildrenWithMetrics: vi.fn() }));
vi.mock("@/repositories/athlete-twin.repository", () => ({ findTwinByAthleteId: vi.fn() }));
vi.mock("@/services/reporting.service", () => ({
  reportingService: { generateTeamReport: vi.fn() },
}));

import { POST } from "./route";
import { requireRole } from "@/lib/api";
import { getAuthUser, resolveAccessibleAthleteIds } from "@/lib/access";
import { findTwinByAthleteId } from "@/repositories/athlete-twin.repository";
import { reportingService } from "@/services/reporting.service";

const mRequireRole = vi.mocked(requireRole);
const mGetUser = vi.mocked(getAuthUser);
const mAllowed = vi.mocked(resolveAccessibleAthleteIds);
const mTwin = vi.mocked(findTwinByAthleteId);
const mReport = vi.mocked(reportingService.generateTeamReport);

function req(body: unknown) {
  return new Request("http://localhost/api/reports/team", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mRequireRole.mockResolvedValue(null);
  mGetUser.mockResolvedValue({ email: "coach@x.com", roles: ["trainer"], primaryRole: "trainer" } as never);
  mAllowed.mockResolvedValue(["a1"]);
  mTwin.mockResolvedValue({ athleteId: "a1" } as never);
  mReport.mockResolvedValue({ team: true } as never);
});

describe("POST /api/reports/team role scoping (GH-199)", () => {
  it("403s when the role check fails", async () => {
    mRequireRole.mockResolvedValue(new Response("no", { status: 403 }) as never);
    const res = await POST(req({ athleteIds: ["a1"] }));
    expect(res.status).toBe(403);
    expect(mReport).not.toHaveBeenCalled();
  });

  it("400s when no athleteIds are supplied", async () => {
    const res = await POST(req({ athleteIds: [] }));
    expect(res.status).toBe(400);
  });

  it("drops athletes the caller cannot access", async () => {
    const res = await POST(req({ athleteIds: ["a1", "a2"] }));
    expect(res.status).toBe(200);
    // Only the accessible athlete (a1) is fetched/reported, a2 is dropped.
    expect(mTwin).toHaveBeenCalledTimes(1);
    expect(mTwin).toHaveBeenCalledWith("a1");
  });

  it("403s when none of the requested athletes are accessible", async () => {
    const res = await POST(req({ athleteIds: ["a2", "a3"] }));
    expect(res.status).toBe(403);
    expect(mReport).not.toHaveBeenCalled();
  });
});
