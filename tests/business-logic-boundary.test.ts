import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

describe("business logic boundary regression guard", () => {
  it("requires Athlete IQ API routes to resolve an Athlete IQ-entitled user", () => {
    const files = [
      ...routeFiles("app/api/athleteiq"),
      ...routeFiles("app/api/aiq")
    ];

    const directCalls = files.filter((file) => read(file).includes("getAuthUser()"));

    expect(directCalls).toEqual([]);
  });

  it("does not trust client-supplied role headers for API authorization", () => {
    const apiSource = read("lib/api.ts");

    expect(apiSource).not.toContain("x-habigoal-role");
    expect(apiSource).not.toContain("headers.get");
  });

  it("does not place external provider access tokens in the app session", () => {
    expect(read("lib/session.ts")).not.toContain("accessToken");
    expect(read("app/api/oauth/callback/route.ts")).not.toContain("accessToken:");
  });

  it("keeps the wearable PKCE verifier out of public URL state", () => {
    const deviceRoute = read("app/api/athletes/[id]/devices/route.ts");
    const stateCall = deviceRoute.match(/createWearableState\(([\s\S]*?)\);/)?.[1] ?? "";

    expect(stateCall).not.toContain("codeVerifier");
    expect(deviceRoute).toContain("createWearableCookieState");
  });

  it("keeps unauthenticated mobile health sync disabled", () => {
    const source = read("app/api/athletes/[id]/devices/health-sync/route.ts");

    expect(source).toContain('getAuthUser({ productSurface: "athlete-iq" })');
    expect(source).toContain("HEALTH_SYNC_DISABLED");
    expect(source).not.toContain(".json()");
    expect(source).not.toContain("CanonicalMetric");
  });
});

function routeFiles(relativeDir: string): string[] {
  const absoluteDir = path.join(root, relativeDir);
  const entries = readdirSync(absoluteDir);
  return entries.flatMap((entry) => {
    const absolutePath = path.join(absoluteDir, entry);
    const relativePath = path.relative(root, absolutePath);
    if (statSync(absolutePath).isDirectory()) return routeFiles(relativePath);
    return entry === "route.ts" ? [relativePath] : [];
  });
}

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}
