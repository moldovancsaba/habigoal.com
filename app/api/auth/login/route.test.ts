import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSession } from "@/lib/session";
import { upsertPersonaLoginUser } from "@/repositories/user.repository";
import { POST } from "./route";

vi.mock("@/lib/session", () => ({
  createSession: vi.fn()
}));

vi.mock("@/repositories/user.repository", () => ({
  upsertPersonaLoginUser: vi.fn()
}));

const mockedCreateSession = vi.mocked(createSession);
const mockedUpsertPersonaLoginUser = vi.mocked(upsertPersonaLoginUser);

describe("persona pseudo login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a username athlete session and redirects to Habigoal", async () => {
    mockedUpsertPersonaLoginUser.mockResolvedValue({
      id: "user-1",
      email: "maria-player@habigoal.local",
      name: "Maria Player",
      roles: ["athlete"],
      productEntitlements: {
        habigoal: { enabled: true, reason: "self_registered" },
        athleteIq: { enabled: false }
      }
    });

    const response = await POST(loginRequest({ identifier: "Maria Player", persona: "athlete", next: "/hu" }));

    expect(mockedUpsertPersonaLoginUser).toHaveBeenCalledWith({
      email: "maria-player@habigoal.local",
      name: "Maria Player",
      roles: ["athlete"]
    });
    expect(mockedCreateSession).toHaveBeenCalledWith({
      id: "user-1",
      email: "maria-player@habigoal.local",
      name: "Maria Player",
      role: "athlete",
      productSurface: "habigoal"
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/hu/habigoal");
  });

  it("creates an email trainer session and redirects to Athlete IQ", async () => {
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
      roles: ["trainer"]
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

  it("keeps the selected athlete persona active when the same user has both roles", async () => {
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

  it("denies Athlete IQ when explicit professional entitlement is missing", async () => {
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
