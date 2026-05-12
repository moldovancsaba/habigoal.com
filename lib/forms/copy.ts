import type { AbstractIntlMessages } from "next-intl";
import type { FormFieldOption, FormTranslationRef } from "../../types/form-system";

type TranslatorLike = {
  (key: string): string;
  has?: (key: string) => boolean;
};

function hasKey(messages: AbstractIntlMessages | undefined, key: string) {
  const parts = key.split(".");
  let current: unknown = messages;

  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return false;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === "string";
}

function buildScopedKey(reference: FormTranslationRef) {
  return `${reference.namespace}.${reference.key}`;
}

export function resolveFormText(
  t: TranslatorLike,
  messages: AbstractIntlMessages | undefined,
  reference: FormTranslationRef,
  fallback: string
) {
  const key = buildScopedKey(reference);
  if (typeof t.has === "function" ? t.has(key) : hasKey(messages, key)) {
    return t(key);
  }

  return fallback;
}

export function resolveFormOptionLabel(
  t: TranslatorLike,
  messages: AbstractIntlMessages | undefined,
  option: FormFieldOption
) {
  if (option.labelRef) {
    return resolveFormText(t, messages, option.labelRef, option.label ?? option.value);
  }

  return option.label ?? option.value;
}
