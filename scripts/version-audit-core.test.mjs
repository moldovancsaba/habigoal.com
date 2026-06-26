import { describe, expect, it } from "vitest";
import { auditVersionSources, formatVersionAuditResult, readMarkdownVersion } from "./version-audit-core.mjs";

const matchingSources = {
  packageJson: { version: "0.5.1" },
  packageLockJson: { version: "0.5.1" },
  appVersionSource: 'export const APP_VERSION = "0.5.1";',
  readmeSource: "- App version: `0.5.1`\nHistorical spec version: `9.9.9`",
  legalDocSource: "Current app version: `0.5.1`",
  footerSource: 'import { APP_VERSION } from "@/lib/app-version";\n<Text>{settings.company.name} · v{APP_VERSION}</Text>',
  termsPageSource: 'import { APP_VERSION } from "@/lib/app-version";\n<strong>App:</strong> Habigoal v{APP_VERSION}',
  privacyPageSource: 'import { APP_VERSION } from "@/lib/app-version";\n<strong>App:</strong> Habigoal v{APP_VERSION}',
  openApiSource: 'version: "2.0.0"'
};

describe("version audit core", () => {
  it("passes when app version sources and UI bindings align", () => {
    const result = auditVersionSources(matchingSources);

    expect(result.expected).toBe("0.5.1");
    expect(result.mismatches).toEqual([]);
    expect(result.checks.filter((check) => check.status === "ok")).toHaveLength(8);
    expect(result.checks.find((check) => check.domain === "api")?.status).toBe("informational");
  });

  it("fails with named mismatch sources", () => {
    const result = auditVersionSources({
      ...matchingSources,
      readmeSource: "- App version: `0.5.0`"
    });

    expect(result.mismatches).toEqual([
      expect.objectContaining({ source: "README.md", value: "0.5.0", expected: "0.5.1" })
    ]);
    expect(formatVersionAuditResult(result.mismatches[0])).toContain("expected 0.5.1");
  });

  it("fails when rendered footer/legal pages stop binding APP_VERSION", () => {
    const result = auditVersionSources({
      ...matchingSources,
      footerSource: 'const text = "v0.5.1";'
    });

    expect(result.mismatches).toEqual([
      expect.objectContaining({ source: "components/layout/AppFooter.tsx", value: "" })
    ]);
  });

  it("does not treat historical markdown spec versions as app versions", () => {
    expect(readMarkdownVersion("Historical API version: `2.0.0`\nCurrent app version: `0.5.1`")).toBe("0.5.1");
  });
});
