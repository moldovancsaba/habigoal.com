import fs from "node:fs";
import path from "node:path";
import posts from "../content/news/posts.json" with { type: "json" };

const root = process.cwd();
const strict = process.argv.includes("--strict");
const scanRoots = ["app", "components", "lib"];
const exts = new Set([".ts", ".tsx", ".js", ".jsx"]);
const findings = [];

const ignoredFragments = [
  "use client",
  "use server",
  "Content-Type",
  "application/json",
  "toLocaleString",
  "toISOString",
  "OpenAI",
  "OAuth",
  "SSO",
  "APP_URL",
  "AUTH_SECRET",
  "MONGODB",
  "habigoal.com",
  "/api/",
  "/dashboard",
  "/athletes",
  "/news",
  "mongodb",
  "returnDocument",
  "ObjectId",
  "Intl",
  "Date",
  "Pending first login",
  "user@example.com"
];

const propPattern = /\b(?:label|placeholder|description|title|aria-label|alt|value)\s*=\s*(?:"([^"]{3,})"|'([^']{3,})')/g;
const confirmPattern = /\bconfirm\(\s*(["'`])([\s\S]{3,}?)\1\s*\)/g;

for (const scanRoot of scanRoots) {
  walk(path.join(root, scanRoot));
}

const localeCoverage = auditNewsLocaleCoverage(posts);

printReport(findings, localeCoverage);

if (strict && (findings.length > 0 || localeCoverage.incomplete.length > 0)) {
  process.exit(1);
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(target);
      continue;
    }
    if (!exts.has(path.extname(entry.name))) continue;
    scanFile(target);
  }
}

function scanFile(file) {
  const source = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file);
  for (const match of matchAll(propPattern, source)) {
    maybeAdd(relative, source, match.index, match[1] || match[2], "prop");
  }
  for (const match of matchAll(confirmPattern, source)) {
    maybeAdd(relative, source, match.index, match[2], "confirm");
  }
}

function maybeAdd(relative, source, index, rawValue, kind) {
  const value = rawValue.replace(/\s+/g, " ").trim();
  if (!value) return;
  if (value.startsWith("{") || value.startsWith("<")) return;
  if (!/[A-Za-z]/.test(value)) return;
  if (ignoredFragments.some((fragment) => value.includes(fragment))) return;
  if (/^[A-Z0-9_ -]+$/.test(value)) return;
  if (/^https?:\/\//.test(value)) return;
  if (/^var\(--/.test(value)) return;
  if (/^[A-Za-z0-9_.:/?#=&-]+$/.test(value) && !value.includes(" ")) return;
  const line = source.slice(0, index).split("\n").length;
  findings.push({ file: relative, line, kind, value });
}

function matchAll(pattern, source) {
  const regex = new RegExp(pattern.source, pattern.flags);
  return Array.from(source.matchAll(regex));
}

function auditNewsLocaleCoverage(newsPosts) {
  const locales = ["en", "hu", "de", "es", "ar", "he"];
  const incomplete = [];

  for (const post of newsPosts) {
    const availableLocales = locales.filter((locale) => {
      if (!post.title?.[locale] || !post.summary?.[locale]) return false;
      return Array.isArray(post.sections) && post.sections.every((section) =>
        Boolean(section.title?.[locale]) &&
        Array.isArray(section.items?.[locale]) &&
        section.items[locale].every((item) => typeof item === "string" && item.trim().length > 0)
      );
    });

    if (availableLocales.length > 0 && availableLocales.length < locales.length) {
      incomplete.push({
        slug: post.slug,
        availableLocales
      });
    }
  }

  return { locales, incomplete };
}

function printReport(textFindings, localeCoverage) {
  console.log("i18n audit report");
  console.log(`- suspicious inline strings: ${textFindings.length}`);
  console.log(`- partially localized news posts: ${localeCoverage.incomplete.length}`);

  for (const finding of textFindings.slice(0, 80)) {
    console.log(`  - ${finding.file}:${finding.line} [${finding.kind}] ${finding.value}`);
  }

  if (textFindings.length > 80) {
    console.log(`  - ... ${textFindings.length - 80} more findings omitted`);
  }

  for (const post of localeCoverage.incomplete) {
    console.log(`  - news:${post.slug} locales=${post.availableLocales.join(",")}`);
  }
}
