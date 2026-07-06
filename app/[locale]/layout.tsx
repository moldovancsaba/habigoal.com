import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Noto_Sans, Noto_Sans_Arabic, Noto_Sans_Hebrew } from "next/font/google";
import { ThemeRegistry } from "@/components/theme/ThemeRegistry";
import { CookieConsentBanner } from "@/components/layout/CookieConsentBanner";
import { ATHLETE_IQ_GDS_THEME_PRESET } from "@/lib/product-surface-branding";
import type { ProductSurfaceKey } from "@/lib/product-ui-contracts";
import { ATHLETE_GOLD_GDS_VIBE_VARIABLES, getSemanticTone } from "@/theme/semantic-theme";
import "@sovereignsquad/gds-theme/styles.css";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "../globals.css";

const mobileThemeColor = getSemanticTone("review").color;
const productSurfaces = new Set<ProductSurfaceKey>(["athlete_iq", "dashboard", "habigoal", "public"]);
const goldAthleteAppVariables: Record<string, string> = {
  "--app-bg": "var(--gds-vibe-gradient)",
  "--blob-1": "color-mix(in srgb, var(--gds-vibe-accent) 12%, transparent)",
  "--blob-2": "color-mix(in srgb, var(--gds-vibe-primary) 10%, transparent)",
  "--blob-3": "color-mix(in srgb, var(--gds-vibe-surface) 18%, transparent)",
  "--border-primary": "var(--gds-vibe-border)",
  "--grid-line": "color-mix(in srgb, var(--gds-vibe-accent) 14%, transparent)",
  "--nav-company-description": "var(--gds-vibe-muted)",
  "--nav-company-label": "var(--gds-vibe-text)",
  "--nav-link-active": "var(--gds-vibe-text)",
  "--nav-link-inactive": "var(--gds-vibe-muted)",
  "--overlay-color": "color-mix(in srgb, var(--gds-vibe-canvas) 88%, transparent)",
  "--sidebar-bg": "var(--gds-vibe-shell)",
  "--surface-base": "var(--gds-vibe-surface)",
  "--surface-elevated": "var(--gds-vibe-shell)",
  "--surface-gradient-bottom": "transparent",
  "--surface-gradient-top": "color-mix(in srgb, var(--gds-vibe-accent) 6%, transparent)",
  "--surface-hover-bottom": "transparent",
  "--surface-hover-top": "color-mix(in srgb, var(--gds-vibe-accent) 10%, transparent)",
  "--surface-icon-border": "var(--gds-vibe-border)",
  "--surface-section-border": "var(--gds-vibe-border)",
  "--surface-shadow-elevated": "0 24px 64px color-mix(in srgb, var(--gds-vibe-surface) 52%, transparent), inset 0 1px 0 color-mix(in srgb, var(--gds-vibe-accent) 6%, transparent)",
  "--text-muted": "color-mix(in srgb, var(--gds-vibe-muted) 68%, transparent)",
  "--text-primary": "var(--gds-vibe-text)",
  "--text-secondary": "var(--gds-vibe-muted)"
};
const goldAthleteRootVariables = { ...ATHLETE_GOLD_GDS_VIBE_VARIABLES, ...goldAthleteAppVariables } as CSSProperties;


export const metadata: Metadata = {
  title: {
    default: "Habigoal",
    template: "%s · Habigoal"
  },
  applicationName: "Habigoal",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Habigoal"
  },
  icons: {
    icon: "/images/habigoal_logo.png",
    apple: "/images/habigoal_logo.png"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom must stay available (WCAG 1.4.4 / GH-412). We rely on ≥16px inputs
  // on coarse pointers to avoid iOS focus-zoom instead of locking scale, so we
  // deliberately do NOT set maximum-scale/user-scalable.
  viewportFit: "cover",
  themeColor: mobileThemeColor,
  colorScheme: "dark",
  interactiveWidget: "resizes-content"
};

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-noto-sans",
  display: "swap"
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-sans-arabic",
  display: "swap"
});

const notoSansHebrew = Noto_Sans_Hebrew({
  subsets: ["hebrew"],
  variable: "--font-noto-sans-hebrew",
  display: "swap"
});

function resolveActiveSurface(value: string | null): ProductSurfaceKey {
  return productSurfaces.has(value as ProductSurfaceKey) ? value as ProductSurfaceKey : "public";
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const requestHeaders = await headers();
  const activeSurface = resolveActiveSurface(requestHeaders.get("x-habigoal-product-surface"));
  setRequestLocale(locale);
  const messages = (await import(`../../messages/${locale}.json`)).default;
  const direction = locale === "ar" || locale === "he" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={direction}
      data-active-product-surface={activeSurface}
      data-gds-theme-preset={ATHLETE_IQ_GDS_THEME_PRESET}
      data-mantine-color-scheme="dark"
      style={goldAthleteRootVariables}
    >
      <body dir={direction} className={`${notoSans.variable} ${notoSansArabic.variable} ${notoSansHebrew.variable}`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeRegistry>
            {children}
            <CookieConsentBanner />
          </ThemeRegistry>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
