import { createTheme, type MantineThemeOverride } from "@mantine/core";
import { KIDEX_COLORS } from "@/theme/tokens";
import { KIDEX_FONT_FAMILY_LTR, KIDEX_FONT_FAMILY_RTL, KIDEX_FONT_SIZES, KIDEX_FONT_WEIGHTS } from "@/theme/typography";

type Direction = "ltr" | "rtl";

export function getKidexMantineTheme(mode: "light" | "dark", direction: Direction = "ltr"): MantineThemeOverride {
  return createTheme({
    primaryColor: "kidex",
    defaultRadius: "md",
    fontFamily: direction === "rtl" ? KIDEX_FONT_FAMILY_RTL : KIDEX_FONT_FAMILY_LTR,
    fontSizes: {
      xs: KIDEX_FONT_SIZES.xs,
      sm: KIDEX_FONT_SIZES.sm,
      md: KIDEX_FONT_SIZES.md,
      lg: KIDEX_FONT_SIZES.lg,
      xl: KIDEX_FONT_SIZES.xl
    },
    headings: {
      fontFamily: direction === "rtl" ? KIDEX_FONT_FAMILY_RTL : KIDEX_FONT_FAMILY_LTR,
      sizes: {
        h1: { fontSize: KIDEX_FONT_SIZES.h1, lineHeight: "1.2", fontWeight: String(KIDEX_FONT_WEIGHTS.bold) },
        h2: { fontSize: KIDEX_FONT_SIZES.h2, lineHeight: "1.25", fontWeight: String(KIDEX_FONT_WEIGHTS.bold) },
        h3: { fontSize: KIDEX_FONT_SIZES.h3, lineHeight: "1.3", fontWeight: String(KIDEX_FONT_WEIGHTS.semibold) }
      }
    },
    colors: {
      kidex: [
        "#edf8f7",
        "#d2f0ee",
        "#a6e0dc",
        "#77d0ca",
        "#4ac0b8",
        KIDEX_COLORS.brandTeal,
        "#0f8f89",
        "#0b6e6a",
        "#084f4c",
        "#043232"
      ]
    },
    black: KIDEX_COLORS.brandNavy,
    white: KIDEX_COLORS.white,
    primaryShade: 5
  });
}
