import { describe, expect, it } from "vitest";
import {
  parseCookieConsent,
  serializeCookieConsent,
  hasCategory,
  ACCEPT_ALL,
  ESSENTIAL_ONLY,
} from "@/lib/cookie-consent";

describe("cookie consent categories (#423)", () => {
  it("returns null when no choice has been made", () => {
    expect(parseCookieConsent(null)).toBeNull();
    expect(parseCookieConsent(undefined)).toBeNull();
    expect(parseCookieConsent("")).toBeNull();
  });

  it("honors the legacy binary 'accepted' value as all categories", () => {
    expect(parseCookieConsent("accepted")).toEqual(ACCEPT_ALL);
  });

  it("parses a category list; necessary is always on", () => {
    expect(parseCookieConsent("necessary")).toEqual(ESSENTIAL_ONLY);
    expect(parseCookieConsent("necessary,functional")).toEqual({ necessary: true, functional: true, analytics: false });
    expect(parseCookieConsent("necessary,functional,analytics")).toEqual(ACCEPT_ALL);
  });

  it("round-trips serialize → parse", () => {
    expect(parseCookieConsent(serializeCookieConsent(ACCEPT_ALL))).toEqual(ACCEPT_ALL);
    expect(parseCookieConsent(serializeCookieConsent(ESSENTIAL_ONLY))).toEqual(ESSENTIAL_ONLY);
    expect(serializeCookieConsent(ESSENTIAL_ONLY)).toBe("necessary");
  });

  it("hasCategory reflects the stored choice (default deny before choice)", () => {
    expect(hasCategory(null, "functional")).toBe(false);
    expect(hasCategory("necessary", "functional")).toBe(false);
    expect(hasCategory("necessary,functional", "functional")).toBe(true);
    expect(hasCategory("accepted", "analytics")).toBe(true);
    expect(hasCategory("necessary,functional", "necessary")).toBe(true);
  });
});
