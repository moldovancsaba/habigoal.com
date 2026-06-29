import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolvePreferredLocale } from "@/lib/locale-preference";

// Locale-less entry honors the persisted language choice (#422): redirect to the
// locale stored in NEXT_LOCALE when present and supported, otherwise the default.
export default async function RootPage() {
  const store = await cookies();
  const locale = resolvePreferredLocale(store.get(LOCALE_COOKIE)?.value);
  redirect(`/${locale}`);
}
