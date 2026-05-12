import type { FormDefinition } from "../../../types/form-system";

export const athleteBaselineFormDefinition: FormDefinition = {
  id: "athlete_baseline_profile",
  version: "1",
  submitScope: "shared",
  roles: ["trainer", "admin"],
  sections: [
    {
      id: "athlete_identity",
      titleRef: { namespace: "FormSystem", key: "forms.athleteBaseline.sections.identity.title" },
      fields: [
        {
          id: "name",
          path: "name",
          type: "text",
          labelRef: { namespace: "Common", key: "name" },
          validation: { required: true, maxLength: 240 }
        },
        {
          id: "birth_date",
          path: "birthDate",
          type: "date",
          labelRef: { namespace: "FormSystem", key: "forms.athleteBaseline.fields.birthDate.label" },
          validation: { required: true }
        },
        {
          id: "known_traits",
          path: "knownTraits",
          type: "textarea",
          labelRef: { namespace: "FormSystem", key: "forms.athleteBaseline.fields.knownTraits.label" }
        },
        {
          id: "parent_signals",
          path: "parentSignals",
          type: "textarea",
          labelRef: { namespace: "FormSystem", key: "forms.athleteBaseline.fields.parentSignals.label" }
        }
      ]
    },
    {
      id: "baseline_profile",
      titleRef: { namespace: "FormSystem", key: "forms.athleteBaseline.sections.baselineProfile.title" },
      fields: [
        { id: "height_cm", path: "baselineProfile.heightCm", type: "number", labelRef: { namespace: "FormSystem", key: "forms.athleteBaseline.fields.heightCm.label" }, validation: { min: 50, max: 260 } },
        { id: "weight_kg", path: "baselineProfile.weightKg", type: "number", labelRef: { namespace: "FormSystem", key: "forms.athleteBaseline.fields.weightKg.label" }, validation: { min: 15, max: 250 } },
        { id: "wingspan_cm", path: "baselineProfile.wingspanCm", type: "number", labelRef: { namespace: "FormSystem", key: "forms.athleteBaseline.fields.wingspanCm.label" }, validation: { min: 50, max: 300 } },
        { id: "resting_heart_rate", path: "baselineProfile.restingHeartRate", type: "number", labelRef: { namespace: "FormSystem", key: "forms.athleteBaseline.fields.restingHeartRate.label" }, validation: { min: 20, max: 220 } },
        { id: "sleep_target_hours", path: "baselineProfile.sleepTargetHours", type: "number", labelRef: { namespace: "FormSystem", key: "forms.athleteBaseline.fields.sleepTargetHours.label" }, validation: { min: 4, max: 14 } },
        { id: "cognitive_score", path: "baselineProfile.cognitiveScore", type: "number", labelRef: { namespace: "FormSystem", key: "forms.athleteBaseline.fields.cognitiveScore.label" }, validation: { min: 40, max: 200 } },
        { id: "confidence_baseline", path: "baselineProfile.confidenceBaseline", type: "number", labelRef: { namespace: "FormSystem", key: "forms.athleteBaseline.fields.confidenceBaseline.label" }, validation: { min: 1, max: 10 } },
        { id: "focus_baseline", path: "baselineProfile.focusBaseline", type: "number", labelRef: { namespace: "FormSystem", key: "forms.athleteBaseline.fields.focusBaseline.label" }, validation: { min: 1, max: 10 } },
        { id: "motivation_baseline", path: "baselineProfile.motivationBaseline", type: "number", labelRef: { namespace: "FormSystem", key: "forms.athleteBaseline.fields.motivationBaseline.label" }, validation: { min: 1, max: 10 } },
        { id: "stress_baseline", path: "baselineProfile.stressBaseline", type: "number", labelRef: { namespace: "FormSystem", key: "forms.athleteBaseline.fields.stressBaseline.label" }, validation: { min: 1, max: 10 } },
        { id: "injury_notes", path: "baselineProfile.injuryNotes", type: "textarea", labelRef: { namespace: "FormSystem", key: "forms.athleteBaseline.fields.injuryNotes.label" } },
        { id: "medical_notes", path: "baselineProfile.medicalNotes", type: "textarea", labelRef: { namespace: "FormSystem", key: "forms.athleteBaseline.fields.medicalNotes.label" } },
        { id: "coach_baseline_notes", path: "baselineProfile.coachBaselineNotes", type: "textarea", labelRef: { namespace: "FormSystem", key: "forms.athleteBaseline.fields.coachBaselineNotes.label" } }
      ]
    },
    {
      id: "consent",
      titleRef: { namespace: "FormSystem", key: "forms.athleteBaseline.sections.consent.title" },
      fields: [
        { id: "consent_photo", path: "consentPhoto", type: "checkbox", labelRef: { namespace: "FormSystem", key: "forms.athleteBaseline.fields.consentPhoto.label" } },
        { id: "consent_report", path: "consentReport", type: "checkbox", labelRef: { namespace: "FormSystem", key: "forms.athleteBaseline.fields.consentReport.label" } }
      ]
    }
  ]
};
