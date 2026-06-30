// Deep language audit (reusable). Three independent checks the standard
// i18n:audit does NOT fully cover:
//
//   1. HARDCODED user-facing strings anywhere in app/ + components/
//      (JSX text nodes and human-readable string props), not just a curated
//      list of seven files.
//   2. UNTRANSLATED leftovers across ALL namespaces — any non-English value
//      that is byte-identical to the English source (English leaking through
//      key+placeholder parity).
//   3. WRONG-SCRIPT / mixed-language values — Latin-only text sitting in the
//      Arabic/Hebrew catalogs, or Arabic/Hebrew script sitting in a
//      Latin-script catalog.
//
// Exit code is always 0: this is a *report*, not a gate. Run it ad hoc:
//   node scripts/language-audit.mjs           (summary)
//   node scripts/language-audit.mjs --full    (every finding)

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const messagesDir = path.join(root, "messages");
const supportedLocales = ["en", "hu", "de", "es", "ar", "he"];
const FULL = process.argv.includes("--full");

// ---------- helpers ----------
function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function flatten(value, prefix = "", output = new Map()) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, output);
    }
    return output;
  }
  output.set(prefix, value);
  return output;
}

function walkFiles(dir, extensions, output = []) {
  if (!existsSync(dir)) return output;
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walkFiles(fullPath, extensions, output);
      continue;
    }
    if (extensions.has(path.extname(fullPath))) output.push(fullPath);
  }
  return output;
}

const ARABIC = /[؀-ۿݐ-ݿ]/;
const HEBREW = /[֐-׿יִ-ﭏ]/;
const LATIN_LETTER = /[A-Za-z]/;

// ---------- 1. hardcoded UI strings ----------
// Heuristic: flag string literals that look like human sentences/words and are
// NOT obviously code, config, or already wrapped by t()/translate().
const PROP_KEYS = [
  "label", "title", "subtitle", "subheader", "header", "placeholder",
  "aria-label", "alt", "description", "message", "actionLabel", "tooltip",
  "helperText", "caption", "emptyLabel", "nothingFoundMessage",
];
const ALLOWED_LITERALS = new Set([
  "Habigoal", "AthleteIQ", "Athlete IQ", "habigoal", "athleteiq",
]);

// reject text that is clearly not prose: identifiers, code, urls, css, etc.
function looksLikeCopy(text) {
  const t = text.trim();
  if (t.length < 2) return false;
  if (ALLOWED_LITERALS.has(t)) return false;
  if (!LATIN_LETTER.test(t)) return false;             // numbers / symbols only
  if (/^[A-Za-z0-9_]+$/.test(t) && !/\s/.test(t) && t.length < 18 && /[A-Z]/.test(t.slice(1))) return false; // camelCase id
  if (/^[a-z0-9_]+$/.test(t) && !/\s/.test(t)) return false; // snake/lower id, single token
  if (/^(https?:|\/|\.|#|@|var\(|--|rgb|rgba|px|em|rem|%)/.test(t)) return false; // url/css/path
  if (/[{}<>$]/.test(t)) return false;                 // template/jsx fragments
  if (/=>|\(\)|\=\=|\bconst\b|\breturn\b|\bfunction\b/.test(t)) return false; // code
  if (/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(t) && !/\s/.test(t)) return false; // dotted ref Foo.bar / pillar.score
  return true;
}

function scanHardcoded() {
  const dirs = ["app", "components"].map((d) => path.join(root, d));
  const files = dirs.flatMap((d) => walkFiles(d, new Set([".tsx"])));
  const findings = [];

  const jsxText = />\s*([A-Za-z][^<>{}\n]*?)\s*</g;
  const propPatterns = PROP_KEYS.map((k) => ({
    key: k,
    // prop="literal with letters" — NOT prop={...}
    re: new RegExp(`\\b${k.replace("-", "\\-")}="([^"]*[A-Za-z][^"]*)"`, "g"),
  }));

  for (const file of files) {
    const rel = path.relative(root, file);
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;

      // JSX text nodes
      let m;
      jsxText.lastIndex = 0;
      while ((m = jsxText.exec(line))) {
        const text = m[1].trim().replace(/\s+/g, " ");
        if (looksLikeCopy(text)) {
          findings.push({ file: rel, line: i + 1, kind: "jsx-text", text });
        }
      }

      // human-readable props with string literals
      for (const { key, re } of propPatterns) {
        re.lastIndex = 0;
        while ((m = re.exec(line))) {
          const text = m[1].trim();
          if (looksLikeCopy(text)) {
            findings.push({ file: rel, line: i + 1, kind: `prop:${key}`, text });
          }
        }
      }
    });
  }
  return findings;
}

// ---------- 2. untranslated leftovers (global) ----------
function scanUntranslated() {
  const canonical = flatten(readJson(path.join(messagesDir, "en.json")));
  const result = {};
  for (const locale of supportedLocales.filter((l) => l !== "en")) {
    const localized = flatten(readJson(path.join(messagesDir, `${locale}.json`)));
    const leftovers = [];
    for (const [key, en] of canonical.entries()) {
      if (typeof en !== "string" || en.trim() === "") continue;
      if (!LATIN_LETTER.test(en)) continue;            // pure numbers/units: identical is fine
      const loc = localized.get(key);
      if (loc === en && en.split(/\s+/).length >= 2) {  // multi-word identical = suspicious
        leftovers.push({ key, value: en });
      }
    }
    result[locale] = leftovers;
  }
  return result;
}

// ---------- 3. wrong-script / mixed-language ----------
function scanWrongScript() {
  const result = {};
  for (const locale of supportedLocales) {
    const localized = flatten(readJson(path.join(messagesDir, `${locale}.json`)));
    const bad = [];
    for (const [key, v] of localized.entries()) {
      if (typeof v !== "string" || v.trim() === "") continue;
      const hasArabic = ARABIC.test(v);
      const hasHebrew = HEBREW.test(v);
      const hasLatinWord = /[A-Za-z]{3,}/.test(v);
      if (locale === "ar") {
        // Arabic catalog: should be Arabic. Flag values with NO Arabic but Latin words.
        if (!hasArabic && hasLatinWord) bad.push({ key, value: v, why: "no Arabic script" });
        if (hasHebrew) bad.push({ key, value: v, why: "contains Hebrew script" });
      } else if (locale === "he") {
        if (!hasHebrew && hasLatinWord) bad.push({ key, value: v, why: "no Hebrew script" });
        if (hasArabic) bad.push({ key, value: v, why: "contains Arabic script" });
      } else {
        // Latin catalogs: flag stray Arabic/Hebrew script
        if (hasArabic) bad.push({ key, value: v, why: "contains Arabic script" });
        if (hasHebrew) bad.push({ key, value: v, why: "contains Hebrew script" });
      }
    }
    result[locale] = bad;
  }
  return result;
}

// ---------- report ----------
function section(title) {
  console.log("\n" + "=".repeat(72) + "\n" + title + "\n" + "=".repeat(72));
}

function main() {
  const hard = scanHardcoded();
  const untrans = scanUntranslated();
  const wrong = scanWrongScript();

  section("1. HARDCODED UI STRINGS (app/ + components/)");
  const byFile = new Map();
  for (const f of hard) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }
  console.log(`${hard.length} candidate(s) across ${byFile.size} file(s).`);
  const sortedFiles = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [file, items] of sortedFiles) {
    console.log(`\n  ${file}  (${items.length})`);
    const show = FULL ? items : items.slice(0, 8);
    for (const it of show) console.log(`    L${it.line} [${it.kind}] ${it.text}`);
    if (!FULL && items.length > show.length) console.log(`    ... +${items.length - show.length} more (use --full)`);
  }

  section("2. UNTRANSLATED LEFTOVERS (value identical to English, ALL namespaces)");
  for (const locale of Object.keys(untrans)) {
    const items = untrans[locale];
    console.log(`\n  ${locale}: ${items.length} multi-word value(s) identical to English`);
    const show = FULL ? items : items.slice(0, 15);
    for (const it of show) console.log(`    ${it.key}  =  "${it.value}"`);
    if (!FULL && items.length > show.length) console.log(`    ... +${items.length - show.length} more (use --full)`);
  }

  section("3. WRONG-SCRIPT / MIXED-LANGUAGE VALUES");
  let wrongTotal = 0;
  for (const locale of Object.keys(wrong)) {
    const items = wrong[locale];
    wrongTotal += items.length;
    if (items.length === 0) continue;
    console.log(`\n  ${locale}: ${items.length} value(s)`);
    const show = FULL ? items : items.slice(0, 15);
    for (const it of show) console.log(`    ${it.key}  (${it.why})  =  "${it.value}"`);
    if (!FULL && items.length > show.length) console.log(`    ... +${items.length - show.length} more (use --full)`);
  }
  if (wrongTotal === 0) console.log("\n  none — no stray scripts detected.");

  section("SUMMARY");
  console.log(`Hardcoded UI string candidates : ${hard.length} (in ${byFile.size} files)`);
  for (const locale of Object.keys(untrans)) {
    console.log(`Untranslated-vs-English [${locale}]   : ${untrans[locale].length}`);
  }
  console.log(`Wrong-script / mixed values    : ${wrongTotal}`);
  console.log("\nNote: section 1 & 2 are CANDIDATES needing human review (some are");
  console.log("intentional brand names, units, or genuine loanwords).");
}

main();
