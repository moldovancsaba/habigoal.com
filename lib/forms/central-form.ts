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

export const checkInNotesFields = [
  {
    key: "general",
    kind: "textarea",
    labelKey: "shareWithCoach",
    placeholderKey: "shareWithCoachPlaceholder"
  }
] satisfies CentralFormField<{ general: string }>[];
