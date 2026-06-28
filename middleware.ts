import { NextRequest, NextResponse } from "next/server";
import { SESSION_DURATION_MS, buildRefreshedClaims, shouldRefreshSession } from "@/lib/session-refresh";

const SESSION_COOKIE_NAME = "habigoal_session";
const LEGACY_SESSION_COOKIE_NAMES = ["survey_session", "kidex_session"];
const localePattern = /^\/(hu|en|ar|es|de|he)(\/|$)/;

type SessionPayload = {
  role?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
};

function base64UrlToUint8Array(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlEncode(value: string) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

// Edge-safe HS256 JWT signing (middleware runs on the edge runtime, so it cannot
// use lib/session, which depends on next/headers). Mirrors verifyHs256Jwt.
async function signHs256Jwt(claims: Record<string, unknown>, secret: string): Promise<string> {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(JSON.stringify(claims));
  const data = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return `${data}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

async function applySlidingRefresh(response: NextResponse, session: SessionPayload) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || !shouldRefreshSession(session)) return;
  try {
    const token = await signHs256Jwt(buildRefreshedClaims(session), secret);
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(Date.now() + SESSION_DURATION_MS)
    });
  } catch {
    // Never let a refresh failure block the request; the existing cookie remains valid.
  }
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
    /^\/(hu|en|ar|es|de|he)\/login$/.test(pathname) ||
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
    LEGACY_SESSION_COOKIE_NAMES.map((name) => request.cookies.get(name)?.value).find(Boolean);

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

  if ((process.env.HABIGOAL_ENFORCE_AUTH ?? process.env.SURVEY_ENFORCE_AUTH) !== "true") {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const session = await readSession(request);
  const locale = getLocale(pathname);

  if (!session) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const roles = parseRoles(session.role);
  const isAdmin = roles.includes("admin");
  const isParent = roles.includes("parent") || roles.includes("guardian");
  const isTrainer =
    roles.includes("trainer") ||
    roles.includes("performance_coach") ||
    roles.includes("physio") ||
    roles.includes("analyst") ||
    roles.includes("club_management");
  const isAthlete = roles.includes("athlete") && !isAdmin && !isTrainer && !isParent;

  if (isParent && pathname.startsWith(`/${locale}/dashboard`) && !pathname.startsWith(`/${locale}/dashboard/parent`)) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard/parent`, request.url));
  }

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

  if (!isAdmin && !isTrainer && !isParent && !isAthlete && pathname.startsWith(`/${locale}/dashboard`)) {
    return NextResponse.redirect(new URL(`/${locale}/`, request.url));
  }

  const response = NextResponse.next();
  await applySlidingRefresh(response, session);
  return response;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"]
};
