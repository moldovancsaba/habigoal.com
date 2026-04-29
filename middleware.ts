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

  // 4. Identify if it's a root/landing page
  const isLandingPage = pathname === '/' || /^\/(hu|en|ar)$/.test(pathname) || /^\/(hu|en|ar)\/$/.test(pathname);

  // 5. If logged in and on landing page, redirect to dashboard
  if (session && isLandingPage) {
    const locale = pathname.match(/^\/(hu|en|ar)/)?.[1] || 'en';
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  // 6. Redirect to login if no session and not a public route/landing page
  if (!session && !isLandingPage && !isPublicRoute) {
    // If it's an API request (not auth), return 401
    if (pathname.startsWith('/api') && !pathname.startsWith('/api/auth') && !pathname.startsWith('/api/oauth')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Otherwise redirect to landing page
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 7. Proceed with intl middleware and inject auth headers
  const requestHeaders = new Headers(request.headers);
  if (session) {
    requestHeaders.set('x-kidex-role', session.role || 'user');
    requestHeaders.set('x-kidex-user-id', session.userId || '');
  }

  // Create a new request with the updated headers
  const modifiedRequest = new NextRequest(request, {
    headers: requestHeaders,
  });

  return intlMiddleware(modifiedRequest);
}

export const config = {
  // Match all paths except for api, _next, and static files.
  // The 'always' locale prefix strategy will handle redirects to /hu/, /en/, or /ar/ automatically.
  matcher: [
    '/', 
    '/(hu|en|ar)/:path*',
    '/api/((?!auth|oauth).*)', // Match all API routes EXCEPT auth/oauth
    '/((?!_next|_vercel|.*\\..*).*)'
  ]
};
