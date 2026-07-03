import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSession } from "@/lib/session";
import { getAuthUser } from "@/lib/access";
import { GET } from "./route";

vi.mock("@/config/env", () => ({
  env: { habigoalEnforceAuth: true }
}));

vi.mock("@/lib/session", () => ({
  getSession: vi.fn()
}));

vi.mock("@/lib/access", () => ({
  getAuthUser: vi.fn()
}));

const mockedGetSession = vi.mocked(getSession);
const mockedGetAuthUser = vi.mocked(getAuthUser);

// A dual-entitled professional: signed in through Athlete IQ, but also holds the
// Habigoal entitlement. The AIQ entitlement carries a reason code that must never
// reach a consumer client (GH-432).
const dualSession = {
  userId: "user-dual",
  email: "dual@example.com",
  name: "dual@example.com",
  role: "trainer",
  expires: Date.now() + 1000,
  productSurface: "athlete-iq"
} as Awaited<ReturnType<typeof getSession>>;

const dualUser = {
  email: "dual@example.com",
  name: "Dual User",
  roles: ["trainer", "athlete"],
  primaryRole: "trainer",
  athleteId: "athlete-1",
  teamIds: [],
  productEntitlements: {
    habigoal: { enabled: true, grantedAt: "2026-06-27T08:00:00.000Z", reason: "aiq_member" },
    athleteIq: { enabled: true, grantedAt: "2026-06-27T08:00:00.000Z", reason: "trainer_assignment" }
  }
} as unknown as Awaited<ReturnType<typeof getAuthUser>>;

function meRequest(surface?: string) {
  const url = surface ? `http://localhost/api/auth/me?surface=${surface}` : "http://localhost/api/auth/me";
  return new Request(url);
}

describe("/api/auth/me surface-scoped entitlements (GH-432)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetSession.mockResolvedValue(dualSession);
    mockedGetAuthUser.mockResolvedValue(dualUser);
  });

  it("returns the consumer-only projection on the Habigoal surface even for an Athlete IQ session", async () => {
    const response = await GET(meRequest("habigoal"));
    const payload = await response.json();

    expect(payload.user.productEntitlements).toEqual({ habigoal: { enabled: true } });
    expect(JSON.stringify(payload)).not.toContain("athleteIq");
    expect(JSON.stringify(payload)).not.toContain("trainer_assignment");
  });

  it("exposes both enabled flags (no reason codes) on the Athlete IQ surface", async () => {
    const response = await GET(meRequest("athlete-iq"));
    const payload = await response.json();

    expect(payload.user.productEntitlements).toEqual({
      habigoal: { enabled: true },
      athleteIq: { enabled: true }
    });
    expect(JSON.stringify(payload)).not.toContain("trainer_assignment");
  });

  it("defaults to the most restrictive (consumer) projection when no surface is declared", async () => {
    const response = await GET(meRequest());
    const payload = await response.json();

    expect(payload.user.productEntitlements).toEqual({ habigoal: { enabled: true } });
  });
});
