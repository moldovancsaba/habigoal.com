import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import { buildGarminAuthorizeUrl, createGarminPkce, exchangeGarminAuthCode, isGarminOAuthConfigured } from "@/lib/garmin-oauth";

describe("garmin-oauth (PKCE)", () => {
  it("creates a PKCE verifier with a matching S256 challenge", () => {
    const { verifier, challenge } = createGarminPkce();
    expect(verifier.length).toBeGreaterThan(20);
    expect(challenge).toBe(createHash("sha256").update(verifier).digest("base64url"));
  });

  it("builds an authorize URL including the PKCE challenge when provided", () => {
    const url = buildGarminAuthorizeUrl({ redirectUri: "https://app.test/cb", state: "st1", codeChallenge: "chal", scopes: ["HEALTH_READ"] });
    const params = new URL(url).searchParams;
    expect(params.get("response_type")).toBe("code");
    expect(params.get("redirect_uri")).toBe("https://app.test/cb");
    expect(params.get("state")).toBe("st1");
    expect(params.get("code_challenge")).toBe("chal");
    expect(params.get("code_challenge_method")).toBe("S256");
  });

  it("omits PKCE params when no challenge is supplied", () => {
    const params = new URL(buildGarminAuthorizeUrl({ redirectUri: "https://app.test/cb", state: "st1" })).searchParams;
    expect(params.get("code_challenge")).toBeNull();
  });

  it("fails closed when credentials are not configured", async () => {
    expect(isGarminOAuthConfigured()).toBe(false);
    await expect(exchangeGarminAuthCode("code", "https://app.test/cb", "verifier")).rejects.toThrow("GARMIN_NOT_CONFIGURED");
  });
});
