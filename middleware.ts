import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "survey_session";
const LEGACY_SESSION_COOKIE_NAME = "kidex_session";
const localePattern = /^\/(hu|en|ar|es|de|he)(\/|$)/;

type SessionPayload = {
  role?: string;
  exp?: number;
};

function base64UrlToUint8Array(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function verifyHs256Jwt(token: string, secret: string): Promise<SessionPayload | null> {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) return null;

  const headerBytes = base64UrlToUint8Array(encodedHeader);
  const payloadBytes = base64UrlToUint8Array(encodedPayload);
  const signatureBytes = base64UrlToUint8Array(encodedSignature);

  const header = JSON.parse(new TextDecoder().decode(headerBytes)) as { alg?: string };
  if (header.alg !== "HS256") return null;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  );

  if (!valid) return null;

  const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as SessionPayload;
  if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
    return null;
  }

  return payload;
}

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  if (!localePattern.test(pathname)) return true;
  if (localePattern.test(pathname) && pathname.split("/").filter(Boolean).length === 1) return true;
  return (
    /^\/(hu|en|ar|es|de|he)\/news(\/[^/]+)?$/.test(pathname) ||
    /^\/(hu|en|ar|es|de|he)\/legal\/(gtc|privacy)$/.test(pathname)
  );
}

function getLocale(pathname: string) {
  return pathname.match(localePattern)?.[1] || "hu";
}

function parseRoles(value: string | undefined) {
  return (value || "")
    .split(",")
    .map((role) => role.trim().toLowerCase())
    .filter(Boolean);
}

async function readSession(request: NextRequest): Promise<SessionPayload | null> {
  const token =
    request.cookies.get(SESSION_COOKIE_NAME)?.value ||
    request.cookies.get(LEGACY_SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  try {
    return await verifyHs256Jwt(token, secret);
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next();
  }

  if (process.env.SURVEY_ENFORCE_AUTH !== "true") {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const session = await readSession(request);
  const locale = getLocale(pathname);

  if (!session) {
    const loginUrl = new URL("/api/auth/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const roles = parseRoles(session.role);
  const isAdmin = roles.includes("admin");
  const isTrainer = roles.includes("trainer");
  const isAthlete = roles.includes("athlete") && !isAdmin && !isTrainer;

  if (isAthlete && pathname.startsWith(`/${locale}/dashboard`) && !pathname.startsWith(`/${locale}/dashboard/assessment`)) {
    return NextResponse.redirect(new URL(`/${locale}/athletes`, request.url));
  }

  if ((isAdmin || isTrainer) && pathname.startsWith(`/${locale}/athletes`)) {
    const redirectedPath = pathname.replace(`/${locale}/athletes`, `/${locale}/dashboard/athletes`) || `/${locale}/dashboard/athletes`;
    return NextResponse.redirect(new URL(redirectedPath, request.url));
  }

  if (isTrainer && pathname.startsWith(`/${locale}/dashboard/settings`)) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"]
};
