import { describe, expect, it } from "vitest";
import { buildWhoopAuthorizeUrl, exchangeWhoopAuthCode, isWhoopOAuthConfigured, WHOOP_AUTHORIZE_URL } from "@/lib/whoop-oauth";

describe("whoop-oauth", () => {
  it("builds an authorize URL with the required OAuth parameters", () => {
    const url = buildWhoopAuthorizeUrl({ redirectUri: "https://app.test/cb", state: "st1", scopes: ["read:recovery", "offline"] });
    expect(url.startsWith(`${WHOOP_AUTHORIZE_URL}?`)).toBe(true);
    const params = new URL(url).searchParams;
    expect(params.get("response_type")).toBe("code");
    expect(params.get("redirect_uri")).toBe("https://app.test/cb");
    expect(params.get("state")).toBe("st1");
    expect(params.get("scope")).toBe("read:recovery offline");
  });

  it("fails closed when credentials are not configured", async () => {
    expect(isWhoopOAuthConfigured()).toBe(false);
    await expect(exchangeWhoopAuthCode("code", "https://app.test/cb")).rejects.toThrow("WHOOP_NOT_CONFIGURED");
  });
});
