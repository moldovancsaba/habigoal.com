"use client";

import { Checkbox, NumberInput, Select, Stack, Text, TextInput, Textarea } from "@mantine/core";
import { useMessages, useTranslations } from "next-intl";
import { resolveFormOptionLabel, resolveFormText } from "@/lib/forms/copy";
import { getFormValue } from "@/lib/forms/state";
import { isFieldVisible } from "@/lib/forms/visibility";
import type { FormDefinition, FormFieldDefinition, FormRenderContext } from "@/types/form-system";

type PrimitiveValue = string | number | boolean | string[] | null | undefined;

type FormRendererProps<TValues> = {
  definition: FormDefinition;
  values: TValues;
  onChange: (path: string, value: PrimitiveValue) => void;
  context: FormRenderContext;
};

function humanizeId(id: string) {
  return id
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
}

function FormField({
  field,
  value,
  onChange,
  resolveText,
  resolveOption
}: {
  field: FormFieldDefinition;
  value: unknown;
  onChange: (value: PrimitiveValue) => void;
  resolveText: (fieldRef: FormFieldDefinition["labelRef"] | undefined, fallback: string) => string;
  resolveOption: (option: NonNullable<FormFieldDefinition["options"]>[number]) => string;
}) {
  const label = resolveText(field.labelRef, humanizeId(field.id));
  const description = field.descriptionRef ? resolveText(field.descriptionRef, "") : undefined;
  const placeholder = field.placeholderRef ? resolveText(field.placeholderRef, "") : undefined;
  const selectionData =
    field.type === "rating" && !field.options?.length
      ? [1, 2, 3, 4, 5].map((score) => ({ value: String(score), label: String(score) }))
      : (field.options ?? []).map((option) => ({
          value: option.value,
          label: resolveOption(option)
        }));

  switch (field.type) {
    case "textarea":
      return (
        <Textarea
          label={label}
          description={description}
          placeholder={placeholder}
          value={typeof value === "string" ? value : ""}
          autosize
          minRows={3}
          maxLength={field.validation?.maxLength}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      );
    case "number":
      return (
        <NumberInput
          label={label}
          description={description}
          placeholder={placeholder}
          value={typeof value === "number" ? value : value === "" ? "" : undefined}
          min={field.validation?.min}
          max={field.validation?.max}
          hideControls
          onChange={(next) => onChange(typeof next === "number" ? next : undefined)}
        />
      );
    case "checkbox":
      return (
        <Checkbox
          label={label}
          description={description}
          checked={Boolean(value)}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
      );
    case "select":
    case "rating":
      return (
        <Select
          label={label}
          description={description}
          placeholder={placeholder}
          data={selectionData}
          value={typeof value === "string" ? value : typeof value === "number" ? String(value) : null}
          onChange={(next) =>
            onChange(field.type === "rating" ? (next ? Number(next) : undefined) : (next ?? ""))
          }
        />
      );
    case "multiselect":
      return (
        <TextInput
          label={label}
          description={description}
          placeholder={placeholder}
          value={Array.isArray(value) ? value.join(", ") : ""}
          onChange={(event) =>
            onChange(
              event.currentTarget.value
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
            )
          }
        />
      );
    case "date":
      return (
        <TextInput
          label={label}
          description={description}
          placeholder={placeholder}
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      );
    case "text":
    default:
      return (
        <TextInput
          label={label}
          description={description}
          placeholder={placeholder}
          value={typeof value === "string" ? value : ""}
          maxLength={field.validation?.maxLength}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      );
  }
}

export function FormRenderer<TValues>({ definition, values, onChange, context }: FormRendererProps<TValues>) {
  const t = useTranslations();
  const messages = useMessages();

  return (
    <Stack gap="lg">
      {definition.sections.map((section) => {
        const visibleFields = section.fields.filter((field) => isFieldVisible(field, values, context));

        if (visibleFields.length === 0) {
          return null;
        }

        const sectionTitle = resolveFormText(t, messages, section.titleRef, humanizeId(section.id));
        const sectionDescription = section.descriptionRef
          ? resolveFormText(t, messages, section.descriptionRef, "")
          : "";

        return (
          <Stack key={section.id} gap="sm">
            <div>
              <Text fw={700}>{sectionTitle}</Text>
              {sectionDescription ? <Text size="sm" c="dimmed">{sectionDescription}</Text> : null}
            </div>

            <Stack gap="md">
              {visibleFields.map((field) => (
                <FormField
                  key={field.id}
                  field={field}
                  value={getFormValue(values, field.path)}
                  onChange={(value) => onChange(field.path, value)}
                  resolveText={(reference, fallback) => (reference ? resolveFormText(t, messages, reference, fallback) : fallback)}
                  resolveOption={(option) => resolveFormOptionLabel(t, messages, option)}
                />
              ))}
            </Stack>
          </Stack>
        );
      })}
    </Stack>
  );
}
