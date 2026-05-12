export type FormRole = "athlete" | "trainer" | "admin";

export type FormTranslationRef = {
  namespace: string;
  key: string;
};

export type FormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "multiselect"
  | "checkbox"
  | "date"
  | "rating";

export type FormFieldOption = {
  value: string;
  label?: string;
  labelRef?: FormTranslationRef;
};

export type FormFieldValidation = {
  required?: boolean;
  min?: number;
  max?: number;
  maxLength?: number;
};

export type FormVisibilityRule = {
  roles?: FormRole[];
  requiresLinkedAthlete?: boolean;
  requiresTeamMembership?: boolean;
  dependsOn?: string;
  equals?: string | number | boolean;
};

export type FormFieldDefinition = {
  id: string;
  path: string;
  type: FormFieldType;
  labelRef: FormTranslationRef;
  label?: string;
  descriptionRef?: FormTranslationRef;
  description?: string;
  placeholderRef?: FormTranslationRef;
  placeholder?: string;
  options?: FormFieldOption[];
  validation?: FormFieldValidation;
  visibility?: FormVisibilityRule;
};

export type FormSectionDefinition = {
  id: string;
  titleRef: FormTranslationRef;
  title?: string;
  descriptionRef?: FormTranslationRef;
  description?: string;
  fields: FormFieldDefinition[];
};

export type FormDefinition = {
  id: string;
  version: string;
  submitScope: "athlete" | "trainer" | "admin" | "shared";
  roles: FormRole[];
  sections: FormSectionDefinition[];
};

export type FormRenderContext = {
  role: FormRole;
  hasLinkedAthlete?: boolean;
  hasTeamMembership?: boolean;
};
