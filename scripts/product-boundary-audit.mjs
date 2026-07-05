import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const checkedFiles = [
  "app/[locale]/page.tsx",
  "app/[locale]/login/page.tsx",
  "components/product/ProductSurfaceShared.tsx",
  "components/product/habigoal/HabigoalExperience.tsx",
  "components/product/athlete-iq/AthleteIqExperience.tsx",
  "lib/product-apps.ts",
  "lib/product-surfaces.ts",
  "messages/en.json",
  "messages/hu.json",
  "messages/de.json",
  "messages/es.json",
  "messages/ar.json",
  "messages/he.json"
];

const forbidden = [
  /\bHabigoal\s+is\s+a\s+copy\b/i,
  /\bcopy\s+of\s+Athlete\s*IQ\b/i,
  /\bseparate\s+Habigoal-only\s+(profile|history|database|data\s+store)\b/i,
  /\bselector\s+only\s+for\s+(presentation|demo)\b/i,
  /\bclient\s+presentation\b/i,
  /\bpresentation\s+selector\b/i
];

const requiredProductSurfaceSnippets = [
  "shared daily-status records",
  "professional workflows",
  "functionRegistry: athleteIqFunctions",
  "never imports Habigoal UI or Habigoal functions"
];

const failures = [];
for (const file of checkedFiles) {
  const source = readFileSync(path.join(root, file), "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(source)) failures.push(`${file}: ${pattern}`);
  }
}

const productSurfaces = readFileSync(path.join(root, "lib/product-surfaces.ts"), "utf8");
for (const snippet of requiredProductSurfaceSnippets) {
  if (!productSurfaces.includes(snippet)) failures.push(`lib/product-surfaces.ts missing required shared-profile snippet: ${snippet}`);
}
for (const forbidden of ["includedSurfaceIds", "supportive-light", "Mint", "Sky", "functionRegistry: [...habigoalFunctions"]) {
  if (productSurfaces.includes(forbidden)) failures.push(`lib/product-surfaces.ts keeps forbidden mixed-surface registry/theme marker: ${forbidden}`);
}

const productApps = readFileSync(path.join(root, "lib/product-apps.ts"), "utf8");
const requiredProductAppSnippets = [
  'PRODUCT_APP_SEQUENCE = ["habigoal", "athlete-iq-athlete", "athlete-iq-trainer"]',
  'productSurfaceKey: "habigoal"',
  'productSurfaceKey: "athlete_iq"',
  "themePresetId: ATHLETE_IQ_GDS_THEME_PRESET",
  'allowedFunctionPrefixes: ["hbg-"]',
  'allowedFunctionPrefixes: ["aiq-"]',
  "mayRenderForeignProductUi: false",
  "mayPublishForeignProductFunctions: false",
  'sourceContract: "shared-daily-status-ledger"',
  'dailyStatus: "write-personal"',
  'dailyStatus: "read-write-own-athlete"',
  'dailyStatus: "read-team"'
];
for (const snippet of requiredProductAppSnippets) {
  if (!productApps.includes(snippet)) failures.push(`lib/product-apps.ts missing strict app contract marker: ${snippet}`);
}

const habigoalSource = readFileSync(path.join(root, "components/product/habigoal/HabigoalExperience.tsx"), "utf8");
for (const snippet of ["statusAvailable", "resolveDailyUiState", "hasRecordedHabits", "JourneyProgress"]) {
  if (!habigoalSource.includes(snippet)) failures.push(`Habigoal daily UX missing state-machine marker: ${snippet}`);
}

if (failures.length > 0) {
  console.error("Product boundary audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Product boundary audit passed for ${checkedFiles.length} files.`);
