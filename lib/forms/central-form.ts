export type CentralFormFieldKind = "text" | "date" | "number" | "select" | "searchable-select" | "textarea";

export type CentralFormField<TValues> = {
  key: keyof TValues & string;
  kind: CentralFormFieldKind;
  labelKey: string;
  descriptionKey?: string;
  placeholderKey?: string;
  required?: boolean;
  min?: number;
  max?: number;
  options?: Array<{ value: string; label?: string; labelKey?: string }>;
};

export type CentralFormErrors<TValues> = Partial<Record<keyof TValues & string, string>>;

function hasValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return value !== null && value !== undefined;
}

export function validateCentralForm<TValues extends Record<string, unknown>>({
  fields,
  values,
  translate,
  labelTranslate = translate
}: {
  fields: CentralFormField<TValues>[];
  values: TValues;
  translate: (key: string, params?: Record<string, string>) => string;
  labelTranslate?: (key: string) => string;
}) {
  const errors: CentralFormErrors<TValues> = {};

  for (const field of fields) {
    if (field.required && !hasValue(values[field.key])) {
      errors[field.key] = translate("requiredField", { field: labelTranslate(field.labelKey) });
    }
  }

  return errors;
}

export const checkInSetupFields = [
  {
    key: "childId",
    kind: "searchable-select",
    labelKey: "childName",
    placeholderKey: "selectAthlete",
    required: true,
    options: []
  },
  {
    key: "date",
    kind: "date",
    labelKey: "date",
    required: true
  }
] satisfies CentralFormField<{ childId: string; date: string }>[];

export const trainingLoadFields = [
  {
    key: "sessionType",
    kind: "select",
    labelKey: "sessionType",
    options: [
      { value: "team", labelKey: "sessionTypeTeam" },
      { value: "match", labelKey: "sessionTypeMatch" },
      { value: "gym", labelKey: "sessionTypeGym" },
      { value: "recovery", labelKey: "sessionTypeRecovery" },
      { value: "individual", labelKey: "sessionTypeIndividual" }
    ]
  },
  {
    key: "durationMinutes",
    kind: "number",
    labelKey: "durationMinutes",
    min: 0,
    max: 360
  },
  {
    key: "rpe",
    kind: "number",
    labelKey: "rpe",
    min: 1,
    max: 10
  },
  {
    key: "externalLoad",
    kind: "number",
    labelKey: "externalLoad",
    descriptionKey: "externalLoadDescription",
    min: 0,
    max: 50000
  }
] satisfies CentralFormField<{
  sessionType: string;
  durationMinutes?: number;
  rpe?: number;
  externalLoad?: number;
}>[];

// Athlete profile — single source of truth for field definitions, the status
// enum, and field length caps (#150). Both the admin edit panel and the
// PATCH /api/athletes/:id/assignment route consume these so the schema can't
// drift between client and server.
export const ATHLETE_PROFILE_STATUSES = [
  "active",
  "injured",
  "unavailable",
  "trialist",
  "archived"
] as const;

export type AthleteProfileStatus = (typeof ATHLETE_PROFILE_STATUSES)[number];

export function isAthleteProfileStatus(value: unknown): value is AthleteProfileStatus {
  return typeof value === "string" && (ATHLETE_PROFILE_STATUSES as readonly string[]).includes(value);
}

// Maximum stored length per text field. The server slices to these bounds; the
// contract advertises them so the client can mirror the same limits.
export const ATHLETE_PROFILE_FIELD_LIMITS = {
  position: 80,
  season: 40,
  parentGuardianEmail: 240,
  teamId: 120
} as const;

export type AthleteProfileFormValues = {
  position: string;
  status: AthleteProfileStatus;
  teamId: string;
  season: string;
  parentGuardianEmail: string;
};

export const athleteProfileFields = [
  {
    key: "position",
    kind: "text",
    labelKey: "position",
    max: ATHLETE_PROFILE_FIELD_LIMITS.position
  },
  {
    key: "status",
    kind: "select",
    labelKey: "status",
    required: true,
    options: ATHLETE_PROFILE_STATUSES.map((value) => ({ value, labelKey: `status_${value}` }))
  },
  {
    key: "teamId",
    kind: "select",
    labelKey: "team",
    options: []
  },
  {
    key: "season",
    kind: "text",
    labelKey: "season",
    max: ATHLETE_PROFILE_FIELD_LIMITS.season
  },
  {
    key: "parentGuardianEmail",
    kind: "text",
    labelKey: "parentEmail",
    max: ATHLETE_PROFILE_FIELD_LIMITS.parentGuardianEmail
  }
] satisfies CentralFormField<AthleteProfileFormValues>[];

export const checkInNotesFields = [
  {
    key: "general",
    kind: "textarea",
    labelKey: "shareWithCoach",
    placeholderKey: "shareWithCoachPlaceholder"
  }
] satisfies CentralFormField<{ general: string }>[];
