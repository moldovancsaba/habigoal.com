import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const locales = ["en", "hu", "de", "es", "ar", "he"];
const forbidden = [
  /Támogató nappali téma/i,
  /Supportive daylight/i,
  /\bthemeName\b/i,
  /\bdemo\b/i,
  /\bdemó\b/i,
  /\bpresentation\b/i,
  /\bprezent[aá]ci[oó]/i,
  /\bPWA\b/,
  /readiness engine/i,
  /readiness model/i,
  /source data/i,
  /Forr[aá]sadat/i,
  /Automatic feedback/i,
  /Automatikus visszajelz[eé]s/i
];
const files = [
  ...locales.map((locale) => `messages/${locale}.json`),
  "app/[locale]/page.tsx",
  "app/[locale]/habigoal/page.tsx",
  "components/landing/ProductEntryCard.tsx",
  "components/product/habigoal/HabigoalExperience.tsx",
  "components/product/ProductSurfaceShared.tsx",
  "lib/product-surfaces.ts"
];
const failures = [];

for (const locale of locales) {
  JSON.parse(readFileSync(path.join(root, "messages", `${locale}.json`), "utf8"));
}

for (const file of files) {
  const source = readFileSync(path.join(root, file), "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(source)) failures.push(`${file}: ${pattern}`);
  }
}

if (failures.length) {
  console.error("Habigoal production audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Habigoal production audit passed for ${files.length} files.`);
