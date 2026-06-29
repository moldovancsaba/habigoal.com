import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSession } from "@/lib/session";
import { findUserByEmail, upsertPersonaLoginUser } from "@/repositories/user.repository";
import { ensureCanonicalAthleteProfileForUser } from "@/services/shared-athlete-profile.service";
import { POST } from "./route";

vi.mock("@/lib/session", () => ({
  createSession: vi.fn()
}));

vi.mock("@/repositories/user.repository", () => ({
  findUserByEmail: vi.fn(),
  upsertPersonaLoginUser: vi.fn()
}));

vi.mock("@/services/shared-athlete-profile.service", () => ({
  ensureCanonicalAthleteProfileForUser: vi.fn()
}));

const mockedCreateSession = vi.mocked(createSession);
const mockedFindUserByEmail = vi.mocked(findUserByEmail);
const mockedUpsertPersonaLoginUser = vi.mocked(upsertPersonaLoginUser);
const mockedEnsureAthlete = vi.mocked(ensureCanonicalAthleteProfileForUser);

describe("persona pseudo login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects username-only login because registration is email-only", async () => {
    const response = await POST(loginRequest({ identifier: "Maria Player", persona: "athlete", next: "/hu" }));

    expect(mockedFindUserByEmail).not.toHaveBeenCalled();
    expect(mockedUpsertPersonaLoginUser).not.toHaveBeenCalled();
    expect(mockedCreateSession).not.toHaveBeenCalled();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/hu/login?next=%2Fhu&error=invalid_identifier");
  });

  it("creates an email trainer session and redirects to Athlete IQ", async () => {
    mockedFindUserByEmail.mockResolvedValue(null);
    mockedUpsertPersonaLoginUser.mockResolvedValue({
      id: "user-2",
      email: "coach@example.com",
      name: "coach@example.com",
      roles: ["athlete", "trainer"],
      productEntitlements: {
        habigoal: { enabled: true, reason: "aiq_member" },
        athleteIq: { enabled: true, reason: "trainer_assignment" }
      }
    });

    const response = await POST(loginRequest({ identifier: "Coach@Example.com", persona: "trainer", next: "/hu" }));

    expect(mockedUpsertPersonaLoginUser).toHaveBeenCalledWith({
      email: "coach@example.com",
      name: "Coach@Example.com",
      productSurface: "athlete-iq",
      roles: ["trainer", "athlete"]
    });
    expect(mockedCreateSession).toHaveBeenCalledWith({
      id: "user-2",
      email: "coach@example.com",
      name: "coach@example.com",
      role: "trainer",
      productSurface: "athlete-iq"
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/hu/athlete-iq");
  });

  it("creates an Athlete IQ athlete session when registering through the Athlete IQ surface", async () => {
    mockedFindUserByEmail.mockResolvedValue(null);
    mockedUpsertPersonaLoginUser.mockResolvedValue({
      id: "user-aiq-athlete",
      email: "athlete@example.com",
      name: "athlete@example.com",
      roles: ["athlete"],
      productEntitlements: {
        habigoal: { enabled: true, reason: "aiq_member" },
        athleteIq: { enabled: true, reason: "pro_athlete_membership" }
      }
    });

    const response = await POST(loginRequest({ identifier: "Athlete@Example.com", persona: "athlete", next: "/hu/athlete-iq", productSurface: "athlete-iq" }));

    expect(mockedUpsertPersonaLoginUser).toHaveBeenCalledWith({
      email: "athlete@example.com",
      name: "Athlete@Example.com",
      productSurface: "athlete-iq",
      roles: ["athlete"]
    });
    expect(mockedCreateSession).toHaveBeenCalledWith({
      id: "user-aiq-athlete",
      email: "athlete@example.com",
      name: "athlete@example.com",
      role: "athlete",
      productSurface: "athlete-iq"
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/hu/athlete-iq");
    // A freshly registered athlete (no athleteId) gets their own profile
    // provisioned so every athlete surface has data to attach to.
    expect(mockedEnsureAthlete).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.objectContaining({ email: "athlete@example.com" }) })
    );
  });

  it("provisions an athlete profile for a trainer too (trainers are also athletes)", async () => {
    mockedFindUserByEmail.mockResolvedValue(null);
    mockedUpsertPersonaLoginUser.mockResolvedValue({
      id: "user-coach-only",
      email: "coachonly@example.com",
      name: "coachonly@example.com",
      roles: ["trainer", "athlete"],
      productEntitlements: {
        habigoal: { enabled: true, reason: "aiq_member" },
        athleteIq: { enabled: true, reason: "trainer_assignment" }
      }
    });

    await POST(loginRequest({ identifier: "coachonly@example.com", persona: "trainer", next: "/hu/athlete-iq", productSurface: "athlete-iq" }));

    expect(mockedUpsertPersonaLoginUser).toHaveBeenCalledWith(
      expect.objectContaining({ roles: ["trainer", "athlete"] })
    );
    expect(mockedEnsureAthlete).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.objectContaining({ email: "coachonly@example.com" }) })
    );
  });

  it("keeps the selected athlete persona active when the same user has both roles", async () => {
    mockedFindUserByEmail.mockResolvedValue({
      id: "user-3",
      email: "same-user@example.com",
      name: "same-user@example.com",
      roles: ["athlete", "trainer"],
      productEntitlements: {
        habigoal: { enabled: true, reason: "aiq_member" },
        athleteIq: { enabled: true, reason: "trainer_assignment" }
      }
    });
    mockedUpsertPersonaLoginUser.mockResolvedValue({
      id: "user-3",
      email: "same-user@example.com",
      name: "same-user@example.com",
      roles: ["athlete", "trainer"],
      productEntitlements: {
        habigoal: { enabled: true, reason: "aiq_member" },
        athleteIq: { enabled: true, reason: "trainer_assignment" }
      }
    });

    const response = await POST(loginRequest({ identifier: "same-user@example.com", persona: "athlete", next: "/hu" }));

    expect(mockedUpsertPersonaLoginUser).toHaveBeenCalledWith({
      email: "same-user@example.com",
      name: "same-user@example.com",
      productSurface: "habigoal",
      roles: ["athlete"]
    });
    expect(mockedCreateSession).toHaveBeenCalledWith({
      id: "user-3",
      email: "same-user@example.com",
      name: "same-user@example.com",
      role: "athlete",
      productSurface: "habigoal"
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/hu/habigoal");
  });

  it("allows Habigoal-first self-registration without any prior Athlete IQ account (#424)", async () => {
    // No pre-existing user — standalone consumer signup.
    mockedFindUserByEmail.mockResolvedValue(null);
    mockedUpsertPersonaLoginUser.mockResolvedValue({
      id: "user-new",
      email: "new-athlete@example.com",
      name: "new-athlete@example.com",
      roles: ["athlete"],
      productEntitlements: {
        habigoal: { enabled: true, reason: "self_registered" },
        athleteIq: { enabled: false }
      }
    });

    const response = await POST(loginRequest({ identifier: "new-athlete@example.com", persona: "athlete", next: "/hu/habigoal", productSurface: "habigoal" }));

    expect(mockedUpsertPersonaLoginUser).toHaveBeenCalledWith({
      email: "new-athlete@example.com",
      name: "new-athlete@example.com",
      productSurface: "habigoal",
      roles: ["athlete"]
    });
    expect(mockedCreateSession).toHaveBeenCalled();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/hu/habigoal");
  });

  it("denies Athlete IQ when explicit professional entitlement is missing", async () => {
    mockedFindUserByEmail.mockResolvedValue({
      id: "user-4",
      email: "new-coach@example.com",
      name: "New Coach",
      roles: ["trainer"],
      productEntitlements: {
        habigoal: { enabled: true, reason: "self_registered" },
        athleteIq: { enabled: false }
      }
    });
    mockedUpsertPersonaLoginUser.mockResolvedValue({
      id: "user-4",
      email: "new-coach@example.com",
      name: "New Coach",
      roles: ["trainer"],
      productEntitlements: {
        habigoal: { enabled: true, reason: "self_registered" },
        athleteIq: { enabled: false }
      }
    });

    const response = await POST(loginRequest({ identifier: "new-coach@example.com", persona: "trainer", next: "/hu/athlete-iq", productSurface: "athlete-iq" }));

    expect(mockedCreateSession).not.toHaveBeenCalled();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/hu/login?next=%2Fhu%2Fathlete-iq&error=athlete_iq_access_required");
  });

  it("returns to the login page when persona is missing", async () => {
    const response = await POST(loginRequest({ identifier: "coach@example.com", next: "/hu" }));

    expect(mockedUpsertPersonaLoginUser).not.toHaveBeenCalled();
    expect(mockedCreateSession).not.toHaveBeenCalled();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/hu/login?next=%2Fhu&error=missing_persona");
  });

  it("never leaks Athlete IQ entitlement or reason codes to a consumer login response (#432)", async () => {
    // A dual-entitled user signs in through the CONSUMER (Habigoal) surface.
    // The JSON response must expose only the Habigoal entitlement — no AIQ key,
    // no reason codes like trainer_assignment.
    mockedFindUserByEmail.mockResolvedValue(null);
    mockedUpsertPersonaLoginUser.mockResolvedValue({
      id: "user-dual",
      email: "dual@example.com",
      name: "dual@example.com",
      roles: ["athlete", "trainer"],
      productEntitlements: {
        habigoal: { enabled: true, grantedAt: "2026-06-27T08:00:00.000Z", reason: "aiq_member" },
        athleteIq: { enabled: true, grantedAt: "2026-06-27T08:00:00.000Z", reason: "trainer_assignment" }
      }
    });

    const response = await POST(
      jsonLoginRequest({ identifier: "dual@example.com", persona: "athlete", next: "/hu/habigoal", productSurface: "habigoal" })
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.user.productEntitlements).toEqual({ habigoal: { enabled: true } });
    expect(JSON.stringify(payload)).not.toContain("trainer_assignment");
    expect(JSON.stringify(payload)).not.toContain("athleteIq");
  });
});

function loginRequest(body: Record<string, string>) {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    body: new URLSearchParams(body),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      referer: "http://localhost/hu"
    }
  });
}

function jsonLoginRequest(body: Record<string, string>) {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    body: new URLSearchParams(body),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
      referer: "http://localhost/hu"
    }
  });
}
