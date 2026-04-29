import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";
import { env } from "@/config/env";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip auth check if not enforced
  if (!env.kidexEnforceAuth) {
    return intlMiddleware(request);
  }

  // 2. Identify public routes (including login/callback)
  const isPublicRoute = 
    pathname.startsWith('/api/auth') || 
    pathname.startsWith('/api/oauth') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.svg');

  if (isPublicRoute) {
    return intlMiddleware(request);
  }

  // 3. Check for session
  const cookie = request.cookies.get("kidex_session")?.value;
  const session = cookie ? await decrypt(cookie) : null;

  // 4. Redirect to login if no session and not a public route
  if (!session) {
    // If it's an API request (not auth), return 401
    if (pathname.startsWith('/api') && !pathname.includes('/api/auth') && !pathname.includes('/api/oauth')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Otherwise redirect to SSO login
    return NextResponse.redirect(new URL('/api/auth/login', request.url));
  }

  // 5. If session exists, proceed with intl middleware
  return intlMiddleware(request);
}

export const config = {
  // Match all paths except for api, _next, and static files.
  // The 'always' locale prefix strategy will handle redirects to /hu/, /en/, or /ar/ automatically.
  matcher: [
    '/', 
    '/(hu|en|ar)/:path*',
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};
