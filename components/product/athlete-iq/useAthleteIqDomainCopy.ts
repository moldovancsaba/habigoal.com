"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";

// Backend domain objects (daily plan tasks, mental-edge routines, session
// blocks, lite-module facts, etc.) carry i18n keys under the `athleteiq.*`
// namespace. The static, high-visibility keys are authored in the `athleteiq`
// catalog; dynamic keys (e.g. per-habit titles, rationale codes) may not exist
// yet, so we fall back to a humanised last segment instead of leaking a raw key.
export function useAthleteIqDomainCopy() {
  const t = useTranslations("athleteiq");

  return useCallback(
    (fullKey: string | null | undefined): string => {
      if (!fullKey) return "";
      const key = fullKey.replace(/^athleteiq\./, "");
      return t.has(key) ? t(key) : humanizeKey(fullKey);
    },
    [t]
  );
}

export function humanizeKey(fullKey: string): string {
  const segment = fullKey.split(".").pop() ?? fullKey;
  return segment
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (character) => character.toUpperCase());
}
