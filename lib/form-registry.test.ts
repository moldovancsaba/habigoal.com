import { describe, expect, it } from "vitest";
import {
  canonicalizeFormRegistry,
  getFormRegistrySnapshot,
  summarizeFormRegistry,
  withFormRegistryFallback,
  type FormRegistrySnapshot
} from "./form-registry";

const baseSnapshot: FormRegistrySnapshot = {
  schemaVersion: 1,
  generatedAt: "2026-06-07T00:00:00.000Z",
  migrationHash: "test-hash",
  artifacts: [
    {
      id: " child-form ",
      domain: " athletes ",
      route: "[locale]/dashboard/athletes/new",
      fields: [" name ", "birthDate", "name"],
      gdsComponentSet: ["form", "button", "form"],
      locales: ["hu", "en", "en"],
      requiresAuth: ["trainer", "admin"],
      ownerTeam: ["athletes", "platform"],
      lifecycleState: "migrate",
      blockers: []
    },
    {
      id: "admin-settings",
      domain: "admin-console",
      route: "/[locale]/dashboard/settings",
      fields: ["company"],
      gdsComponentSet: ["form"],
      locales: ["en"],
      requiresAuth: ["admin"],
      ownerTeam: ["platform"],
      lifecycleState: "blocked",
      blockers: ["missing locale keys"]
    }
  ]
};

describe("form registry", () => {
  it("canonicalizes artifacts with stable sorting and normalized list values", () => {
    const canonical = canonicalizeFormRegistry(baseSnapshot);

    expect(canonical.artifacts.map((artifact) => artifact.id)).toEqual(["admin-settings", "child-form"]);
    expect(canonical.artifacts[1]).toMatchObject({
      route: "/[locale]/dashboard/athletes/new",
      fields: ["birthDate", "name"],
      gdsComponentSet: ["button", "form"],
      locales: ["en", "hu"],
      requiresAuth: ["admin", "trainer"]
    });
  });

  it("dedupes duplicate artifact ids by keeping the richer artifact", () => {
    const canonical = canonicalizeFormRegistry({
      ...baseSnapshot,
      artifacts: [
        ...baseSnapshot.artifacts,
        {
          id: "child-form",
          domain: "athletes",
          route: "/duplicate",
          fields: ["name"],
          gdsComponentSet: ["form"],
          locales: ["en"],
          requiresAuth: ["admin"],
          ownerTeam: ["platform"],
          blockers: ["less complete"]
        }
      ]
    });

    expect(canonical.artifacts).toHaveLength(2);
    expect(canonical.artifacts.find((artifact) => artifact.id === "child-form")?.route).toBe("/[locale]/dashboard/athletes/new");
  });

  it("summarizes blockers and duplicate route conflicts", () => {
    const canonical = canonicalizeFormRegistry({
      ...baseSnapshot,
      artifacts: [
        ...baseSnapshot.artifacts,
        {
          id: "settings-copy",
          domain: "admin-console",
          route: "/[locale]/dashboard/settings",
          fields: ["company"],
          gdsComponentSet: ["form"],
          locales: ["en"],
          requiresAuth: ["admin"],
          ownerTeam: ["platform"],
          blockers: []
        }
      ]
    });
    const summary = summarizeFormRegistry(canonical);

    expect(summary.formArtifactCount).toBe(3);
    expect(summary.migrationBlockerCount).toBe(1);
    expect(summary.inconsistentRouteCount).toBe(1);
    expect(summary.domains).toEqual(["admin-console", "athletes"]);
  });

  it("returns blocked status when blockers exist", () => {
    const response = getFormRegistrySnapshot(baseSnapshot);

    expect(response.status).toBe("blocked");
    expect(response.summary.migrationBlockerCount).toBe(1);
  });

  it("falls back to last known-good snapshot after parser failure", async () => {
    const response = await withFormRegistryFallback(async () => {
      throw new Error("scan failed");
    }, baseSnapshot);

    expect(response.recoveredFromFailure).toBe(true);
    expect(response.status).toBe("blocked");
    expect(response.snapshot.artifacts).toHaveLength(2);
  });
});
