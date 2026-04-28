import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { MuiRegistry } from "@/components/theme/MuiRegistry";
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

  return (
    <html lang={locale} dir={direction}>
      <body dir={direction}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <MuiRegistry>{children}</MuiRegistry>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
