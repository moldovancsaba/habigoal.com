import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match only localized paths, the root, and catch everything that isn't a static asset or API
  matcher: ['/', '/(hu|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};
