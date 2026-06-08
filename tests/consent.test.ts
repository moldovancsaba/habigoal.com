import { describe, it, expect, vi } from "vitest";
import { isConsentValid } from "../lib/consent";
import * as repo from "../repositories/consent.repository";

vi.mock("../repositories/consent.repository");

describe("consent module", () => {
  it("should return true for active consent matching current notice version", async () => {
    vi.mocked(repo.findActiveConsent).mockResolvedValue({
      status: "active",
      privacyNoticeVersion: "2026-06-01", // Match CURRENT_PRIVACY_NOTICE_VERSION
      guardianRequired: false,
    } as any);

    const valid = await isConsentValid("athlete1", "daily_check_in");
    expect(valid).toBe(true);
  });

  it("should return false if guardian required but not consented", async () => {
    vi.mocked(repo.findActiveConsent).mockResolvedValue({
      status: "pending_guardian",
      privacyNoticeVersion: "2026-06-01",
      guardianRequired: true,
      guardianConsentedAt: undefined,
    } as any);

    const valid = await isConsentValid("athlete1", "daily_check_in");
    expect(valid).toBe(false);
  });

  it("should return false if privacy notice version is outdated", async () => {
    vi.mocked(repo.findActiveConsent).mockResolvedValue({
      status: "active",
      privacyNoticeVersion: "2024-01-01",
      guardianRequired: false,
    } as any);

    const valid = await isConsentValid("athlete1", "daily_check_in");
    expect(valid).toBe(false);
  });
});
