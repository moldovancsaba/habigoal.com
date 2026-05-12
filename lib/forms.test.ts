import { describe, expect, it } from "vitest";
import { dailyCheckinFormDefinition } from "./forms/definitions/daily-checkin";
import { getFormDefinition, listFormDefinitions } from "./forms/registry";
import { getFormValue, setFormValue } from "./forms/state";
import { isFieldVisible } from "./forms/visibility";

describe("central form registry", () => {
  it("returns the expected foundation definitions", () => {
    expect(listFormDefinitions().map((definition) => definition.id)).toEqual([
      "daily_checkin",
      "athlete_baseline_profile",
      "user_access",
      "team_setup"
    ]);
    expect(getFormDefinition("daily_checkin")).toBe(dailyCheckinFormDefinition);
  });
});

describe("form state helpers", () => {
  it("reads and writes nested object and array paths", () => {
    const base = {
      roles: ["athlete"],
      child: { name: "Alex" },
      trainingLoad: {}
    };

    const next = setFormValue(base, "roles.0", "trainer");
    const withName = setFormValue(next, "child.name", "Jamie");
    const withLoad = setFormValue(withName, "trainingLoad.durationMinutes", 45);

    expect(getFormValue(withLoad, "roles.0")).toBe("trainer");
    expect(getFormValue(withLoad, "child.name")).toBe("Jamie");
    expect(getFormValue(withLoad, "trainingLoad.durationMinutes")).toBe(45);
    expect(base.roles[0]).toBe("athlete");
  });
});

describe("form visibility", () => {
  it("hides athlete-linked fields until the driving value matches", () => {
    const roleField = getFormDefinition("user_access")?.sections[1]?.fields.find((field) => field.id === "athlete_id");
    expect(roleField).toBeTruthy();

    expect(
      isFieldVisible(roleField!, { roles: ["trainer"] }, { role: "admin" })
    ).toBe(false);

    expect(
      isFieldVisible(roleField!, { roles: ["athlete"] }, { role: "admin" })
    ).toBe(true);
  });
});
