"use client";

import { SegmentedControl } from "@mantine/core";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { KIDEX_COLORS } from "@/theme/tokens";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(nextLocale: "en" | "hu" | "ar") {
    const cleanPath = pathname.replace(/^\/(en|hu|ar)(\/|$)/, "/");
    router.replace(cleanPath, { locale: nextLocale });
  }

  return (
    <SegmentedControl
      value={locale}
      onChange={(value) => switchLocale(value as "en" | "hu" | "ar")}
      fullWidth
      radius="md"
      size="sm"
      color="kidex"
      data={[
        { value: "ar", label: "🇸🇦" },
        { value: "hu", label: "🇭🇺" },
        { value: "en", label: "🇬🇧" }
      ]}
      styles={{
        root: {
          backgroundColor: "transparent",
          border: `1px solid ${KIDEX_COLORS.navBorderMuted}`,
          padding: 2
        },
        control: {
          minHeight: 38
        },
        label: {
          color: KIDEX_COLORS.navTextMuted,
          fontSize: 18,
          lineHeight: "20px",
          paddingInline: 8
        },
        indicator: {
          backgroundColor: KIDEX_COLORS.brandTeal,
          borderRadius: 10
        }
      }}
    />
  );
}
