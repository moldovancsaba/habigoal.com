"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";

type ThemeMode = "light" | "dark";
const THEME_COOKIE_NAME = "survey_theme";
const LEGACY_THEME_STORAGE_KEY = "theme";
const LEGACY_SURVEY_THEME_STORAGE_KEY = "kidex_theme";
const CONSENT_COOKIE_NAME = "survey_cookie_consent";
const LEGACY_CONSENT_COOKIE_NAME = "kidex_cookie_consent";

function hasCookieConsent() {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((cookie) =>
    cookie.startsWith(`${CONSENT_COOKIE_NAME}=accepted`) || cookie.startsWith(`${LEGACY_CONSENT_COOKIE_NAME}=accepted`)
  );
}

function writeThemeCookie(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  if (!hasCookieConsent()) return;
  document.cookie = `${THEME_COOKIE_NAME}=${mode}; path=/; max-age=31536000; samesite=lax`;
}

function readInitialMode(initialMode?: ThemeMode): ThemeMode {
  return initialMode ?? "light";
}

function readPreferredMode(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const saved =
    localStorage.getItem(THEME_COOKIE_NAME) ??
    localStorage.getItem(LEGACY_SURVEY_THEME_STORAGE_KEY) ??
    localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribeToPreferredMode(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleChange = () => callback();

  window.addEventListener("storage", handleChange);
  mediaQuery.addEventListener("change", handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    mediaQuery.removeEventListener("change", handleChange);
  };
}

type ThemeModeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

export function ThemeModeProvider({
  children,
  initialMode
}: {
  children: React.ReactNode;
  initialMode?: ThemeMode;
}) {
  const preferredMode = useSyncExternalStore(subscribeToPreferredMode, readPreferredMode, () => readInitialMode(initialMode));
  const [overrideMode, setOverrideMode] = useState<ThemeMode | null>(null);
  const mode = overrideMode ?? preferredMode;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode);
  }, [mode]);

  useEffect(() => {
    writeThemeCookie(mode);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setOverrideMode(next);
    localStorage.setItem(THEME_COOKIE_NAME, next);
    localStorage.setItem(LEGACY_SURVEY_THEME_STORAGE_KEY, next);
    localStorage.setItem(LEGACY_THEME_STORAGE_KEY, next);
    writeThemeCookie(next);
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error("useThemeMode must be used within ThemeModeProvider");
  }
  return ctx;
}
