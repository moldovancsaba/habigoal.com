import { describe, expect, it } from "vitest";
import { ClassScoutPrivacyService, InMemoryClassScoutPrivacyRepository } from "./privacy-service";

const now = () => new Date("2026-06-07T10:00:00.000Z");

function createService() {
  const events: unknown[] = [];
  const service = new ClassScoutPrivacyService({
    repository: new InMemoryClassScoutPrivacyRepository(),
    now,
    createId: () => `privacy-${events.length + 1}`,
    audit: (event) => events.push(event)
  });

  return { service, events };
}

describe("ClassScoutPrivacyService", () => {
  it("grants consent and gates recommendations on active consent", async () => {
    const { service } = createService();

    const granted = await service.grantChildProfileConsent({
      householdId: " household-1 ",
      profileId: " profile-1 ",
      actorUserId: " parent-1 ",
      noticeVersion: " 2026-06-07 "
    });
    const allowed = await service.requireRecommendationConsent("household-1", "profile-1");

    expect(granted.ok).toBe(true);
    if (granted.ok) {
      expect(granted.data).toMatchObject({
        householdId: "household-1",
        profileId: "profile-1",
        actorUserId: "parent-1",
        noticeVersion: "2026-06-07",
        status: "active"
      });
    }
    expect(allowed.ok).toBe(true);
  });

  it("withdraws consent and blocks future recommendation use", async () => {
    const { service } = createService();
    const granted = await service.grantChildProfileConsent({
      householdId: "household-1",
      profileId: "profile-1",
      actorUserId: "parent-1",
      noticeVersion: "2026-06-07"
    });
    expect(granted.ok).toBe(true);
    if (!granted.ok) return;

    const withdrawn = await service.withdrawConsent(granted.data.id, "household-1", "parent-1");
    const blocked = await service.requireRecommendationConsent("household-1", "profile-1");

    expect(withdrawn.ok).toBe(true);
    if (withdrawn.ok) {
      expect(withdrawn.data.status).toBe("withdrawn");
      expect(withdrawn.data.withdrawnAt).toBe("2026-06-07T10:00:00.000Z");
    }
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.error.code).toBe("CONSENT_REQUIRED");
      expect(blocked.state).toBe("permission_denied");
    }
  });

  it("denies consent withdrawal outside the parent household scope", async () => {
    const { service } = createService();
    const granted = await service.grantChildProfileConsent({
      householdId: "household-1",
      profileId: "profile-1",
      actorUserId: "parent-1",
      noticeVersion: "2026-06-07"
    });
    expect(granted.ok).toBe(true);
    if (!granted.ok) return;

    const denied = await service.withdrawConsent(granted.data.id, "household-2", "parent-1");

    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.error.code).toBe("CONSENT_SCOPE_DENIED");
      expect(denied.state).toBe("permission_denied");
    }
  });

  it("creates idempotent deletion requests and records recoverable failures", async () => {
    const { service } = createService();
    const requested = await service.requestDeletion({ householdId: "household-1", targetType: "profile", targetId: "profile-1" });
    const duplicate = await service.requestDeletion({ householdId: "household-1", targetType: "profile", targetId: "profile-1" });

    expect(requested.ok).toBe(true);
    expect(duplicate.ok).toBe(true);
    if (!requested.ok || !duplicate.ok) return;
    expect(duplicate.data.id).toBe(requested.data.id);

    const failed = await service.markDeletionFailed(requested.data, "worker_timeout");
    expect(failed.ok).toBe(true);
    if (failed.ok) {
      expect(failed.data.status).toBe("failed");
      expect(failed.data.failureCode).toBe("worker_timeout");
      expect(failed.data.attempts).toBe(1);
    }
  });

  it("returns ready exports and retryable export failures", async () => {
    const { service } = createService();

    const ready = await service.requestExport("household-1", async () => ({
      householdId: "household-1",
      profiles: [],
      exportedAt: "2026-06-07T10:00:00.000Z"
    }));
    const failed = await service.requestExport("household-2", async () => {
      throw new Error("failed");
    });

    expect(ready.ok).toBe(true);
    if (ready.ok) {
      expect(ready.data.status).toBe("ready");
      expect(ready.data.exportData?.householdId).toBe("household-1");
    }
    expect(failed.ok).toBe(false);
    if (!failed.ok) {
      expect(failed.error.code).toBe("EXPORT_BUILD_FAILED");
      expect(failed.error.retryable).toBe(true);
      expect(failed.state).toBe("retry_available");
    }
  });
});
