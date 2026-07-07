import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const checkedFiles = [
  "app/[locale]/page.tsx",
  "app/[locale]/contracts/page.tsx",
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
  /\bpresentation\s+selector\b/i,
  /\bAthleteIQ\s+includes\s+every\s+Habigoal\s+function\b/i,
  /\bAthlete\s*IQ\s+includes\s+every\s+Habigoal\s+function\b/i,
  /\bAthleteIQ\s+includes\s+all\s+Habigoal/i,
  /\bevery\s+Habigoal\s+function\b/i,
  /\ball\s+Habigoal\s+functions\b/i,
  /\breal\s+Habigoal\s+data\b/i,
  /\bSession\s+sequencing\s+adapted\s+for\s+Habigoal\b/i,
  /\bProfessional\s+views\s+consume\s+Habigoal\s+data\b/i,
  /összes\s+Habigoal\s+funkció/i,
  /Habigoal\s+adatokhoz/i,
  /Habigoal-Daten/i,
  /todas\s+las\s+funciones\s+de\s+Habigoal/i,
  /datos\s+reales\s+de\s+Habigoal/i,
  /كل\s+وظائف\s+Habigoal/i,
  /بيانات\s+Habigoal\s+الحقيقية/i,
  /כל\s+פונקציות\s+Habigoal/i,
  /נתוני\s+Habigoal\s+אמיתיים/i
];

const requiredProductSurfaceSnippets = [
  "shared daily-status records",
  "professional workflows",
  "functionRegistry: athleteIqFunctions",
  "never imports Habigoal UI or Habigoal functions",
  "shared daily-status signals"
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

const englishMessages = readFileSync(path.join(root, "messages/en.json"), "utf8");
const requiredMessageSnippets = [
  "Each product keeps its own UI, functions, navigation, permissions, and copy.",
  "Habigoal renders only independent habitbuilder functions",
  "AthleteIQ renders only professional performance functions",
  "never Habigoal UI or function cards",
  "shared daily-status data"
];
for (const snippet of requiredMessageSnippets) {
  if (!englishMessages.includes(snippet)) failures.push(`messages/en.json missing strict product-copy boundary marker: ${snippet}`);
}

const contractPage = readFileSync(path.join(root, "app/[locale]/contracts/page.tsx"), "utf8");
for (const snippet of [
  "businessPersonaContracts",
  "trainerSupportFlow",
  "dataSharingContract",
  "storageContract",
  "interfaceSeparationRules",
  "operationalContract"
]) {
  if (!contractPage.includes(snippet)) failures.push(`app/[locale]/contracts/page.tsx missing partner contract section: ${snippet}`);
}

const businessContracts = readFileSync(path.join(root, "lib/business-logic-contracts.ts"), "utf8");
for (const snippet of [
  "Habigoal at habigoal.com",
  "Athletes at Athlete IQ",
  "Trainers at Athlete IQ",
  "shared-daily-status-ledger",
  "MongoDB Atlas",
  "never imports Habigoal UI or Habigoal function cards",
  "Route/API authorization enforces boundaries server-side"
]) {
  if (!businessContracts.includes(snippet)) failures.push(`lib/business-logic-contracts.ts missing public business contract marker: ${snippet}`);
}

const middlewareSource = readFileSync(path.join(root, "middleware.ts"), "utf8");
if (!/\/contracts\$/.test(middlewareSource)) failures.push("middleware.ts must keep the public partner contracts page available without login.");

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
