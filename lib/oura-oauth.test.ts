import { describe, expect, it } from "vitest";
import { buildOuraAuthorizeUrl, computeExpiryIso, exchangeOuraAuthCode, isOuraOAuthConfigured, OURA_AUTHORIZE_URL } from "@/lib/oura-oauth";

describe("oura-oauth", () => {
  it("computeExpiryIso converts expires_in seconds to an absolute ISO timestamp", () => {
    const now = new Date("2026-06-28T12:00:00.000Z");
    expect(computeExpiryIso(3600, now)).toBe("2026-06-28T13:00:00.000Z");
    expect(computeExpiryIso(undefined, now)).toBeUndefined();
  });

  it("builds an authorize URL with the required OAuth parameters", () => {
    const url = buildOuraAuthorizeUrl({ redirectUri: "https://app.test/cb", state: "st1", scopes: ["daily"] });
    expect(url.startsWith(`${OURA_AUTHORIZE_URL}?`)).toBe(true);
    const params = new URL(url).searchParams;
    expect(params.get("response_type")).toBe("code");
    expect(params.get("redirect_uri")).toBe("https://app.test/cb");
    expect(params.get("state")).toBe("st1");
    expect(params.get("scope")).toBe("daily");
  });

  it("fails closed when credentials are not configured", async () => {
    // No OURA_CLIENT_ID/SECRET in the test environment.
    expect(isOuraOAuthConfigured()).toBe(false);
    await expect(exchangeOuraAuthCode("code", "https://app.test/cb")).rejects.toThrow("OURA_NOT_CONFIGURED");
  });
});
