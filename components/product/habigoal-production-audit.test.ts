import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const locales = ["en", "hu", "de", "es", "ar", "he"];
const productionFiles = [
  "app/[locale]/page.tsx",
  "app/[locale]/habigoal/page.tsx",
  "components/landing/ProductEntryCard.tsx",
  "components/product/habigoal/HabigoalExperience.tsx",
  "components/product/ProductSurfaceShared.tsx",
  "lib/product-surfaces.ts"
];
const habigoalSourceFiles = [
  "app/[locale]/habigoal/page.tsx",
  "components/product/habigoal/HabigoalExperience.tsx"
];
const legacyHex = (prefix: string, suffix: string) => new RegExp(`#${prefix}${suffix}`, "i");
const copyForbidden = [
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
const implementationForbidden = [
  /\bDashboardShell\b/,
  /\bembedded\b/i,
  /\bhbg-app-frame-embedded\b/i,
  /\bhbg-embedded-viewswitch\b/i,
  /\bathlete_iq\b/i,
  /\bAthleteIQ\b/i
];
const habigoalStyleForbidden = [
  /\bhbg-app-frame-embedded\b/i,
  /\bhbg-embedded-viewswitch\b/i,
  /--hbg-sky\b/i,
  /--hbg-mint\b/i,
  legacyHex("0f", "9f8f"),
  legacyHex("16", "87d9"),
  legacyHex("12", "332f"),
  legacyHex("0e", "2d2a"),
  legacyHex("06", "4b43"),
  legacyHex("f1", "fffb"),
  legacyHex("f7", "fffc"),
  /rgba\(0,\s*129,\s*112/i
];

describe("Habigoal production copy and locale gate", () => {
  it("keeps the Habigoal message tree aligned in every shipped locale", () => {
    const canonical = flatten(readMessages("en").ProductSurfaces.habigoal);
    const canonicalKeys = [...canonical.keys()].sort();

    for (const locale of locales) {
      const messages = flatten(readMessages(locale).ProductSurfaces.habigoal);
      expect([...messages.keys()].sort()).toEqual(canonicalKeys);
    }
  });

  it("blocks presentation, theme, and fake-data language from production Habigoal surfaces", () => {
    const sources = [
      ...locales.map((locale) => `messages/${locale}.json`),
      ...productionFiles
    ];
    const failures: string[] = [];

    for (const sourcePath of sources) {
      const source = readFileSync(join(root, sourcePath), "utf8");
      for (const pattern of copyForbidden) {
        if (pattern.test(source)) failures.push(`${sourcePath}: ${pattern}`);
      }
    }

    expect(failures).toEqual([]);
  });

  it("blocks embedded chrome, cross-app identifiers, and legacy color tokens from Habigoal implementation files", () => {
    const failures: string[] = [];

    for (const sourcePath of habigoalSourceFiles) {
      const source = readFileSync(join(root, sourcePath), "utf8");
      for (const pattern of implementationForbidden) {
        if (pattern.test(source)) failures.push(`${sourcePath}: ${pattern}`);
      }
    }
    const styles = readFileSync(join(root, "app/globals.css"), "utf8");
    for (const pattern of habigoalStyleForbidden) {
      if (pattern.test(styles)) failures.push(`app/globals.css: ${pattern}`);
    }

    expect(failures).toEqual([]);
  });

  it("keeps all message catalogs parseable after structured copy edits", () => {
    for (const file of readdirSync(join(root, "messages")).filter((name) => name.endsWith(".json"))) {
      expect(() => JSON.parse(readFileSync(join(root, "messages", file), "utf8"))).not.toThrow();
    }
  });
});

function readMessages(locale: string) {
  return JSON.parse(readFileSync(join(root, "messages", `${locale}.json`), "utf8"));
}

function flatten(value: unknown, prefix = "", output = new Map<string, unknown>()) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, output);
    }
    return output;
  }

  output.set(prefix, value);
  return output;
}
