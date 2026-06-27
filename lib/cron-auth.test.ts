import { describe, expect, it } from "vitest";
import { authorizeCronRequest } from "@/lib/cron-auth";

describe("authorizeCronRequest", () => {
  const secret = "s3cr3t-token";

  it("denies when the secret is not configured", () => {
    expect(authorizeCronRequest(`Bearer ${secret}`, undefined)).toBe(false);
    expect(authorizeCronRequest(`Bearer ${secret}`, "")).toBe(false);
  });

  it("denies when the header is missing", () => {
    expect(authorizeCronRequest(null, secret)).toBe(false);
    expect(authorizeCronRequest(undefined, secret)).toBe(false);
  });

  it("denies a wrong or malformed token", () => {
    expect(authorizeCronRequest("Bearer wrong", secret)).toBe(false);
    expect(authorizeCronRequest(secret, secret)).toBe(false); // missing "Bearer " prefix
    expect(authorizeCronRequest(`Bearer ${secret}x`, secret)).toBe(false);
  });

  it("accepts the correct Bearer token", () => {
    expect(authorizeCronRequest(`Bearer ${secret}`, secret)).toBe(true);
  });
});
