import { routing } from "@/i18n/routing";

// Locale persistence (#422). The user's explicit language choice is stored in the
// NEXT_LOCALE cookie and honored on locale-less entry (the root redirect) so the
// app remembers it across sessions instead of always falling back to the default.

export const LOCALE_COOKIE = "NEXT_LOCALE";
export type AppLocale = (typeof routing.locales)[number];

export function isSupportedLocale(value: string | null | undefined): value is AppLocale {
  return Boolean(value) && (routing.locales as readonly string[]).includes(value as string);
}

/** Pure resolver: the cookie's locale if supported, else the default. */
export function resolvePreferredLocale(cookieValue: string | null | undefined): AppLocale {
  return isSupportedLocale(cookieValue) ? cookieValue : routing.defaultLocale;
}
