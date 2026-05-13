import { trackerQuestions } from "../../athlete-iq-survey";
import type { FormDefinition, FormFieldDefinition } from "../../../types/form-system";

const questionFields: FormFieldDefinition[] = trackerQuestions.map((question) => ({
  id: question.key,
  path: `scores.${question.key}.score`,
  type: "rating",
  labelRef: { namespace: "Schema", key: question.title },
  descriptionRef: { namespace: "Schema", key: question.prompt },
  validation: { min: 1, max: 5 }
}));

export const dailyCheckinFormDefinition: FormDefinition = {
  id: "daily_checkin",
  version: "1",
  submitScope: "shared",
  roles: ["athlete", "trainer", "admin"],
  sections: [
    {
      id: "athlete_identity",
      titleRef: { namespace: "FormSystem", key: "forms.dailyCheckin.sections.athleteIdentity.title" },
      title: "Athlete setup",
      description: "Keep this daily check-in under 2 minutes.",
      fields: [
        {
          id: "childId",
          path: "childId",
          type: "select",
          labelRef: { namespace: "FormSystem", key: "forms.dailyCheckin.fields.childId.label" },
          placeholderRef: { namespace: "FormSystem", key: "forms.dailyCheckin.fields.childId.placeholder" },
          label: "Athlete",
          placeholder: "Select athlete",
          validation: { required: true }
        },
        {
          id: "child_name",
          path: "child.name",
          type: "text",
          labelRef: { namespace: "Common", key: "name" },
          validation: { required: true, maxLength: 240 },
          visibility: { roles: ["trainer", "admin"] }
        },
        {
          id: "child_birth_date",
          path: "child.birthDate",
          type: "date",
          labelRef: { namespace: "FormSystem", key: "forms.dailyCheckin.fields.birthDate.label" },
          validation: { required: true },
          visibility: { roles: ["trainer", "admin"] }
        },
        {
          id: "known_traits",
          path: "child.knownTraits",
          type: "textarea",
          labelRef: { namespace: "FormSystem", key: "forms.dailyCheckin.fields.knownTraits.label" },
          validation: { maxLength: 5000 },
          visibility: { roles: ["trainer", "admin"] }
        },
        {
          id: "parent_signals",
          path: "child.parentSignals",
          type: "textarea",
          labelRef: { namespace: "FormSystem", key: "forms.dailyCheckin.fields.parentSignals.label" },
          validation: { maxLength: 5000 },
          visibility: { roles: ["trainer", "admin"] }
        }
      ]
    },
    {
      id: "session_context",
      titleRef: { namespace: "FormSystem", key: "forms.dailyCheckin.sections.sessionContext.title" },
      fields: [
        {
          id: "session_date",
          path: "session.date",
          type: "date",
          labelRef: { namespace: "Common", key: "date" },
          label: "Date",
          validation: { required: true }
        },
        {
          id: "session_location",
          path: "session.location",
          type: "text",
          labelRef: { namespace: "Report", key: "locationLabel" }
        },
        {
          id: "session_context",
          path: "session.context",
          type: "select",
          labelRef: { namespace: "Report", key: "contextLabel" },
          options: [
            { value: "structured", labelRef: { namespace: "Report", key: "contextValueStructured" } },
            { value: "spontaneous", labelRef: { namespace: "Report", key: "contextValueSpontaneous" } },
            { value: "mixed", labelRef: { namespace: "Report", key: "contextValueMixed" } },
            { value: "event", labelRef: { namespace: "Report", key: "contextValueEvent" } }
          ],
          validation: { required: true }
        },
        {
          id: "session_conductor",
          path: "session.conductor",
          type: "text",
          labelRef: { namespace: "FormSystem", key: "forms.dailyCheckin.fields.conductor.label" },
          visibility: { roles: ["trainer", "admin"] }
        },
        {
          id: "session_observers",
          path: "session.observers",
          type: "text",
          labelRef: { namespace: "FormSystem", key: "forms.dailyCheckin.fields.observers.label" },
          visibility: { roles: ["trainer", "admin"] }
        },
        {
          id: "session_group_size",
          path: "session.groupSize",
          type: "text",
          labelRef: { namespace: "Report", key: "groupSizeLabel" },
          visibility: { roles: ["trainer", "admin"] }
        },
        {
          id: "consent_photo",
          path: "session.consentPhoto",
          type: "checkbox",
          labelRef: { namespace: "FormSystem", key: "forms.dailyCheckin.fields.consentPhoto.label" },
          visibility: { roles: ["trainer", "admin"] }
        },
        {
          id: "consent_report",
          path: "session.consentReport",
          type: "checkbox",
          labelRef: { namespace: "FormSystem", key: "forms.dailyCheckin.fields.consentReport.label" }
        }
      ]
    },
    {
      id: "training_load",
      titleRef: { namespace: "FormSystem", key: "forms.dailyCheckin.sections.trainingLoad.title" },
      title: "Training load",
      description: "Capture session demand so readiness can be interpreted against actual work.",
      fields: [
        {
          id: "session_type",
          path: "trainingLoad.sessionType",
          type: "select",
          labelRef: { namespace: "FormSystem", key: "forms.dailyCheckin.fields.sessionType.label" },
          label: "Session type",
          options: [
            { value: "team", label: "Team training" },
            { value: "match", label: "Match" },
            { value: "gym", label: "Gym" },
            { value: "recovery", label: "Recovery" },
            { value: "individual", label: "Individual extras" }
          ]
        },
        {
          id: "duration_minutes",
          path: "trainingLoad.durationMinutes",
          type: "number",
          labelRef: { namespace: "FormSystem", key: "forms.dailyCheckin.fields.durationMinutes.label" },
          label: "Duration (min)",
          validation: { min: 0, max: 360 }
        },
        {
          id: "rpe",
          path: "trainingLoad.rpe",
          type: "number",
          labelRef: { namespace: "FormSystem", key: "forms.dailyCheckin.fields.rpe.label" },
          label: "RPE (1-10)",
          validation: { min: 1, max: 10 }
        },
        {
          id: "external_load",
          path: "trainingLoad.externalLoad",
          type: "number",
          labelRef: { namespace: "FormSystem", key: "forms.dailyCheckin.fields.externalLoad.label" },
          descriptionRef: { namespace: "FormSystem", key: "forms.dailyCheckin.fields.externalLoad.description" },
          label: "External load",
          description: "Optional meters / arbitrary units",
          validation: { min: 0, max: 50000 }
        }
      ]
    },
    {
      id: "readiness_scores",
      titleRef: { namespace: "FormSystem", key: "forms.dailyCheckin.sections.readinessScores.title" },
      fields: questionFields
    },
    {
      id: "support_notes",
      titleRef: { namespace: "FormSystem", key: "forms.dailyCheckin.sections.supportNotes.title" },
      title: "Coach notes",
      description: "Optional context the coach should know before training.",
      fields: [
        {
          id: "notes_general",
          path: "notes.general",
          type: "textarea",
          labelRef: { namespace: "FormSystem", key: "forms.dailyCheckin.fields.generalNote.label" },
          label: "Anything to share with the coach today?",
          placeholder: "Examples: poor sleep after travel, school exam day, knee soreness, low confidence, hard focus.",
          validation: { maxLength: 5000 }
        },
        {
          id: "notes_movement",
          path: "notes.movement",
          type: "textarea",
          labelRef: { namespace: "FormSystem", key: "forms.dailyCheckin.fields.movementNote.label" },
          label: "Physical notes",
          validation: { maxLength: 5000 }
        },
        {
          id: "notes_social",
          path: "notes.social",
          type: "textarea",
          labelRef: { namespace: "FormSystem", key: "forms.dailyCheckin.fields.socialNote.label" },
          label: "Mental balance notes",
          validation: { maxLength: 5000 }
        },
        {
          id: "notes_mental",
          path: "notes.mental",
          type: "textarea",
          labelRef: { namespace: "FormSystem", key: "forms.dailyCheckin.fields.mentalNote.label" },
          label: "Sport brain notes",
          validation: { maxLength: 5000 }
        },
        {
          id: "notes_adaptations",
          path: "notes.adaptations",
          type: "textarea",
          labelRef: { namespace: "FormSystem", key: "forms.dailyCheckin.fields.adaptations.label" },
          label: "Adaptations",
          validation: { maxLength: 5000 }
        },
        {
          id: "notes_referral",
          path: "notes.referral",
          type: "textarea",
          labelRef: { namespace: "FormSystem", key: "forms.dailyCheckin.fields.referral.label" },
          label: "Referral",
          validation: { maxLength: 5000 }
        }
      ]
    }
  ]
};
