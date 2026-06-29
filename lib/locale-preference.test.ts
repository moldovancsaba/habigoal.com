import { describe, expect, it } from "vitest";
import { isSupportedLocale, resolvePreferredLocale, LOCALE_COOKIE } from "@/lib/locale-preference";

describe("locale persistence (#422)", () => {
  it("uses the cookie locale when it is supported", () => {
    for (const loc of ["en", "hu", "ar", "es", "de", "he"]) {
      expect(resolvePreferredLocale(loc)).toBe(loc);
    }
  });

  it("falls back to the default for unsupported / garbage / empty values", () => {
    expect(resolvePreferredLocale("fr")).toBe("hu");
    expect(resolvePreferredLocale("")).toBe("hu");
    expect(resolvePreferredLocale(undefined)).toBe("hu");
    expect(resolvePreferredLocale(null)).toBe("hu");
    expect(resolvePreferredLocale("en-US")).toBe("hu");
  });

  it("isSupportedLocale narrows correctly", () => {
    expect(isSupportedLocale("de")).toBe(true);
    expect(isSupportedLocale("xx")).toBe(false);
    expect(isSupportedLocale(undefined)).toBe(false);
  });

  it("uses the standard cookie name", () => {
    expect(LOCALE_COOKIE).toBe("NEXT_LOCALE");
  });
});
