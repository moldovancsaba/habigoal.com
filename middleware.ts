import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

const SUPPORTED_LOCALES = ["hu", "en", "ar", "es", "de", "he"];

type EdgeSessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: string;
  expires: number;
  accessToken?: string;
  exp?: number;
  iat?: number;
};

function base64UrlToUint8Array(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeBase64UrlJson<T>(input: string): T | null {
  try {
    const bytes = base64UrlToUint8Array(input);
    const text = new TextDecoder().decode(bytes);
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function importSecret(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

async function decryptEdgeSession(input: string, secret: string): Promise<EdgeSessionPayload | null> {
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = input.split(".");
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      return null;
    }

    const header = decodeBase64UrlJson<{ alg?: string }>(encodedHeader);
    if (!header || header.alg !== "HS256") {
      return null;
    }

    const key = await importSecret(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToUint8Array(encodedSignature),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
    );

    if (!valid) {
      return null;
    }

    const payload = decodeBase64UrlJson<EdgeSessionPayload>(encodedPayload);
    if (!payload) {
      return null;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === "number" && payload.exp < nowSeconds) {
      return null;
    }

    if (typeof payload.expires === "number" && payload.expires < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

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
