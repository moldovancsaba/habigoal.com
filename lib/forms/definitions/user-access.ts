import type { FormDefinition } from "../../../types/form-system";

export const userAccessFormDefinition: FormDefinition = {
  id: "user_access",
  version: "1",
  submitScope: "admin",
  roles: ["admin"],
  sections: [
    {
      id: "identity",
      titleRef: { namespace: "FormSystem", key: "forms.userAccess.sections.identity.title" },
      fields: [
        { id: "name", path: "name", type: "text", labelRef: { namespace: "Common", key: "name" }, validation: { maxLength: 240 } },
        { id: "email", path: "email", type: "text", labelRef: { namespace: "Dashboard", key: "email" }, validation: { required: true, maxLength: 240 } }
      ]
    },
    {
      id: "access",
      titleRef: { namespace: "FormSystem", key: "forms.userAccess.sections.access.title" },
      fields: [
        {
          id: "role",
          path: "roles.0",
          type: "select",
          labelRef: { namespace: "Dashboard", key: "entityLabel" },
          options: [
            { value: "athlete", labelRef: { namespace: "Dashboard", key: "entityAthlete" } },
            { value: "trainer", labelRef: { namespace: "Dashboard", key: "entityTrainer" } },
            { value: "admin", labelRef: { namespace: "Dashboard", key: "entityAdmin" } }
          ],
          validation: { required: true }
        },
        {
          id: "athlete_id",
          path: "athleteId",
          type: "select",
          labelRef: { namespace: "Dashboard", key: "linkedAthleteLabel" },
          visibility: { dependsOn: "roles.0", equals: "athlete" }
        }
      ]
    }
  ]
};
