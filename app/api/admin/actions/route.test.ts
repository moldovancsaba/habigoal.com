import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/api")>();
  return { ...actual, requireRole: vi.fn() };
});
vi.mock("@/lib/access", () => ({ getAuthUser: vi.fn() }));
vi.mock("@/repositories/user.repository", () => ({ findUserByEmail: vi.fn(), setUserRoles: vi.fn() }));
vi.mock("@/repositories/audit-event.repository", () => ({ insertAuditEvent: vi.fn() }));

import { POST } from "./route";
import { requireRole } from "@/lib/api";
import { getAuthUser } from "@/lib/access";
import { findUserByEmail, setUserRoles } from "@/repositories/user.repository";
import { insertAuditEvent } from "@/repositories/audit-event.repository";

const mRequireRole = vi.mocked(requireRole);
const mGetUser = vi.mocked(getAuthUser);
const mFind = vi.mocked(findUserByEmail);
const mSetRoles = vi.mocked(setUserRoles);
const mAudit = vi.mocked(insertAuditEvent);

function req(body?: unknown) {
  return new Request("http://localhost/api/admin/actions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const grant = { userEmail: "coach@example.com", action: "grant_role", scope: "trainer", reason: "promotion" };

beforeEach(() => {
  vi.clearAllMocks();
  mRequireRole.mockResolvedValue(null);
  mGetUser.mockResolvedValue({ email: "admin@x.com", roles: ["admin"], primaryRole: "admin" } as never);
  mFind.mockResolvedValue({ email: "coach@example.com", roles: ["athlete"] } as never);
  mAudit.mockResolvedValue(undefined);
  mSetRoles.mockResolvedValue(undefined);
});

describe("POST /api/admin/actions (GH-152)", () => {
  it("rejects non-admins via requireRole", async () => {
    mRequireRole.mockResolvedValue(new Response("no", { status: 403 }) as never);
    const res = await POST(req(grant));
    expect(res.status).toBe(403);
    expect(mSetRoles).not.toHaveBeenCalled();
    expect(mAudit).not.toHaveBeenCalled();
  });

  it("400s on an invalid payload", async () => {
    const res = await POST(req({ ...grant, scope: "admin" }));
    expect(res.status).toBe(400);
    expect(mSetRoles).not.toHaveBeenCalled();
  });

  it("404s when the target user does not exist", async () => {
    mFind.mockResolvedValue(null);
    const res = await POST(req(grant));
    expect(res.status).toBe(404);
    expect(mSetRoles).not.toHaveBeenCalled();
  });

  it("aborts the mutation when the audit write fails", async () => {
    mAudit.mockRejectedValue(new Error("db down"));
    const res = await POST(req(grant));
    expect(res.status).toBe(502);
    expect(mSetRoles).not.toHaveBeenCalled();
  });

  it("audits then applies the role grant", async () => {
    const res = await POST(req(grant));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.roles.sort()).toEqual(["athlete", "trainer"]);
    expect(mAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "admin.governance", resourceId: "coach@example.com" })
    );
    expect(mSetRoles).toHaveBeenCalledWith("coach@example.com", expect.arrayContaining(["athlete", "trainer"]));
  });
});
