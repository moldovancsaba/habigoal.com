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
  "app/[locale]/page.tsx",
  "app/[locale]/athletes/[id]/training-log/page.tsx",
  "components/athletes/AthletesAppHome.tsx",
  "components/athletes/TrainingLoadLogger.tsx",
  "components/layout/CookieConsentBanner.tsx"
];
const personaColorContractFiles = [
  ...protectedFiles,
  "components/admin/AthleteProfileAdminPanel.tsx",
  "components/admin/CheckInConfigAdminPanel.tsx"
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
assertDashboardRouteColorContract();
assertNoDirectMantineComponentImports();
assertNoRawDashboardColorProps();
assertRouteChromeContract();
assertHabigoalOwnsChrome();
assertAthleteIqOwnsChrome();
assertGlobalOverlayColorContract();
assertAthletePersonaShellContract();
assertPersonaColorContract();
assertNoLegacyBlueUiTokens();
assertGoldAthleteThemeContract();
assertProductSurfaceRegistryContract();
assertProductAppContract();
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
    /var\(--brand-gradient\)/g,
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

function assertDashboardRouteColorContract() {
  const dashboardFiles = collectFiles(path.join(root, "app/[locale]/dashboard"));
  const forbiddenPatterns = [
    {
      pattern: /color=\{?["']ingress["']/,
      message: "Dashboard route UI must use getProductColor(\"dashboard\", \"primaryAction\") instead of the old ingress/blue lane."
    },
    {
      pattern: /color=\{?["']knowmore["']/,
      message: "Dashboard route UI must use getProductColor(\"dashboard\", \"secondaryAction\") or another dashboard intent instead of the old knowmore lane."
    }
  ];

  for (const file of dashboardFiles) {
    const relativeFile = path.relative(root, file);
    const source = fs.readFileSync(file, "utf8");
    for (const { pattern, message } of forbiddenPatterns) {
      if (pattern.test(source)) {
        failures.push({
          file: relativeFile,
          rule: "dashboard-route-color-contract",
          message
        });
      }
    }
  }
}

function assertNoDirectMantineComponentImports() {
  const files = [
    ...collectFiles(path.join(root, "app")),
    ...collectFiles(path.join(root, "components"))
  ];

  for (const file of files) {
    const relativeFile = path.relative(root, file);
    const source = fs.readFileSync(file, "utf8");
    if (/\bfrom\s+["']@mantine\/core["']/.test(source)) {
      failures.push({
        file: relativeFile,
        rule: "global-gds-only",
        message: "Application TS/TSX must import UI primitives from @sovereignsquad/gds or local GDS adapters, not direct @mantine/core component imports."
      });
    }
  }
}

function assertNoRawDashboardColorProps() {
  const files = [
    ...collectFiles(path.join(root, "app/[locale]/dashboard")),
    ...collectFiles(path.join(root, "components/dashboard")),
    ...collectFiles(path.join(root, "components/admin")),
    ...collectFiles(path.join(root, "components/forms")),
    ...collectFiles(path.join(root, "components/consent"))
  ];
  const rawHuePattern = /\bcolor=\{?["'](blue|gray|green|red|teal|violet|yellow)["']/;

  for (const file of files) {
    const relativeFile = path.relative(root, file);
    const source = fs.readFileSync(file, "utf8");
    if (rawHuePattern.test(source)) {
      failures.push({
        file: relativeFile,
        rule: "dashboard-product-color-contract",
        message: "Dashboard UI color props must resolve through getProductColor(...) or approved GDS semantic tokens instead of raw hue names."
      });
    }
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

function assertAthleteIqOwnsChrome() {
  const routeFile = "app/[locale]/athlete-iq/page.tsx";
  const routeSource = fs.readFileSync(path.join(root, routeFile), "utf8");
  const componentFile = "components/product/athlete-iq/AthleteIqExperience.tsx";
  const componentSource = fs.readFileSync(path.join(root, componentFile), "utf8");
  const styleFile = "app/globals.css";
  const styleSource = fs.readFileSync(path.join(root, styleFile), "utf8");

  for (const snippet of ["DashboardShell", "embedded"]) {
    if (routeSource.includes(snippet)) {
      failures.push({
        file: routeFile,
        rule: "athlete-iq-chrome-ownership",
        message: `Athlete IQ route must not use shared dashboard chrome or embedded mode: ${snippet}`
      });
    }
  }

  for (const snippet of ["embedded", "aiq-command-layout-embedded", "DashboardShell"]) {
    if (componentSource.includes(snippet)) {
      failures.push({
        file: componentFile,
        rule: "athlete-iq-source-boundary",
        message: `Athlete IQ source must not carry shared-shell implementation residue: ${snippet}`
      });
    }
  }

  for (const snippet of ["aiq-command-layout-embedded"]) {
    if (styleSource.includes(snippet)) {
      failures.push({
        file: styleFile,
        rule: "athlete-iq-legacy-layout-token",
        message: `Athlete IQ CSS must not carry old embedded layout residue: ${snippet}`
      });
    }
  }

  for (const snippet of [
    "<SurfaceTopBar surface={surface} />",
    "AiqMobileTopBar",
    "AiqMobileNavigation",
    "className=\"aiq-command-layout\"",
    "className=\"aiq-sidebar-v2 aiq-desktop-sidebar surface-outline\""
  ]) {
    if (!componentSource.includes(snippet)) {
      failures.push({
        file: componentFile,
        rule: "athlete-iq-accessible-owned-chrome",
        message: `Missing Athlete IQ-owned chrome marker: ${snippet}`
      });
    }
  }
}

function assertGlobalOverlayColorContract() {
  const file = "components/layout/CookieConsentBanner.tsx";
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const requiredSnippets = [
    "resolveProductSurfaceFromPathname(pathname)",
    "getProductColor(activeSurface, \"primaryAction\")",
    "getProductColor(activeSurface, \"secondaryAction\")"
  ];
  const forbiddenSnippets = [
    "color=\"ingress\"",
    "color=\"gray\"",
    "@mantine/core"
  ];

  for (const snippet of requiredSnippets) {
    if (!source.includes(snippet)) {
      failures.push({
        file,
        rule: "global-overlay-product-color-contract",
        message: `Cookie consent overlay must inherit active product color contract: ${snippet}`
      });
    }
  }

  for (const snippet of forbiddenSnippets) {
    if (source.includes(snippet)) {
      failures.push({
        file,
        rule: "global-overlay-product-color-contract",
        message: `Cookie consent overlay must not hardcode legacy/default UI color or direct Mantine: ${snippet}`
      });
    }
  }
}

function assertAthletePersonaShellContract() {
  const files = [
    {
      file: "components/athletes/AthletesAppHome.tsx",
      required: ["getProductColor(ATHLETE_APP_SURFACE, \"primaryAction\")"],
      forbidden: ["@mantine/core", "color=\"ingress\"", "mantine-color-ingress"]
    },
    {
      file: "app/[locale]/athletes/[id]/training-log/page.tsx",
      required: ["<DashboardShell>", "TrainingLoadLogger"],
      forbidden: ["setTimeout", "session-plans/rpe", "Real implementation"]
    },
    {
      file: "components/athletes/TrainingLoadLogger.tsx",
      required: ["`/api/athletes/${athleteId}/training-load`", "getProductColor(\"dashboard\", \"primaryAction\")"],
      forbidden: ["@mantine/core", "bg=\"gray.0\"", "color=\"ingress\"", "mantine-color-ingress", "setTimeout", "session-plans/rpe", "Real implementation"]
    },
    {
      file: "app/api/session-plans/rpe/route.ts",
      required: ["requireRole(request, [\"admin\", \"trainer\", \"athlete\"])", "canAccessAthlete(authUser, athleteId)", "createTrainingLoadRecord"],
      forbidden: ["console.log", "Store in DB", "completedLoadPoints: rpeScore *"]
    }
  ];

  for (const check of files) {
    const source = fs.readFileSync(path.join(root, check.file), "utf8");
    for (const snippet of check.required) {
      if (!source.includes(snippet)) {
        failures.push({
          file: check.file,
          rule: "athlete-persona-shell-contract",
          message: `Athlete persona route must keep shared dark/gold shell contract: ${snippet}`
        });
      }
    }
    for (const snippet of check.forbidden) {
      if (source.includes(snippet)) {
        failures.push({
          file: check.file,
          rule: "athlete-persona-shell-contract",
          message: `Athlete persona route must not keep old blue/light UI residue: ${snippet}`
        });
      }
    }
  }
}

function assertPersonaColorContract() {
  for (const relativeFile of new Set(personaColorContractFiles)) {
    const filePath = path.join(root, relativeFile);
    if (!fs.existsSync(filePath)) continue;
    const source = fs.readFileSync(filePath, "utf8");
    for (const snippet of ["color=\"ingress\"", "color='ingress'", "var(--mantine-color-ingress"]) {
      if (source.includes(snippet)) {
        failures.push({
          file: relativeFile,
          rule: "persona-primary-action-color-contract",
          message: `Persona primary actions must resolve through product-ui-contracts instead of the old ingress/blue lane: ${snippet}`
        });
      }
    }
  }
}

function assertNoLegacyBlueUiTokens() {
  const checkedRoots = ["app", "components", "lib", "services"];
  const forbiddenPatterns = [
    {
      pattern: /color=\{?["']ingress["']/,
      message: "UI must not hardcode the old ingress/blue semantic color."
    },
    {
      pattern: /color=\{?["']knowmore["']/,
      message: "UI must not hardcode the old knowmore/blue semantic color."
    },
    {
      pattern: /var\(--mantine-color-ingress-[0-9]\)/,
      message: "UI must not reference the old ingress/blue Mantine CSS token."
    },
    {
      pattern: /var\(--mantine-color-knowmore-[0-9]\)/,
      message: "UI must not reference the old knowmore/blue Mantine CSS token."
    },
    {
      pattern: /primaryAction:\s*["']ingress["']/,
      message: "Product contracts must not map primary actions to the old ingress/blue lane."
    },
    {
      pattern: /\baccent=["'](ingress|knowmore)["']/,
      message: "UI metric components must not accept legacy ingress/knowmore accent props; use product color intents."
    },
    {
      pattern: /\baccent=\{[^}]*["'](ingress|knowmore)["'][^}]*\}/,
      message: "UI metric components must not resolve dynamic accents to legacy ingress/knowmore; use product color intents."
    },
    {
      pattern: /--brand-blue|--brand-gradient/,
      message: "Global UI CSS must not define or consume the legacy blue brand tokens."
    }
  ];

  for (const rootName of checkedRoots) {
    for (const file of collectFiles(path.join(root, rootName))) {
      const relativeFile = path.relative(root, file);
      const source = fs.readFileSync(file, "utf8");
      for (const { pattern, message } of forbiddenPatterns) {
        if (pattern.test(source)) {
          failures.push({
            file: relativeFile,
            rule: "no-legacy-blue-ui-token",
            message
          });
        }
      }
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
    /habigoal:\s*\{[\s\S]*?primaryAction:\s*"review"/,
    /public:\s*\{[\s\S]*?primaryAction:\s*"review"/
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

function assertProductSurfaceRegistryContract() {
  const file = "lib/product-surfaces.ts";
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const forbiddenSnippets = [
    "includedSurfaceIds",
    "supportive-light",
    "Mint",
    "Sky",
    "path: \"/athletes\"",
    "functionRegistry: [...habigoalFunctions"
  ];
  const requiredSnippets = [
    "mode: \"athlete-gold\"",
    "gdsPresetId: ATHLETE_IQ_GDS_THEME_PRESET",
    "functionRegistry: habigoalFunctions",
    "functionRegistry: athleteIqFunctions",
    "never imports Habigoal UI or Habigoal functions"
  ];

  for (const snippet of forbiddenSnippets) {
    if (source.includes(snippet)) {
      failures.push({
        file,
        rule: "product-surface-registry-boundary",
        message: `Product registry must not expose mixed UI/theme/function ownership marker: ${snippet}`
      });
    }
  }

  for (const snippet of requiredSnippets) {
    if (!source.includes(snippet)) {
      failures.push({
        file,
        rule: "product-surface-registry-boundary",
        message: `Product registry is missing strict ownership marker: ${snippet}`
      });
    }
  }
}

function assertProductAppContract() {
  const contractFile = "lib/product-apps.ts";
  const contractSource = fs.readFileSync(path.join(root, contractFile), "utf8");
  const requiredContractSnippets = [
    'PRODUCT_APP_SEQUENCE = ["habigoal", "athlete-iq-athlete", "athlete-iq-trainer"]',
    'productSurfaceId: "habigoal"',
    'productSurfaceId: "athlete-iq"',
    'productSurfaceKey: "habigoal"',
    'productSurfaceKey: "athlete_iq"',
    'themePresetId: ATHLETE_IQ_GDS_THEME_PRESET',
    'allowedFunctionPrefixes: ["hbg-"]',
    'allowedFunctionPrefixes: ["aiq-"]',
    'forbiddenFunctionPrefixes: ["hbg-"]',
    'forbiddenFunctionPrefixes: ["aiq-"]',
    'mayRenderForeignProductUi: false',
    'mayPublishForeignProductFunctions: false',
    'sourceContract: "shared-daily-status-ledger"'
  ];

  for (const snippet of requiredContractSnippets) {
    if (!contractSource.includes(snippet)) {
      failures.push({
        file: contractFile,
        rule: "product-app-contract",
        message: `Missing canonical app boundary marker: ${snippet}`
      });
    }
  }

  const routeChecks = [
    {
      file: "app/[locale]/habigoal/page.tsx",
      required: ['getProductAppContract("habigoal")', "getProductAppSessionInput(HABIGOAL_APP, locale)", "appContract={HABIGOAL_APP}"]
    },
    {
      file: "app/[locale]/athlete-iq/page.tsx",
      required: ["resolveAthleteIqProductAppId(requestedPersona)", "getProductAppSessionInput(appContract, locale", "appContract={appContract}"]
    }
  ];

  for (const check of routeChecks) {
    const source = fs.readFileSync(path.join(root, check.file), "utf8");
    for (const snippet of check.required) {
      if (!source.includes(snippet)) {
        failures.push({
          file: check.file,
          rule: "product-app-contract",
          message: `Product route must consume the canonical app contract: ${snippet}`
        });
      }
    }
  }

  const shellChecks = [
    "components/product/habigoal/HabigoalExperience.tsx",
    "components/product/athlete-iq/AthleteIqExperience.tsx"
  ];

  for (const file of shellChecks) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    if (!source.includes("ProductThemeBoundary surface={appContract.productSurfaceKey}")) {
      failures.push({
        file,
        rule: "product-app-contract",
        message: "Product shells must receive their theme surface from the selected app contract."
      });
    }

    if (/ProductThemeBoundary\s+surface=["'](?:habigoal|athlete_iq)["']/.test(source)) {
      failures.push({
        file,
        rule: "product-app-contract",
        message: "Product shells must not hardcode their own theme surface; the route-selected app contract owns it."
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
