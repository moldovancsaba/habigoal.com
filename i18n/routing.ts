import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["en", "hu"],
  defaultLocale: "hu",
  localePrefix: "as-needed"
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
