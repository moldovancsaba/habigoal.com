import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const protectedScopes = [
  "components/product",
  "components/dashboard",
  "app/[locale]/habigoal",
  "app/[locale]/athlete-iq",
  "app/[locale]/dashboard/coach"
];

const reportIndex = process.argv.indexOf("--report");
const reportPath = reportIndex >= 0 ? process.argv[reportIndex + 1] : null;
const failures = [];
const warnings = [];
const checkedFiles = protectedScopes.flatMap((scope) => collectFiles(path.join(root, scope)));

for (const file of checkedFiles) {
  const relativeFile = path.relative(root, file);
  const source = fs.readFileSync(file, "utf8");

  if (/\bfrom\s+["']@mantine\/core["']|\bimport\s+[^;]*["']@mantine\/core["']/.test(source)) {
    failures.push({
      file: relativeFile,
      rule: "persona-gds-only",
      message: "Persona UI scopes must use @sovereignsquad/gds or the local GDS adapter, not direct @mantine/core imports."
    });
  }

  if (isDashboardScope(relativeFile) && /color=\{?["']ingress["']/.test(source)) {
    failures.push({
      file: relativeFile,
      rule: "dashboard-primary-action-contract",
      message: "Dashboard actions must use getProductColor(\"dashboard\", \"primaryAction\") so trainer UI stays on the governed gold/review lane."
    });
  }

  if (isDashboardScope(relativeFile) && /color=\{?["']yellow["']/.test(source)) {
    failures.push({
      file: relativeFile,
      rule: "dashboard-warning-contract",
      message: "Dashboard warning UI must use getProductColor(\"dashboard\", \"warning\") instead of raw yellow."
    });
  }

  const rawColorHits = findRawPersonaColors(source);
  if (rawColorHits.length > 0) {
    failures.push({
      file: relativeFile,
      rule: "no-raw-persona-color",
      message: `Raw brand colors found in persona UI: ${rawColorHits.join(", ")}. Use product-ui-contracts and GDS tokens.`
    });
  }
}

assertDashboardColorContract();
assertRouteChromeContract();
assertSurfaceTopBarsGuarded("components/product/habigoal/HabigoalExperience.tsx");
assertSurfaceTopBarsGuarded("components/product/athlete-iq/AthleteIqExperience.tsx");
assertHabigoalBoundaryLanguage();
assertHabigoalAccessibleViewSwitch();

const report = {
  checkedAt: new Date().toISOString(),
  checkedFiles: checkedFiles.length,
  failures,
  warnings
};

if (reportPath) writeReport(reportPath, report);

if (failures.length > 0) {
  console.error("Persona UI audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure.file}: [${failure.rule}] ${failure.message}`);
  }
  process.exit(1);
}

console.log(`Persona UI audit passed for ${checkedFiles.length} protected files.`);
for (const warning of warnings) console.log(`- ${warning}`);

function collectFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", ".next", "node_modules", "coverage", "dist"].includes(entry.name)) continue;
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(target, results);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      results.push(target);
    }
  }
  return results;
}

function isDashboardScope(relativeFile) {
  return relativeFile.startsWith("components/dashboard/") || relativeFile.startsWith("app/[locale]/dashboard/coach/");
}

function findRawPersonaColors(source) {
  const hits = new Set();
  const patterns = [
    /var\(--brand-blue\)/g,
    /var\(--brand-yellow\)/g,
    /#[0-9a-fA-F]{6,8}/g
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) hits.add(match[0]);
  }

  return [...hits].sort();
}

function assertDashboardColorContract() {
  const file = "lib/product-ui-contracts.ts";
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const colorSource = source.slice(source.indexOf("const PRODUCT_COLORS"));
  const dashboardBlock = /dashboard:\s*\{([\s\S]*?)\n\s*\}/.exec(colorSource)?.[1] ?? "";
  if (!/primaryAction:\s*"review"/.test(dashboardBlock)) {
    failures.push({
      file,
      rule: "dashboard-primary-action-contract",
      message: "Dashboard primaryAction must resolve to review/gold, not ingress/blue."
    });
  }
}

function assertRouteChromeContract() {
  const file = "lib/product-ui-contracts.ts";
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const requiredSnippets = [
    "allowMobileProductNav: !productRoute",
    "allowProductTopBar: !dashboardRoute && !productRoute",
    "shellOwner: dashboardRoute || productRoute ? \"dashboard\""
  ];

  for (const snippet of requiredSnippets) {
    if (!source.includes(snippet)) {
      failures.push({
        file,
        rule: "route-chrome-contract",
        message: `Missing route chrome ownership guard: ${snippet}`
      });
    }
  }
}

function assertSurfaceTopBarsGuarded(relativeFile) {
  const lines = fs.readFileSync(path.join(root, relativeFile), "utf8").split("\n");
  lines.forEach((line, index) => {
    if (!line.includes("<SurfaceTopBar")) return;
    const context = lines.slice(Math.max(0, index - 6), index + 1).join("\n");
    if (!/!\s*embedded/.test(context)) {
      failures.push({
        file: relativeFile,
        rule: "embedded-chrome-ownership",
        message: "SurfaceTopBar must be guarded by !embedded so the shared shell does not render duplicate product headers."
      });
    }
  });
}

function assertHabigoalBoundaryLanguage() {
  const checked = [
    "services/habigoal-product.service.ts",
    "services/shared-daily-state.service.ts",
    "lib/product-entitlements.ts",
    ...checkedFiles.map((file) => path.relative(root, file))
  ];
  const forbidden = [
    /white[- ]label\s+of\s+Athlete\s*IQ/i,
    /white[- ]label\s+of\s+AthleteIQ/i,
    /Habigoal\s+is\s+a\s+copy/i,
    /copy\s+of\s+Athlete\s*IQ/i
  ];

  for (const relativeFile of new Set(checked)) {
    const filePath = path.join(root, relativeFile);
    if (!fs.existsSync(filePath)) continue;
    const source = fs.readFileSync(filePath, "utf8");
    for (const pattern of forbidden) {
      if (pattern.test(source)) {
        failures.push({
          file: relativeFile,
          rule: "habigoal-independent-boundary",
          message: "Habigoal must be documented as an independent whitelabel habitbuilder that can serve anybody."
        });
      }
    }
  }
}

function assertHabigoalAccessibleViewSwitch() {
  const file = "components/product/habigoal/HabigoalExperience.tsx";
  const source = fs.readFileSync(path.join(root, file), "utf8");
  for (const snippet of ["role=\"tablist\"", "aria-label={t(\"navigation.aria\")}", "aria-selected"]) {
    if (!source.includes(snippet)) {
      failures.push({
        file,
        rule: "habigoal-view-switch-accessibility",
        message: `Missing accessible view switch marker: ${snippet}`
      });
    }
  }
}

function writeReport(target, report) {
  const absoluteTarget = path.isAbsolute(target) ? target : path.join(root, target);
  fs.mkdirSync(path.dirname(absoluteTarget), { recursive: true });
  fs.writeFileSync(absoluteTarget, `${JSON.stringify(report, null, 2)}\n`);
}
