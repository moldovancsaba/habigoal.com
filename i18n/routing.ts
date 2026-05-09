import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["en", "hu", "ar", "es", "de", "he"],
  defaultLocale: "hu",
  // We use 'always' to ensure a unified URL structure where the locale 
  // is always present (e.g., /hu/dashboard, /en/dashboard).
  // This eliminates asymmetric redirects and provides a professional, consistent experience.
  localePrefix: "always"
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
