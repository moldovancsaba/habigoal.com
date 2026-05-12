import type { FormDefinition } from "../../../types/form-system";

export const teamSetupFormDefinition: FormDefinition = {
  id: "team_setup",
  version: "1",
  submitScope: "admin",
  roles: ["admin"],
  sections: [
    {
      id: "team_identity",
      titleRef: { namespace: "FormSystem", key: "forms.teamSetup.sections.identity.title" },
      fields: [
        {
          id: "name",
          path: "name",
          type: "text",
          labelRef: { namespace: "Dashboard", key: "teamNameLabel" },
          placeholderRef: { namespace: "Dashboard", key: "teamNamePlaceholder" },
          validation: { required: true, maxLength: 240 }
        }
      ]
    },
    {
      id: "team_membership",
      titleRef: { namespace: "FormSystem", key: "forms.teamSetup.sections.membership.title" },
      fields: [
        {
          id: "trainer_emails",
          path: "trainerEmails",
          type: "multiselect",
          labelRef: { namespace: "Dashboard", key: "addTrainerLabel" }
        },
        {
          id: "athlete_ids",
          path: "athleteIds",
          type: "multiselect",
          labelRef: { namespace: "Dashboard", key: "addAthleteLabel" }
        }
      ]
    }
  ]
};
