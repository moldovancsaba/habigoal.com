"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(nextLocale: "en" | "hu") {
    // We ensure the pathname is clean. 
    // createNavigation's usePathname should already be locale-free,
    // but we add this defensive check to prevent duplication.
    const cleanPath = pathname.replace(/^\/(en|hu)(\/|$)/, "/");
    router.replace(cleanPath, { locale: nextLocale });
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
