"use client";

import { FormField, NumberInput, Select, Textarea, TextInput } from "@doneisbetter/gds/client";
import type { CentralFormField } from "@/lib/forms/central-form";

export function CentralFormRenderer<TValues extends Record<string, unknown>>({
  fields,
  namespaceTranslate,
  commonTranslate,
  values,
  errors,
  onChange
}: {
  fields: CentralFormField<TValues>[];
  namespaceTranslate: (key: string) => string;
  commonTranslate?: (key: string) => string;
  values: TValues;
  errors?: Partial<Record<keyof TValues & string, string>>;
  onChange: <K extends keyof TValues & string>(key: K, value: TValues[K]) => void;
}) {
  return fields.map((field) => {
    const label = field.labelKey === "date" && commonTranslate ? commonTranslate("date") : namespaceTranslate(field.labelKey);
    const description = field.descriptionKey ? namespaceTranslate(field.descriptionKey) : undefined;
    const placeholder = field.placeholderKey ? namespaceTranslate(field.placeholderKey) : undefined;
    const error = errors?.[field.key];
    const value = values[field.key];

    if (field.kind === "select" || field.kind === "searchable-select") {
      return (
        <FormField key={field.key} label={label} description={description}>
          <Select
            aria-label={label}
            placeholder={placeholder}
            searchable={field.kind === "searchable-select"}
            value={typeof value === "string" ? value : ""}
            data={(field.options ?? []).map((option) => ({
              value: option.value,
              label: option.label ?? (option.labelKey ? namespaceTranslate(option.labelKey) : option.value)
            }))}
            error={error}
            onChange={(nextValue) => onChange(field.key, (nextValue || "") as TValues[typeof field.key])}
          />
        </FormField>
      );
    }

    if (field.kind === "number") {
      return (
        <FormField key={field.key} label={label} description={description}>
          <NumberInput
            aria-label={label}
            value={typeof value === "number" ? value : undefined}
            min={field.min}
            max={field.max}
            error={error}
            onChange={(nextValue) => onChange(field.key, (typeof nextValue === "number" ? nextValue : undefined) as TValues[typeof field.key])}
          />
        </FormField>
      );
    }

    if (field.kind === "textarea") {
      return (
        <FormField key={field.key} label={label} description={description}>
          <Textarea
            aria-label={label}
            value={typeof value === "string" ? value : ""}
            minRows={8}
            placeholder={placeholder}
            error={error}
            onChange={(event) => onChange(field.key, event.currentTarget.value as TValues[typeof field.key])}
          />
        </FormField>
      );
    }

    return (
      <FormField key={field.key} label={label} description={description}>
        <TextInput
          aria-label={label}
          type={field.kind === "date" ? "date" : "text"}
          value={typeof value === "string" ? value : ""}
          placeholder={placeholder}
          error={error}
          onChange={(event) => onChange(field.key, event.currentTarget.value as TValues[typeof field.key])}
        />
      </FormField>
    );
  });
}
