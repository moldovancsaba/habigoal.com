import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { Noto_Sans, Noto_Sans_Arabic, Noto_Sans_Hebrew } from "next/font/google";
import { ThemeRegistry } from "@/components/theme/ThemeRegistry";
import { CookieConsentBanner } from "@/components/layout/CookieConsentBanner";
import { getSemanticTone } from "@/theme/semantic-theme";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "../globals.css";

const mobileThemeColor = getSemanticTone("light", "knowmore").color;

export const metadata: Metadata = {
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
  // Pinch-zoom must stay available (WCAG 1.4.4 / #412). We rely on ≥16px inputs
  // on coarse pointers to avoid iOS focus-zoom instead of locking scale, so we
  // deliberately do NOT set maximum-scale/user-scalable.
  viewportFit: "cover",
  themeColor: mobileThemeColor,
  colorScheme: "light dark",
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

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = (await import(`../../messages/${locale}.json`)).default;
  const direction = locale === "ar" || locale === "he" ? "rtl" : "ltr";
  const cookieStore = await cookies();
  const themeCookie =
    cookieStore.get("habigoal_theme")?.value ??
    cookieStore.get("survey_theme")?.value ??
    cookieStore.get("kidex_theme")?.value;
  const initialMode = themeCookie === "dark" || themeCookie === "light" ? themeCookie : undefined;

  return (
    <html lang={locale} dir={direction}>
      <body dir={direction} className={`${notoSans.variable} ${notoSansArabic.variable} ${notoSansHebrew.variable}`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeRegistry initialMode={initialMode}>
            {children}
            <CookieConsentBanner />
          </ThemeRegistry>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
