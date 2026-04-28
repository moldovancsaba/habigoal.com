import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match only the root, localized paths, and general catch-all for clean URLs
  matcher: ['/', '/(hu|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};
