import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
import { getMessages } from "next-intl/server";
import { MuiRegistry } from "@/components/theme/MuiRegistry";
import { CookieConsentBanner } from "@/components/ui/CookieConsentBanner";
import "../globals.css";

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();
  const direction = locale === "ar" ? "rtl" : "ltr";
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("kidex_theme")?.value;
  const initialMode = themeCookie === "dark" || themeCookie === "light" ? themeCookie : undefined;

  return (
    <html lang={locale} dir={direction}>
      <body dir={direction}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <MuiRegistry initialMode={initialMode}>
            {children}
            <CookieConsentBanner />
          </MuiRegistry>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
