import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  allHttpMethods,
  methodAllowedByContract,
  resolveApiRouteContract,
  type HttpMethod
} from "@/lib/api-access-registry";

const root = process.cwd();
const httpMethods = new Set<string>(allHttpMethods);

describe("API access registry", () => {
  it("classifies every API route and exported method", () => {
    const failures: string[] = [];

    for (const file of routeFiles("app/api")) {
      const routePattern = toApiRoutePattern(file);
      const contract = resolveApiRouteContract(routePattern);
      if (!contract) {
        failures.push(`${routePattern}: missing route contract`);
        continue;
      }

      const methods = exportedMethods(file);
      if (methods.length === 0) {
        failures.push(`${routePattern}: no exported HTTP method detected`);
      }

      for (const method of methods) {
        if (!methodAllowedByContract(contract, method)) {
          failures.push(`${routePattern}: ${method} not allowed by ${contract.pattern}`);
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it("documents every intentionally public route with a justification", () => {
    const publicRoutes = routeFiles("app/api")
      .map(toApiRoutePattern)
      .map((routePattern) => ({ routePattern, contract: resolveApiRouteContract(routePattern) }))
      .filter((entry) => entry.contract?.accessClass === "public");

    expect(publicRoutes.length).toBeGreaterThan(0);
    expect(publicRoutes.filter((entry) => !entry.contract?.publicJustification)).toEqual([]);
  });

  it("maps product and persona route families to the expected guard contracts", () => {
    expect(resolveApiRouteContract("/api/habigoal/daily-operation")).toMatchObject({
      accessClass: "habigoal_user",
      guard: "requireHabigoalApiUser",
      personaScope: "self",
      productSurface: "habigoal"
    });
    expect(resolveApiRouteContract("/api/athleteiq/daily-iq/today")).toMatchObject({
      accessClass: "athlete_iq_athlete",
      guard: "requireAthleteIqApiUser",
      productSurface: "athlete_iq"
    });
    expect(resolveApiRouteContract("/api/athleteiq/coach/dashboard")).toMatchObject({
      accessClass: "athlete_iq_trainer",
      guard: "requireAthleteIqTrainerApiUser",
      personaScope: "assigned_athletes",
      productSurface: "athlete_iq"
    });
    expect(resolveApiRouteContract("/api/cron/queue")).toMatchObject({
      accessClass: "cron_secret",
      guard: "cronSecret"
    });
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

function exportedMethods(relativePath: string): HttpMethod[] {
  const source = read(relativePath);
  const directMethods = Array.from(source.matchAll(/export\s+async\s+function\s+([A-Z]+)\b/g))
    .map((match) => match[1])
    .filter((method): method is HttpMethod => httpMethods.has(method));
  const reExportedMethods = Array.from(source.matchAll(/export\s+\{\s*([^}]+)\s*\}\s+from\b/g))
    .flatMap((match) => match[1].split(",").map((name) => name.trim().split(/\s+as\s+/i)[0]))
    .filter((method): method is HttpMethod => httpMethods.has(method));
  return Array.from(new Set([...directMethods, ...reExportedMethods]));
}

function toApiRoutePattern(relativePath: string) {
  return relativePath
    .replace(/^app\/api/, "/api")
    .replace(/\/route\.ts$/, "")
    .replace(/\[\.\.\.([^\]]+)\]/g, ":$1*")
    .replace(/\[([^\]]+)\]/g, ":$1");
}

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}
