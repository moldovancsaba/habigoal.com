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

  it("does not log raw athlete identifiers from API JSON telemetry", () => {
    const files = routeFiles("app/api");
    const offenders = files.filter((file) =>
      /console\.(info|warn|error)\(JSON\.stringify\([^)]*athleteId\s*:/.test(read(file))
    );

    expect(offenders).toEqual([]);
  });

  it("fails closed after resolving Athlete IQ product auth in API handlers", () => {
    const offenders = routeFiles("app/api").flatMap((file) => {
      const source = read(file);
      const matches = Array.from(source.matchAll(/const\s+(\w+)\s*=\s*await\s+getAuthUser\(\{\s*productSurface:\s*"athlete-iq"\s*\}\);/g));
      return matches
        .filter((match) => !source.slice(match.index, match.index + 500).includes(`if (!${match[1]}`))
        .map((match) => `${file}:${match[1]}`);
    });

    expect(offenders).toEqual([]);
  });

  it("executes API registry product-surface contracts from the role guard", () => {
    const source = read("lib/api.ts");

    expect(source).toContain("resolveApiRouteContract");
    expect(source).toContain("resolveRequiredProductSurface");
    expect(source).toContain("PRODUCT_ACCESS_DENIED");
  });

  it("does not self-grant Athlete IQ entitlements from persona login", () => {
    const source = read("lib/product-entitlements.ts");

    expect(source).not.toContain("grantRequestedProfessionalEntitlement");
    expect(source).not.toContain("createAthleteIqAthleteEntitlements");
    expect(source).not.toContain('requestedSurface === "athlete-iq" && requestedRoles.includes("athlete")');
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
