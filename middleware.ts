import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all paths except for api, _next, and static files.
  // The 'always' locale prefix strategy will handle redirects to /hu/, /en/, or /ar/ automatically.
  matcher: [
    '/', 
    '/(hu|en|ar)/:path*',
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};
