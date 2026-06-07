import { describe, expect, it } from "vitest";
import {
  buildFormContractMap,
  compileArtifact,
  compileFormContracts,
  compileWithFallback,
  type FormCompilerResult
} from "./compiler";
import type { FormRegistrySnapshot } from "@/lib/form-registry";

const snapshot: FormRegistrySnapshot = {
  schemaVersion: 1,
  generatedAt: "2026-06-07T00:00:00.000Z",
  migrationHash: "compiler-test",
  artifacts: [
    {
      id: "athlete-profile",
      domain: "profiles",
      route: "/[locale]/dashboard/athletes/[id]",
      fields: ["name", "birthDate", "knownTraits", "trainerEmails"],
      gdsComponentSet: ["layout", "form", "button"],
      locales: ["en", "hu"],
      requiresAuth: ["admin", "trainer"],
      ownerTeam: ["athletes"]
    }
  ]
};

describe("form contract compiler", () => {
  it("compiles form artifacts into stable runtime contracts", () => {
    const contract = compileArtifact(snapshot.artifacts[0]);

    expect(contract).toMatchObject({
      formId: "athlete-profile",
      route: "/[locale]/dashboard/athletes/[id]",
      domain: "profiles",
      apiEndpoint: "/api/children",
      responseSchemaVersion: 1
    });
    expect(contract.fields).toEqual([
      { id: "name", name: "name", type: "text", required: true, options: undefined },
      { id: "birthDate", name: "birthDate", type: "date", required: true, options: undefined },
      { id: "knownTraits", name: "knownTraits", type: "textarea", required: false, options: undefined },
      { id: "trainerEmails", name: "trainerEmails", type: "multiselect", required: true, options: [] }
    ]);
  });

  it("returns success metrics for compatible registry snapshots", () => {
    const result = compileFormContracts(snapshot);

    expect(result.status).toBe("success");
    expect(result.metrics).toEqual({ contractCount: 1, driftErrors: 0, compilerErrorCodes: [] });
  });

  it("fails compatibility gates for duplicate fields and unsupported component families", () => {
    const result = compileFormContracts({
      ...snapshot,
      artifacts: [
        {
          ...snapshot.artifacts[0],
          fields: ["name", "name"],
          gdsComponentSet: ["form", "custom-card"],
          locales: []
        }
      ]
    });

    expect(result.status).toBe("failed");
    expect(result.metrics.driftErrors).toBe(3);
    expect(result.metrics.compilerErrorCodes).toEqual(["DUPLICATE_FIELD", "MISSING_LOCALES", "UNSUPPORTED_COMPONENT"]);
  });

  it("builds an addressable contract map", () => {
    const map = buildFormContractMap(compileFormContracts(snapshot));

    expect(Object.keys(map)).toEqual(["athlete-profile"]);
    expect(map["athlete-profile"].fields.map((field) => field.id)).toEqual(["name", "birthDate", "knownTraits", "trainerEmails"]);
  });

  it("recovers with previous stable contracts when compilation throws", async () => {
    const previousStable: FormCompilerResult = compileFormContracts(snapshot);
    const result = await compileWithFallback(async () => {
      throw new Error("compile failed");
    }, previousStable);

    expect(result.recoveredFromFailure).toBe(true);
    expect(result.status).toBe("failed");
    expect(result.contracts).toHaveLength(1);
  });
});
