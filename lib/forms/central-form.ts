export type CentralFormFieldKind = "text" | "date" | "number" | "select";

export type CentralFormField<TValues> = {
  key: keyof TValues & string;
  kind: CentralFormFieldKind;
  labelKey: string;
  descriptionKey?: string;
  min?: number;
  max?: number;
  options?: Array<{ value: string; labelKey: string }>;
};

export const checkInSetupFields = [
  {
    key: "date",
    kind: "date",
    labelKey: "date"
  }
] satisfies CentralFormField<{ date: string }>[];

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
