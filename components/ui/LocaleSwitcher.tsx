"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(nextLocale: "en" | "hu") {
    // next-intl's useRouter.replace with the locale option 
    // expects a locale-free pathname.
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <div className="locale-switcher">
      <button 
        className={locale === "hu" ? "active" : ""} 
        onClick={() => switchLocale("hu")}
      >
        HU
      </button>
      <button 
        className={locale === "en" ? "active" : ""} 
        onClick={() => switchLocale("en")}
      >
        EN
      </button>
    </div>
  );
}
