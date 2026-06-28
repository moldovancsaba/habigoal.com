import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/oauth/wearable/callback/route";
import { createWearableState, WEARABLE_OAUTH_STATE_COOKIE } from "@/lib/wearable-oauth-state";
import { decryptToken } from "@/lib/wearable-token-crypto";

const SECRET = "callback-test-secret";

vi.mock("@/config/env", () => ({
  env: { appBaseUrl: "https://app.test", ouraApiBaseUrl: "https://api.ouraring.com", ouraClientId: "cid", ouraClientSecret: "csecret" },
  requireServerEnv: (key: string) => (key === "authSecret" ? SECRET : "")
}));

vi.mock("@/lib/oura-oauth", () => ({
  isOuraOAuthConfigured: vi.fn(() => true),
  exchangeOuraAuthCode: vi.fn(async () => ({ access_token: "live-access", refresh_token: "live-refresh", expires_in: 3600, scope: "daily heartrate" })),
  computeExpiryIso: () => "2026-06-28T13:00:00.000Z"
}));

vi.mock("@/repositories/device-connection.repository", () => ({
  findConnectionByAthleteAndSource: vi.fn(async () => null),
  upsertDeviceConnection: vi.fn(async () => {})
}));

import { exchangeOuraAuthCode, isOuraOAuthConfigured } from "@/lib/oura-oauth";
import { upsertDeviceConnection } from "@/repositories/device-connection.repository";

function callbackRequest(query: Record<string, string>, cookieState?: string): NextRequest {
  const url = new URL("https://app.test/api/oauth/wearable/callback");
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const headers: Record<string, string> = {};
  if (cookieState !== undefined) headers.cookie = `${WEARABLE_OAUTH_STATE_COOKIE}=${cookieState}`;
  return new NextRequest(url, { headers });
}

function validState() {
  return createWearableState({ athleteId: "a1", provider: "oura", locale: "en", nonce: "n1" }, SECRET);
}

describe("wearable OAuth callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isOuraOAuthConfigured).mockReturnValue(true);
  });

  it("creates a connection with encrypted tokens and redirects on success", async () => {
    const state = validState();
    const res = await GET(callbackRequest({ code: "auth-code", state }, state));

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://app.test/en/dashboard/wearables?connected=oura");
    expect(upsertDeviceConnection).toHaveBeenCalledOnce();
    const saved = vi.mocked(upsertDeviceConnection).mock.calls[0][0];
    expect(saved.source).toBe("oura");
    expect(saved.status).toBe("active");
    expect(saved.scopes).toEqual(["daily", "heartrate"]);
    // Tokens persisted encrypted (round-trips back to the plaintext), never raw.
    expect(saved.accessToken).not.toBe("live-access");
    expect(decryptToken(saved.accessToken)).toBe("live-access");
  });

  it("rejects a forged/mismatched state with 403 and persists nothing", async () => {
    const res = await GET(callbackRequest({ code: "auth-code", state: "tampered" }, validState()));
    expect(res.status).toBe(403);
    expect(upsertDeviceConnection).not.toHaveBeenCalled();
  });

  it("returns 400 when code or state is missing", async () => {
    const res = await GET(callbackRequest({ state: validState() }, validState()));
    expect(res.status).toBe(400);
  });

  it("redirects with error and persists nothing when the exchange fails", async () => {
    vi.mocked(exchangeOuraAuthCode).mockRejectedValueOnce(new Error("exchange_failed_400"));
    const state = validState();
    const res = await GET(callbackRequest({ code: "auth-code", state }, state));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://app.test/en/dashboard/wearables?error=exchange_failed");
    expect(upsertDeviceConnection).not.toHaveBeenCalled();
  });

  it("redirects with consent_denied when the provider returns an error", async () => {
    const state = validState();
    const res = await GET(callbackRequest({ error: "access_denied", state }, state));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://app.test/en/dashboard/wearables?error=consent_denied");
    expect(upsertDeviceConnection).not.toHaveBeenCalled();
  });

  it("returns 501 when Oura OAuth is not configured", async () => {
    vi.mocked(isOuraOAuthConfigured).mockReturnValue(false);
    const res = await GET(callbackRequest({ code: "auth-code", state: validState() }, validState()));
    expect(res.status).toBe(501);
  });
});
