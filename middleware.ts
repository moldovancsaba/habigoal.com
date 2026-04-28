import createMiddleware from "next-intl/middleware";
import { locales } from "./i18n/request";

export default createMiddleware({
  locales,
  defaultLocale: "hu"
});

export const config = {
  // Match only internationalized pathnames
  matcher: ["/", "/(hu|en)/:path*"]
};
