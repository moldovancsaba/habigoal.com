import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/oauth/wearable/callback/route";
import { createWearableCookieState, createWearableState, WEARABLE_OAUTH_STATE_COOKIE } from "@/lib/wearable-oauth-state";
import { decryptToken } from "@/lib/wearable-token-crypto";

const SECRET = "callback-test-secret";

vi.mock("@/config/env", () => ({
  env: { appBaseUrl: "https://app.test" },
  requireServerEnv: (key: string) => (key === "authSecret" ? SECRET : "")
}));

vi.mock("@/lib/wearable-oauth-providers", () => ({
  getWearableOAuthProvider: vi.fn(),
  computeExpiryIso: () => "2026-06-28T13:00:00.000Z"
}));

vi.mock("@/repositories/device-connection.repository", () => ({
  findConnectionByAthleteAndSource: vi.fn(async () => null),
  upsertDeviceConnection: vi.fn(async () => {})
}));

import { getWearableOAuthProvider } from "@/lib/wearable-oauth-providers";
import { upsertDeviceConnection } from "@/repositories/device-connection.repository";

function callbackRequest(query: Record<string, string>, cookieState?: string): NextRequest {
  const url = new URL("https://app.test/api/oauth/wearable/callback");
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const headers: Record<string, string> = {};
  if (cookieState !== undefined) headers.cookie = `${WEARABLE_OAUTH_STATE_COOKIE}=${cookieState}`;
  return new NextRequest(url, { headers });
}

function validStatePair(provider = "oura", codeVerifier?: string) {
  const binding = { athleteId: "a1", provider, locale: "en", nonce: "n1" };
  const issuedAt = new Date();
  return {
    queryState: createWearableState(binding, SECRET, issuedAt),
    cookieState: createWearableCookieState({ ...binding, codeVerifier }, SECRET, issuedAt)
  };
}

let exchange: ReturnType<typeof vi.fn>;
function mockProvider(opts: { configured?: boolean } = {}) {
  exchange = vi.fn(async () => ({ access_token: "live-access", refresh_token: "live-refresh", expires_in: 3600, scope: "daily heartrate" }));
  vi.mocked(getWearableOAuthProvider).mockReturnValue({
    isConfigured: () => opts.configured ?? true,
    exchangeAuthCode: exchange as never,
    buildAuthorizeUrl: () => "https://authorize.test"
  });
}

describe("wearable OAuth callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider();
  });

  it("creates a connection with encrypted tokens and redirects on success (oura)", async () => {
    const state = validStatePair("oura");
    const res = await GET(callbackRequest({ code: "auth-code", state: state.queryState }, state.cookieState));

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://app.test/en/dashboard/wearables?connected=oura");
    expect(upsertDeviceConnection).toHaveBeenCalledOnce();
    const saved = vi.mocked(upsertDeviceConnection).mock.calls[0][0];
    expect(saved.source).toBe("oura");
    expect(saved.status).toBe("active");
    expect(saved.accessToken).not.toBe("live-access");
    expect(decryptToken(saved.accessToken)).toBe("live-access");
  });

  it("dispatches by provider and persists a whoop connection", async () => {
    const state = validStatePair("whoop");
    const res = await GET(callbackRequest({ code: "auth-code", state: state.queryState }, state.cookieState));
    expect(res.headers.get("location")).toBe("https://app.test/en/dashboard/wearables?connected=whoop");
    expect(vi.mocked(upsertDeviceConnection).mock.calls[0][0].source).toBe("whoop");
  });

  it("passes PKCE verifier from the cookie-only state to provider exchange", async () => {
    const state = validStatePair("garmin", "verifier-123");
    const res = await GET(callbackRequest({ code: "auth-code", state: state.queryState }, state.cookieState));

    expect(res.status).toBe(302);
    expect(exchange).toHaveBeenCalledWith("auth-code", "https://app.test/api/oauth/wearable/callback", "verifier-123");
  });

  it("rejects a forged/mismatched state with 403 and persists nothing", async () => {
    const state = validStatePair();
    const res = await GET(callbackRequest({ code: "auth-code", state: "tampered" }, state.cookieState));
    expect(res.status).toBe(403);
    expect(upsertDeviceConnection).not.toHaveBeenCalled();
  });

  it("returns 400 when code or state is missing", async () => {
    const state = validStatePair();
    const res = await GET(callbackRequest({ state: state.queryState }, state.cookieState));
    expect(res.status).toBe(400);
  });

  it("redirects with error and persists nothing when the exchange fails", async () => {
    mockProvider();
    exchange.mockRejectedValueOnce(new Error("exchange_failed_400"));
    const state = validStatePair();
    const res = await GET(callbackRequest({ code: "auth-code", state: state.queryState }, state.cookieState));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://app.test/en/dashboard/wearables?error=exchange_failed");
    expect(upsertDeviceConnection).not.toHaveBeenCalled();
  });

  it("redirects with consent_denied when the provider returns an error", async () => {
    const state = validStatePair();
    const res = await GET(callbackRequest({ error: "access_denied", state: state.queryState }, state.cookieState));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://app.test/en/dashboard/wearables?error=consent_denied");
  });

  it("returns 501 when the provider OAuth is not configured", async () => {
    mockProvider({ configured: false });
    const state = validStatePair();
    const res = await GET(callbackRequest({ code: "auth-code", state: state.queryState }, state.cookieState));
    expect(res.status).toBe(501);
  });
});
