import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";
import { decryptEdgeSession } from "@/lib/session-edge";

const intlMiddleware = createMiddleware(routing);

const SUPPORTED_LOCALES = ["hu", "en", "ar", "es", "de", "he"];

async function readSession(request: NextRequest) {
  const enforceAuth = process.env.SURVEY_ENFORCE_AUTH === "true" || process.env.KIDEX_ENFORCE_AUTH === "true";
  if (!enforceAuth) {
    return { enforceAuth, session: null };
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return { enforceAuth, session: null };
  }

  const cookie = request.cookies.get("survey_session")?.value ?? request.cookies.get("kidex_session")?.value;
  const session = cookie ? await decryptEdgeSession(cookie, secret) : null;
  return { enforceAuth, session };
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { enforceAuth, session } = await readSession(request);

  // 1. Skip auth check if not enforced
  if (!enforceAuth) {
    return intlMiddleware(request);
  }

  // 2. Identify public routes
  const isPublicRoute = 
    pathname.startsWith('/api/auth') || 
    pathname.startsWith('/api/oauth') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.svg');

  // 3. Handle API routes
  if (pathname.startsWith('/api')) {
    if (isPublicRoute) return NextResponse.next();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-survey-role", session.role || "user");
    requestHeaders.set("x-survey-user-id", session.userId || "");

    return NextResponse.next({
      request: { headers: requestHeaders }
    });
  }

  // 4. Handle Page routes
  const localePattern = SUPPORTED_LOCALES.join("|");
  const isLegalPage = new RegExp(`\\/(${localePattern})\\/legal\\/`).test(pathname);
  const isLandingPage = pathname === "/" || new RegExp(`^\\/(${localePattern})\\/?$`).test(pathname);

  if (session && isLandingPage) {
    const locale = pathname.match(new RegExp(`^\\/(${localePattern})`))?.[1] || "en";
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  if (!session && !isLandingPage && !isLegalPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!_next|_vercel|.*\\..*).*)'
  ]
};
