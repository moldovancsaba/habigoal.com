"use client";

import { Menu } from "@mantine/core";
import { useMemo } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { createGdsVocabularyPack, GdsIcons, SemanticButton } from "@doneisbetter/gds/client";

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("Common");
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(nextLocale: "en" | "hu" | "ar" | "es" | "de" | "he") {
    const cleanPath = pathname.replace(/^\/(en|hu|ar|es|de|he)(\/|$)/, "/");
    router.replace(cleanPath, { locale: nextLocale });
  }

  const localeLabel =
    locale === "ar" ? "AR" :
    locale === "hu" ? "HU" :
    locale === "es" ? "ES" :
    locale === "de" ? "DE" :
    locale === "he" ? "HE" :
    "EN";
  const localeActionPack = useMemo(
    () =>
      createGdsVocabularyPack("locale", {
        switchLocale: {
          defaultMessage: localeLabel,
          icon: GdsIcons.Language
        }
      }),
    [localeLabel]
  );

  return (
    <Menu shadow="md" width={170} position="bottom-end">
      <Menu.Target>
        <SemanticButton
          action="locale:switchLocale"
          variant="default"
          size="sm"
          color="gray"
          style={{ minWidth: 64, fontWeight: 600 }}
          vocabularyPacks={[localeActionPack]}
        />
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item onClick={() => switchLocale("en")}>{t("languageEnglish")}</Menu.Item>
        <Menu.Item onClick={() => switchLocale("hu")}>{t("languageHungarian")}</Menu.Item>
        <Menu.Item onClick={() => switchLocale("ar")}>{t("languageArabic")}</Menu.Item>
        <Menu.Item onClick={() => switchLocale("es")}>{t("languageSpanish")}</Menu.Item>
        <Menu.Item onClick={() => switchLocale("de")}>{t("languageGerman")}</Menu.Item>
        <Menu.Item onClick={() => switchLocale("he")}>{t("languageHebrew")}</Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
