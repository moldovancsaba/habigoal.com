import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { canAccessAthleteIqAthlete, getAuthUser } from "@/lib/access";
import { verifyWearableCookieState, verifyWearableState, WEARABLE_OAUTH_STATE_COOKIE } from "@/lib/wearable-oauth-state";
import { GET, POST } from "./route";
import { DELETE } from "./[connectionId]/route";
import { POST as POST_HEALTH_SYNC } from "./health-sync/route";
import { findConnectionById, findConnectionsByAthleteId, updateConnectionStatus } from "@/repositories/device-connection.repository";
import { getWearableOAuthProvider } from "@/lib/wearable-oauth-providers";

const SECRET = "device-route-secret";

vi.mock("@/config/env", () => ({
  env: {
    appBaseUrl: "https://app.test",
    habigoalEnforceAuth: true
  },
  requireServerEnv: (key: string) => (key === "authSecret" ? SECRET : "")
}));

vi.mock("@/lib/access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/access")>();
  return {
    ...actual,
    canAccessAthleteIqAthlete: vi.fn(),
    getAuthUser: vi.fn()
  };
});

vi.mock("@/repositories/device-connection.repository", () => ({
  findConnectionById: vi.fn(),
  findConnectionsByAthleteId: vi.fn(),
  updateConnectionStatus: vi.fn()
}));

vi.mock("@/lib/wearable-oauth-providers", () => ({
  getWearableOAuthProvider: vi.fn()
}));

const mockedGetAuthUser = vi.mocked(getAuthUser);
const mockedCanAccessAthleteIqAthlete = vi.mocked(canAccessAthleteIqAthlete);
const mockedFindConnectionsByAthleteId = vi.mocked(findConnectionsByAthleteId);
const mockedFindConnectionById = vi.mocked(findConnectionById);
const mockedUpdateConnectionStatus = vi.mocked(updateConnectionStatus);
const mockedGetWearableOAuthProvider = vi.mocked(getWearableOAuthProvider);

describe("athlete device API boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetAuthUser.mockResolvedValue(authUser());
    mockedCanAccessAthleteIqAthlete.mockResolvedValue(true);
    mockedFindConnectionsByAthleteId.mockResolvedValue([]);
  });

  it("rejects unauthenticated device reads before loading connections", async () => {
    mockedGetAuthUser.mockResolvedValue(null);

    const response = await GET(deviceRequest(), context({ id: "athlete-1" }));

    expect(response.status).toBe(401);
    expect(mockedFindConnectionsByAthleteId).not.toHaveBeenCalled();
  });

  it("keeps PKCE verifier out of public OAuth state", async () => {
    mockedGetWearableOAuthProvider.mockReturnValue({
      isConfigured: () => true,
      createPkce: () => ({ verifier: "verifier-secret", challenge: "challenge-public" }),
      buildAuthorizeUrl: (input: { state: string; codeChallenge?: string }) =>
        `https://wearable.test/oauth?state=${encodeURIComponent(input.state)}&code_challenge=${input.codeChallenge}`,
      exchangeAuthCode: vi.fn() as never
    });

    const response = await POST(deviceRequest({ method: "POST", body: { source: "garmin" } }), context({ id: "athlete-1" }));
    const payload = await response.json();
    const state = new URL(payload.authUrl).searchParams.get("state");
    const cookieState = cookieValue(response);

    expect(response.status).toBe(200);
    expect(payload.authUrl).not.toContain("verifier-secret");
    expect(verifyWearableState(state, SECRET)).toMatchObject({ athleteId: "athlete-1", provider: "garmin" });
    expect(verifyWearableCookieState(cookieState, SECRET)).toMatchObject({
      athleteId: "athlete-1",
      provider: "garmin",
      codeVerifier: "verifier-secret"
    });
  });

  it("requires the connection to belong to the scoped athlete before revoking", async () => {
    mockedFindConnectionById.mockResolvedValue({
      athleteId: "different-athlete",
      connectionId: "connection-1"
    } as never);

    const response = await DELETE(deviceRequest({ method: "DELETE" }), context({ id: "athlete-1", connectionId: "connection-1" }));

    expect(response.status).toBe(404);
    expect(mockedUpdateConnectionStatus).not.toHaveBeenCalled();
  });

  it("keeps direct mobile health sync disabled without parsing the payload", async () => {
    const response = await POST_HEALTH_SYNC(
      new Request("https://app.test/api/athletes/athlete-1/devices/health-sync", {
        method: "POST",
        body: "not-json"
      }),
      context({ id: "athlete-1" })
    );

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toMatchObject({ code: "HEALTH_SYNC_DISABLED", retryable: false });
  });
});

function authUser() {
  return {
    email: "coach@example.com",
    name: "Coach",
    roles: ["trainer"],
    primaryRole: "trainer",
    productEntitlements: {
      habigoal: { enabled: true, reason: "aiq_member" },
      athleteIq: { enabled: true, reason: "trainer_assignment" }
    },
    teamIds: ["team-1"]
  } as Awaited<ReturnType<typeof getAuthUser>>;
}

function deviceRequest(input: { method?: string; body?: Record<string, unknown> } = {}) {
  return new NextRequest("https://app.test/api/athletes/athlete-1/devices", {
    method: input.method || "GET",
    body: input.body ? JSON.stringify(input.body) : undefined,
    headers: {
      "content-type": "application/json",
      referer: "https://app.test/hu/dashboard/wearables"
    }
  });
}

function context<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) };
}

function cookieValue(response: Response) {
  const raw = response.headers.get("set-cookie")?.match(new RegExp(`${WEARABLE_OAUTH_STATE_COOKIE}=([^;]+)`))?.[1];
  return raw ? decodeURIComponent(raw) : "";
}
