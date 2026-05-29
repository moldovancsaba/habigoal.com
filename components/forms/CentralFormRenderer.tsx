"use client";

import { NumberInput, Select, TextInput } from "@mantine/core";
import { FormField } from "@doneisbetter/gds/client";
import type { CentralFormField } from "@/lib/forms/central-form";

export function CentralFormRenderer<TValues extends Record<string, unknown>>({
  fields,
  namespaceTranslate,
  commonTranslate,
  values,
  onChange
}: {
  fields: CentralFormField<TValues>[];
  namespaceTranslate: (key: string) => string;
  commonTranslate?: (key: string) => string;
  values: TValues;
  onChange: <K extends keyof TValues & string>(key: K, value: TValues[K]) => void;
}) {
  return fields.map((field) => {
    const label = field.labelKey === "date" && commonTranslate ? commonTranslate("date") : namespaceTranslate(field.labelKey);
    const description = field.descriptionKey ? namespaceTranslate(field.descriptionKey) : undefined;
    const value = values[field.key];

    if (field.kind === "select") {
      return (
        <FormField key={field.key} label={label} description={description}>
          <Select
            aria-label={label}
            value={typeof value === "string" ? value : ""}
            data={(field.options ?? []).map((option) => ({ value: option.value, label: namespaceTranslate(option.labelKey) }))}
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
            onChange={(nextValue) => onChange(field.key, (typeof nextValue === "number" ? nextValue : undefined) as TValues[typeof field.key])}
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
          onChange={(event) => onChange(field.key, event.currentTarget.value as TValues[typeof field.key])}
        />
      </FormField>
    );
  });
}
