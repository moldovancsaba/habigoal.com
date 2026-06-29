import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/access", () => ({
  getAuthUser: vi.fn(),
  canAccessAthlete: vi.fn(),
}));
vi.mock("@/lib/permissions", () => ({ hasCapability: vi.fn() }));
vi.mock("@/services/privacy.service", () => ({ eraseAthleteData: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAuditEvent: vi.fn() }));

import { POST } from "./route";
import { getAuthUser, canAccessAthlete } from "@/lib/access";
import { hasCapability } from "@/lib/permissions";
import { eraseAthleteData } from "@/services/privacy.service";
import { logAuditEvent } from "@/lib/audit";

const mGetUser = vi.mocked(getAuthUser);
const mAccess = vi.mocked(canAccessAthlete);
const mCap = vi.mocked(hasCapability);
const mErase = vi.mocked(eraseAthleteData);
const mAudit = vi.mocked(logAuditEvent);

function req(body?: unknown) {
  return new Request("http://localhost/api/athletes/a1/erase", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}
const ctx = { params: Promise.resolve({ id: "a1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  mGetUser.mockResolvedValue({ email: "admin@x.com", roles: ["admin"], primaryRole: "admin" } as never);
  mAccess.mockResolvedValue(true);
  mCap.mockReturnValue(true);
  mErase.mockResolvedValue({ erased: ["habit_records"], counts: { habit_records: 3 }, mediaObjectsDeleted: 0 });
});

describe("POST /api/athletes/[id]/erase (#205)", () => {
  it("403 without the privacy:erase capability", async () => {
    mCap.mockReturnValue(false);
    const res = await POST(req({ confirm: "ERASE" }), ctx);
    expect(res.status).toBe(403);
    expect(mErase).not.toHaveBeenCalled();
  });

  it("403 when the caller cannot access the athlete", async () => {
    mAccess.mockResolvedValue(false);
    const res = await POST(req({ confirm: "ERASE" }), ctx);
    expect(res.status).toBe(403);
    expect(mErase).not.toHaveBeenCalled();
  });

  it("400 without the confirm keyword", async () => {
    const res = await POST(req({}), ctx);
    expect(res.status).toBe(400);
    expect(mErase).not.toHaveBeenCalled();
  });

  it("erases and writes an audit event with the confirm keyword", async () => {
    const res = await POST(req({ confirm: "ERASE" }), ctx);
    expect(res.status).toBe(200);
    expect(mErase).toHaveBeenCalledWith("a1");
    expect(mAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "athlete.erase", resourceId: "a1" }));
  });
});
