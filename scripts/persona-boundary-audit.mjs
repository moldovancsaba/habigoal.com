import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const reportDir = path.join(root, ".audit-reports");
const checks = [];

check("API role spoof header is not trusted", () => {
  const source = read("lib/api.ts");
  assert(!source.includes("x-habigoal-role"), "lib/api.ts still references x-habigoal-role");
  assert(!source.includes("headers.get"), "lib/api.ts should not read request headers for roles");
});

check("Athlete IQ direct APIs require Athlete IQ product auth", () => {
  const files = [...routeFiles("app/api/athleteiq"), ...routeFiles("app/api/aiq")];
  const directCalls = files.filter((file) => read(file).includes("getAuthUser()"));
  assert(directCalls.length === 0, `Direct getAuthUser() calls: ${directCalls.join(", ")}`);
});

check("API registry declares route classes and guard contracts", () => {
  const source = read("lib/api-access-registry.ts");
  for (const token of [
    "habigoal_user",
    "athlete_iq_athlete",
    "athlete_iq_trainer",
    "webhook_signed",
    "cron_secret",
    "requireHabigoalApiUser",
    "requireAthleteIqApiUser",
    "requireAthleteIqTrainerApiUser"
  ]) {
    assert(source.includes(token), `Missing API registry token: ${token}`);
  }
});

check("API role guard executes product-surface contracts", () => {
  const source = read("lib/api.ts");
  assert(source.includes("resolveApiRouteContract"), "requireRole does not resolve route contracts");
  assert(source.includes("resolveRequiredProductSurface"), "requireRole does not map route contracts to product surfaces");
  assert(source.includes("PRODUCT_ACCESS_DENIED"), "requireRole does not deny missing product entitlement");
});

check("Athlete IQ product auth fails closed in legacy handlers", () => {
  const offenders = routeFiles("app/api").flatMap((file) => optionalAthleteIqAuthSites(file));
  assert(offenders.length === 0, `Optional Athlete IQ auth remains in: ${offenders.join(", ")}`);
});

check("OAuth and session payloads do not carry provider secrets", () => {
  assert(!read("lib/session.ts").includes("accessToken"), "Session payload still contains accessToken");
  assert(!read("app/api/oauth/callback/route.ts").includes("accessToken:"), "OAuth callback still writes accessToken into app session");
  const deviceRoute = read("app/api/athletes/[id]/devices/route.ts");
  const publicStateCall = deviceRoute.match(/createWearableState\(([\s\S]*?)\);/)?.[1] ?? "";
  assert(!publicStateCall.includes("codeVerifier"), "Wearable public URL state still includes PKCE verifier");
  assert(deviceRoute.includes("createWearableCookieState"), "Wearable cookie-only PKCE state is not wired");
});

check("Untrusted mobile health sync is disabled", () => {
  const source = read("app/api/athletes/[id]/devices/health-sync/route.ts");
  assert(source.includes('getAuthUser({ productSurface: "athlete-iq" })'), "health-sync route does not require Athlete IQ product auth");
  assert(source.includes("HEALTH_SYNC_DISABLED"), "health-sync route is not explicitly disabled");
  assert(!source.includes(".json()"), "health-sync route still parses public JSON payloads");
});

check("API telemetry does not log raw athlete identifiers", () => {
  const offenders = routeFiles("app/api").filter((file) =>
    /console\.(info|warn|error)\(JSON\.stringify\([^)]*athleteId\s*:/.test(read(file))
  );
  assert(offenders.length === 0, `Raw athleteId telemetry in: ${offenders.join(", ")}`);
});

check("Persona login cannot self-grant Athlete IQ entitlement", () => {
  const source = read("lib/product-entitlements.ts");
  assert(!source.includes("grantRequestedProfessionalEntitlement"), "Self-grant helper still exists");
  assert(!source.includes("createAthleteIqAthleteEntitlements"), "AIQ athlete self-grant helper still exists");
  assert(!source.includes('requestedSurface === "athlete-iq" && requestedRoles.includes("athlete")'), "AIQ athlete request still grants entitlement");
});

check("Consent policy filters professional trainer reads", () => {
  const source = read("lib/data-sharing-consent.ts");
  assert(source.includes("SharedDataCategory"), "Shared data categories are not declared");
  assert(source.includes("resolveConsentDecisions"), "Consent decision resolver is missing");
  assert(read("services/shared-daily-state.service.ts").includes("applyDailyStateConsent"), "Shared daily state is not filtered by consent");
  assert(read("services/athleteiq-product-dashboard.service.ts").includes("sharingState"), "Trainer dashboard does not expose sharing state");
});

check("Partner contract page is wired to current contracts", () => {
  const source = read("app/[locale]/contracts/page.tsx");
  assert(source.includes("@sovereignsquad/gds/client"), "Contracts page must use GDS client primitives");
  assert(source.includes("businessPersonaContracts"), "Contracts page does not render persona contracts");
  assert(source.includes("trainerSupportFlow"), "Contracts page does not render trainer support flow");
});

check("UI boundary release gates are present", () => {
  const packageJson = JSON.parse(read("package.json"));
  for (const scriptName of ["api-access:audit", "product-boundary:audit", "persona-ui:audit", "gds:audit", "gds:compliance"]) {
    assert(Boolean(packageJson.scripts?.[scriptName]), `Missing package script: ${scriptName}`);
  }
});

const report = {
  generatedAt: new Date().toISOString(),
  cases: checks,
  summary: {
    failed: checks.filter((entry) => entry.status === "failed").length,
    passed: checks.filter((entry) => entry.status === "passed").length,
    total: checks.length
  }
};

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, "persona-boundary-report.json"), `${JSON.stringify(report, null, 2)}\n`);

if (report.summary.failed > 0) {
  console.error(`persona-boundary:audit failed: ${report.summary.failed}/${report.summary.total} checks failed`);
  for (const entry of checks.filter((item) => item.status === "failed")) {
    console.error(`- ${entry.id}: ${entry.violations.join("; ")}`);
  }
  process.exit(1);
}

console.log(`persona-boundary:audit passed: ${report.summary.passed}/${report.summary.total} checks passed`);

function check(id, fn) {
  try {
    fn();
    checks.push({ id, status: "passed", violations: [] });
  } catch (error) {
    checks.push({ id, status: "failed", violations: [error instanceof Error ? error.message : String(error)] });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function routeFiles(relativeDir) {
  const absoluteDir = path.join(root, relativeDir);
  if (!fs.existsSync(absoluteDir)) return [];
  const entries = fs.readdirSync(absoluteDir);
  return entries.flatMap((entry) => {
    const absolutePath = path.join(absoluteDir, entry);
    const relativePath = path.relative(root, absolutePath);
    if (fs.statSync(absolutePath).isDirectory()) return routeFiles(relativePath);
    return entry === "route.ts" ? [relativePath] : [];
  });
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function optionalAthleteIqAuthSites(file) {
  const source = read(file);
  const matches = [...source.matchAll(/const\s+(\w+)\s*=\s*await\s+getAuthUser\(\{\s*productSurface:\s*"athlete-iq"\s*\}\);/g)];
  return matches
    .filter((match) => {
      const variableName = match[1];
      const followingSource = source.slice(match.index, match.index + 500);
      return !followingSource.includes(`if (!${variableName}`);
    })
    .map((match) => `${file}:${match[1]}`);
}
