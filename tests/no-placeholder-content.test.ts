import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// GH-334 regression guard: rendered surfaces and message catalogs must not contain
// classic placeholder/filler content. "lorem"/"ipsum" never have a legitimate
// use in product copy, so they are banned outright across the UI and i18n
// catalogs. This enforces the "placeholder keys are disallowed in CI/PR" cutoff.
//
// Note on scope: the issue's illustrative banned list also mentions "demo" and
// "sample", but those have genuine non-placeholder uses in this codebase (the
// demo seed ecosystem in GH-427, "user@example.com"-style example inputs). Banning
// them wholesale would produce false positives, so this guard targets only the
// unambiguous filler markers. The allowed-placeholder catalog lives in
// docs/placeholder-content-policy.md.
const SCAN_DIRS = ["app", "components", "messages"];
const SCAN_EXTENSIONS = [".ts", ".tsx", ".json"];
const BANNED = /\b(lorem|ipsum)\b/i;

// This guard documents the banned words in its own source, so it must exclude
// itself from the scan.
const SELF = "no-placeholder-content.test.ts";

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectFiles(full));
    } else if (SCAN_EXTENSIONS.some((ext) => full.endsWith(ext)) && !full.endsWith(SELF)) {
      out.push(full);
    }
  }
  return out;
}

describe("no placeholder/filler content in shipped surfaces (GH-334)", () => {
  const files = SCAN_DIRS.flatMap((dir) => collectFiles(join(process.cwd(), dir)));

  it("scans a non-trivial number of files", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("contains no lorem/ipsum filler in UI or i18n catalogs", () => {
    const offenders = files.filter((file) => BANNED.test(readFileSync(file, "utf8")));
    expect(offenders, `placeholder content found in: ${offenders.join(", ")}`).toHaveLength(0);
  });
});
