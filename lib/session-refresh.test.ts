import { describe, expect, it } from "vitest";
import { SESSION_DURATION_MS, buildRefreshedClaims, shouldRefreshSession } from "@/lib/session-refresh";

const now = 1_700_000_000_000;
const iatSec = (msAgo: number) => Math.floor((now - msAgo) / 1000);

describe("shouldRefreshSession", () => {
  it("refreshes once past half the lifetime", () => {
    expect(shouldRefreshSession({ iat: iatSec(SESSION_DURATION_MS * 0.6) }, now)).toBe(true);
  });

  it("does not refresh a fresh token", () => {
    expect(shouldRefreshSession({ iat: iatSec(SESSION_DURATION_MS * 0.1) }, now)).toBe(false);
  });

  it("does not refresh without an issued-at claim", () => {
    expect(shouldRefreshSession({}, now)).toBe(false);
  });
});

describe("buildRefreshedClaims", () => {
  it("issues a new window while preserving identity claims", () => {
    const claims = buildRefreshedClaims({ userId: "u1", email: "a@b.com", role: "athlete", iat: iatSec(SESSION_DURATION_MS), exp: 1 }, now);
    expect(claims.userId).toBe("u1");
    expect(claims.email).toBe("a@b.com");
    expect(claims.iat).toBe(Math.floor(now / 1000));
    expect(claims.exp).toBe(Math.floor((now + SESSION_DURATION_MS) / 1000));
    expect(claims.expires).toBe(now + SESSION_DURATION_MS);
  });
});
