export function readAppVersion(source) {
  const match = source.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
  return match?.[1] || "";
}

export function readMarkdownVersion(source) {
  const match = source.match(/(?:App version|Current app version):\s*`?v?([0-9]+\.[0-9]+\.[0-9]+)`?/i);
  return match?.[1] || "";
}

export function readOpenApiVersion(source) {
  const match = source.match(/version:\s*["']([^"']+)["']/);
  return match?.[1] || "";
}

export function readAppVersionBinding(source, renderedPattern) {
  if (!/APP_VERSION/.test(source)) return "";
  return renderedPattern.test(source) ? "APP_VERSION binding" : "";
}

export function auditVersionSources(sources) {
  const expected = sources.packageJson.version;
  const checks = [
    { domain: "app", source: "package.json", value: expected, expected, status: "ok" },
    { domain: "app", source: "package-lock.json", value: sources.packageLockJson.version || "", expected, status: sources.packageLockJson.version === expected ? "ok" : "mismatch" },
    { domain: "app", source: "lib/app-version.ts", value: readAppVersion(sources.appVersionSource), expected, status: readAppVersion(sources.appVersionSource) === expected ? "ok" : "mismatch" },
    { domain: "app", source: "README.md", value: readMarkdownVersion(sources.readmeSource), expected, status: readMarkdownVersion(sources.readmeSource) === expected ? "ok" : "mismatch" },
    { domain: "app", source: "docs/legal.md", value: readMarkdownVersion(sources.legalDocSource), expected, status: readMarkdownVersion(sources.legalDocSource) === expected ? "ok" : "mismatch" },
    {
      domain: "app",
      source: "components/layout/AppFooter.tsx",
      value: readAppVersionBinding(sources.footerSource, /v\{APP_VERSION\}/),
      expected: "APP_VERSION binding",
      status: readAppVersionBinding(sources.footerSource, /v\{APP_VERSION\}/) === "APP_VERSION binding" ? "ok" : "mismatch"
    },
    {
      domain: "app",
      source: "app/[locale]/legal/gtc/page.tsx",
      value: readAppVersionBinding(sources.termsPageSource, /Habigoal\s+v\{APP_VERSION\}/),
      expected: "APP_VERSION binding",
      status: readAppVersionBinding(sources.termsPageSource, /Habigoal\s+v\{APP_VERSION\}/) === "APP_VERSION binding" ? "ok" : "mismatch"
    },
    {
      domain: "app",
      source: "app/[locale]/legal/privacy/page.tsx",
      value: readAppVersionBinding(sources.privacyPageSource, /Habigoal\s+v\{APP_VERSION\}/),
      expected: "APP_VERSION binding",
      status: readAppVersionBinding(sources.privacyPageSource, /Habigoal\s+v\{APP_VERSION\}/) === "APP_VERSION binding" ? "ok" : "mismatch"
    }
  ];

  const openApiVersion = readOpenApiVersion(sources.openApiSource);
  if (openApiVersion) {
    checks.push({
      domain: "api",
      source: "lib/openapi-spec.ts",
      value: openApiVersion,
      status: "informational"
    });
  }

  return {
    expected,
    checks,
    mismatches: checks.filter((check) => check.status === "mismatch")
  };
}

export function formatVersionAuditResult(check) {
  const status = check.status === "informational" ? "info" : check.status;
  const expected = check.expected && check.status === "mismatch" ? `\texpected ${check.expected}` : "";
  return `${status}\t${check.domain}\t${check.source}\t${check.value || "missing"}${expected}`;
}
