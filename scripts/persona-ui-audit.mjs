import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const protectedScopes = [
  "components/landing",
  "components/product",
  "components/dashboard",
  "app/[locale]/habigoal",
  "app/[locale]/athlete-iq",
  "app/[locale]/login",
  "app/[locale]/dashboard/coach"
];
const protectedFiles = [
  "app/[locale]/page.tsx"
];

const reportIndex = process.argv.indexOf("--report");
const reportPath = reportIndex >= 0 ? process.argv[reportIndex + 1] : null;
const failures = [];
const warnings = [];
const checkedFiles = [
  ...protectedScopes.flatMap((scope) => collectFiles(path.join(root, scope))),
  ...protectedFiles.map((file) => path.join(root, file)).filter((file) => fs.existsSync(file))
];
const legacyHex = (...parts) => `#${parts.join("")}`;
const legacyRgba = (...parts) => `${["rg", "ba("].join("")}${parts.join(", ")}`;

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
assertSurfaceTopBarsGuarded("components/product/athlete-iq/AthleteIqExperience.tsx");
assertHabigoalOwnsChrome();
assertGoldAthleteThemeContract();
assertHabigoalBoundaryLanguage();
assertNoHabigoalLegacyThemeTokens();

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
    "shellOwner: productRoute ? \"product\""
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

function assertHabigoalOwnsChrome() {
  const routeFile = "app/[locale]/habigoal/page.tsx";
  const routeSource = fs.readFileSync(path.join(root, routeFile), "utf8");
  const componentFile = "components/product/habigoal/HabigoalExperience.tsx";
  const componentSource = fs.readFileSync(path.join(root, componentFile), "utf8");

  for (const snippet of ["DashboardShell", "embedded"]) {
    if (routeSource.includes(snippet)) {
      failures.push({
        file: routeFile,
        rule: "habigoal-chrome-ownership",
        message: `Habigoal route must not use shared dashboard chrome or embedded mode: ${snippet}`
      });
    }
  }

  for (const snippet of ["embedded", "hbg-embedded-viewswitch", "hbg-app-frame-embedded", "athlete_iq"]) {
    if (componentSource.includes(snippet)) {
      failures.push({
        file: componentFile,
        rule: "habigoal-source-boundary",
        message: `Habigoal source must not carry embedded/Athlete IQ implementation residue: ${snippet}`
      });
    }
  }

  for (const snippet of [
    "<SurfaceTopBar surface={surface} />",
    "className=\"hbg-bottom-nav hbg-bottom-nav-2\"",
    "aria-label={t(\"navigation.aria\")}",
    "aria-current={view === \"flow\" ? \"page\" : undefined}",
    "aria-current={view === \"progress\" ? \"page\" : undefined}"
  ]) {
    if (!componentSource.includes(snippet)) {
      failures.push({
        file: componentFile,
        rule: "habigoal-accessible-owned-chrome",
        message: `Missing Habigoal-owned accessible chrome marker: ${snippet}`
      });
    }
  }
}

function assertGoldAthleteThemeContract() {
  const checks = [
    {
      file: "theme/mantine-theme.ts",
      required: ["primaryColor: \"review\""],
      forbidden: ["primaryColor: \"ingress\""]
    },
    {
      file: "app/[locale]/layout.tsx",
      required: ["getSemanticTone(\"review\").color"],
      forbidden: ["getSemanticTone(\"ingress\").color"]
    },
    {
      file: "app/manifest.ts",
      required: ["getSemanticTone(\"review\").color"],
      forbidden: ["getSemanticTone(\"ingress\").color"]
    },
    {
      file: "components/product/ProductThemeBoundary.tsx",
      required: ["surface === \"habigoal\"", "surface === \"dashboard\"", "ATHLETE_IQ_GDS_THEME_PRESET", "--app-bg", "--blob-1"],
      forbidden: []
    }
  ];

  for (const check of checks) {
    const source = fs.readFileSync(path.join(root, check.file), "utf8");
    for (const snippet of check.required) {
      if (!source.includes(snippet)) {
        failures.push({
          file: check.file,
          rule: "gold-athlete-theme-contract",
          message: `Missing official gold/review theme contract marker: ${snippet}`
        });
      }
    }
    for (const snippet of check.forbidden) {
      if (source.includes(snippet)) {
        failures.push({
          file: check.file,
          rule: "gold-athlete-theme-contract",
          message: `Forbidden old blue/ingress theme marker remains: ${snippet}`
        });
      }
    }
  }

  const themeSource = fs.readFileSync(path.join(root, "theme/mantine-theme.ts"), "utf8");
  if (!/defaultGradient:\s*\{[\s\S]*?from:\s*"review(?:\.\d+)?"/.test(themeSource) || !/defaultGradient:\s*\{[\s\S]*?to:\s*"review(?:\.\d+)?"/.test(themeSource)) {
    failures.push({
      file: "theme/mantine-theme.ts",
      rule: "gold-athlete-theme-contract",
      message: "Mantine defaultGradient must stay on the official review/gold lane."
    });
  }

  const contractFile = "lib/product-ui-contracts.ts";
  const contractSource = fs.readFileSync(path.join(root, contractFile), "utf8");
  const contractSourceWithoutType = contractSource.replace(/export type ProductThemeMode[\s\S]*?;\n/, "");
  const requiredSnippets = [
    /dashboard:\s*\{[\s\S]*?mode:\s*"professional_dark_gold"/,
    /habigoal:\s*\{[\s\S]*?mode:\s*"professional_dark_gold"/,
    /habigoal:\s*\{[\s\S]*?primaryAction:\s*"review"/
  ];

  for (const pattern of requiredSnippets) {
    if (!pattern.test(contractSourceWithoutType)) {
      failures.push({
        file: contractFile,
        rule: "gold-athlete-theme-contract",
        message: `Missing official gold/review product contract: ${pattern}`
      });
    }
  }
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

function assertNoHabigoalLegacyThemeTokens() {
  const file = "app/globals.css";
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const forbiddenTokens = [
    "--hbg-sky",
    "--hbg-mint",
    legacyHex("0f", "9f8f"),
    legacyHex("16", "87d9"),
    legacyHex("0b", "5c54"),
    legacyHex("10", "2a2b"),
    legacyHex("12", "332f"),
    legacyHex("0e", "2d2a"),
    legacyHex("06", "4b43"),
    legacyHex("f1", "fffb"),
    legacyHex("f7", "fffc"),
    legacyRgba("15", "159", "143"),
    legacyRgba("15", "109", "101"),
    legacyRgba("19", "120", "107"),
    legacyRgba("0", "129", "112"),
    legacyHex("f7", "fbff"),
    legacyHex("ea", "f8f6"),
    "hbg-embedded-viewswitch",
    "hbg-app-frame-embedded"
  ];

  for (const token of forbiddenTokens) {
    if (source.includes(token)) {
      failures.push({
        file,
        rule: "habigoal-legacy-theme-token",
        message: `Habigoal CSS must not carry old teal/blue/embedded theme residue: ${token}`
      });
    }
  }
}

function writeReport(target, report) {
  const absoluteTarget = path.isAbsolute(target) ? target : path.join(root, target);
  fs.mkdirSync(path.dirname(absoluteTarget), { recursive: true });
  fs.writeFileSync(absoluteTarget, `${JSON.stringify(report, null, 2)}\n`);
}
