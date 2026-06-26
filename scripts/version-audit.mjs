import fs from "node:fs";
import { auditVersionSources, formatVersionAuditResult } from "./version-audit-core.mjs";

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

const result = auditVersionSources({
  packageJson: readJson("package.json"),
  packageLockJson: readJson("package-lock.json"),
  appVersionSource: fs.readFileSync("lib/app-version.ts", "utf8"),
  readmeSource: fs.readFileSync("README.md", "utf8"),
  legalDocSource: fs.readFileSync("docs/legal.md", "utf8"),
  footerSource: fs.readFileSync("components/layout/AppFooter.tsx", "utf8"),
  termsPageSource: fs.readFileSync("app/[locale]/legal/gtc/page.tsx", "utf8"),
  privacyPageSource: fs.readFileSync("app/[locale]/legal/privacy/page.tsx", "utf8"),
  openApiSource: fs.readFileSync("lib/openapi-spec.ts", "utf8")
});

for (const check of result.checks) {
  console.log(formatVersionAuditResult(check));
}

if (result.mismatches.length > 0) {
  console.error(`Version audit failed: expected app version ${result.expected}.`);
  process.exit(1);
}
