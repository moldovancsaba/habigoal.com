import fs from "node:fs";

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function readAppVersion() {
  const source = fs.readFileSync("lib/app-version.ts", "utf8");
  const match = source.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
  return match?.[1] || "";
}

function readMarkdownVersion(path) {
  const source = fs.readFileSync(path, "utf8");
  const match = source.match(/(?:App version|Current app version):\s*`?v?([0-9]+\.[0-9]+\.[0-9]+)`?/i);
  return match?.[1] || "";
}

const expected = readJson("package.json").version;
const checks = [
  { source: "package.json", value: expected },
  { source: "package-lock.json", value: readJson("package-lock.json").version },
  { source: "lib/app-version.ts", value: readAppVersion() },
  { source: "README.md", value: readMarkdownVersion("README.md") },
  { source: "docs/legal.md", value: readMarkdownVersion("docs/legal.md") }
];

const mismatches = checks.filter((check) => check.value !== expected);
for (const check of checks) {
  const status = check.value === expected ? "ok" : "mismatch";
  console.log(`${status}\tapp\t${check.source}\t${check.value || "missing"}`);
}

const openApiSource = fs.readFileSync("lib/openapi-spec.ts", "utf8");
const openApiMatch = openApiSource.match(/version:\s*["']([^"']+)["']/);
if (openApiMatch) console.log(`info\tapi\tlib/openapi-spec.ts\t${openApiMatch[1]}`);

if (mismatches.length > 0) {
  console.error(`Version audit failed: expected ${expected}.`);
  process.exit(1);
}
