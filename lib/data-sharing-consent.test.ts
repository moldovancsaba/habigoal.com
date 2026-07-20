import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveConsentDecisions } from "@/lib/data-sharing-consent";
import { findLatestConsent } from "@/repositories/consent.repository";
import type { AuthUser } from "@/lib/access";

vi.mock("@/repositories/consent.repository", () => ({
  findLatestConsent: vi.fn()
}));

const mockedFindLatestConsent = vi.mocked(findLatestConsent);
const athleteId = "507f1f77bcf86cd799439011";

describe("trainer data-sharing consent policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not require consent for an athlete reading their own data", async () => {
    const decisions = await resolveConsentDecisions({
      athleteId,
      categories: ["daily_check_in", "habit_summary"],
      user: user({ primaryRole: "athlete", roles: ["athlete"], athleteId })
    });

    expect(mockedFindLatestConsent).not.toHaveBeenCalled();
    expect(decisions).toEqual([
      { allowed: true, category: "daily_check_in", projection: "detail", reason: "not_required" },
      { allowed: true, category: "habit_summary", projection: "detail", reason: "not_required" }
    ]);
  });

  it("blocks trainer detail when consent is missing", async () => {
    mockedFindLatestConsent.mockResolvedValue(null);

    const decisions = await resolveConsentDecisions({
      athleteId,
      categories: ["daily_check_in"],
      user: user({ primaryRole: "trainer", roles: ["trainer"], athleteId: "coach-own-profile" })
    });

    expect(decisions).toEqual([
      { allowed: false, category: "daily_check_in", projection: "none", reason: "missing" }
    ]);
  });

  it("blocks trainer detail when consent was withdrawn", async () => {
    mockedFindLatestConsent.mockResolvedValue({
      athleteId,
      consentId: "consent-1",
      consentVersion: "1.0.0",
      createdAt: "2026-07-01T00:00:00.000Z",
      guardianRequired: false,
      method: "web_form",
      organisationId: "default",
      privacyNoticeVersion: "2026-06-01",
      purpose: "daily_check_in",
      status: "withdrawn",
      updatedAt: "2026-07-02T00:00:00.000Z"
    });

    const decisions = await resolveConsentDecisions({
      athleteId,
      categories: ["daily_check_in"],
      user: user({ primaryRole: "trainer", roles: ["trainer"] })
    });

    expect(decisions[0]).toMatchObject({ allowed: false, projection: "none", reason: "revoked" });
  });

  it("allows trainer summary projection when active consent is current", async () => {
    mockedFindLatestConsent.mockResolvedValue({
      athleteId,
      consentedAt: "2026-07-01T00:00:00.000Z",
      consentId: "consent-1",
      consentVersion: "1.0.0",
      createdAt: "2026-07-01T00:00:00.000Z",
      guardianRequired: false,
      method: "web_form",
      organisationId: "default",
      privacyNoticeVersion: "2026-06-01",
      purpose: "daily_check_in",
      status: "active",
      updatedAt: "2026-07-01T00:00:00.000Z"
    });

    const decisions = await resolveConsentDecisions({
      athleteId,
      categories: ["daily_check_in"],
      user: user({ primaryRole: "trainer", roles: ["trainer"] })
    });

    expect(decisions).toEqual([
      { allowed: true, category: "daily_check_in", projection: "summary", reason: "granted" }
    ]);
  });

  it("uses admin override without reading consent records", async () => {
    const decisions = await resolveConsentDecisions({
      athleteId,
      categories: ["daily_check_in"],
      user: user({ primaryRole: "admin", roles: ["admin"] })
    });

    expect(mockedFindLatestConsent).not.toHaveBeenCalled();
    expect(decisions[0]).toMatchObject({ allowed: true, projection: "detail", reason: "admin_override" });
  });
});

function user(patch: Partial<AuthUser> = {}): AuthUser {
  return {
    athleteId,
    email: "user@example.com",
    name: "User",
    primaryRole: "athlete",
    productEntitlements: {
      habigoal: { enabled: true, reason: "self_registered" },
      athleteIq: { enabled: true, reason: "pro_athlete_membership" }
    },
    roles: ["athlete"],
    teamIds: [],
    ...patch
  };
}
