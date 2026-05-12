import type { AbstractIntlMessages } from "next-intl";
import type { OnboardingModuleDefinition, OnboardingStep } from "@/types/onboarding";

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

function getMessage(
  t: TranslatorLike,
  messages: AbstractIntlMessages | undefined,
  key: string,
  fallback: string
) {
  if (typeof t.has === "function" ? t.has(key) : hasKey(messages, key)) {
    return t(key);
  }

  return fallback;
}

export function resolveOnboardingStep(
  t: TranslatorLike,
  messages: AbstractIntlMessages | undefined,
  module: OnboardingModuleDefinition,
  step: OnboardingStep,
  field: "title" | "body",
  fallback: string
) {
  return getMessage(
    t,
    messages,
    `modules.${module.id}.steps.${step.id}.${field}`,
    field === "title" ? (step.title ?? fallback) : (step.body ?? fallback)
  );
}
