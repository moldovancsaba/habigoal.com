import { NextRequest, NextResponse } from "next/server";
import { getAuthorizationUrl } from "@/services/auth-service";
import { cookies } from "next/headers";
import { env } from "@/config/env";
import { createSession } from "@/lib/session";
import { upsertPersonaLoginUser } from "@/repositories/user.repository";

function sanitizeReturnTo(input: string | null, fallbackLocale: string) {
  if (!input) return `/${fallbackLocale}/dashboard`;
  if (!input.startsWith("/")) return `/${fallbackLocale}/dashboard`;
  if (input.startsWith("//")) return `/${fallbackLocale}/dashboard`;
  if (input.startsWith("/api/")) return `/${fallbackLocale}/dashboard`;
  return input;
}

function getLocaleFromRequest(request: NextRequest, returnTo?: string | null) {
  return (
    returnTo?.match(/^\/(hu|en|ar|es|de|he)(\/|$)/)?.[1] ||
    request.headers.get("referer")?.match(/\/(hu|en|ar|es|de|he)(\/|$)/)?.[1] ||
    "en"
  );
}

type LoginPersona = "athlete" | "trainer";

function normalizeIdentifier(input: unknown) {
  if (typeof input !== "string") return "";
  return input.trim();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUsername(username: string) {
  return username.length >= 2 && username.length <= 80 && /^[\p{L}\p{N}._ -]+$/u.test(username);
}

function slugifyUsername(username: string) {
  return username
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}._ -]/gu, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function resolveLoginIdentity(identifier: string) {
  const normalized = identifier.trim();
  if (isValidEmail(normalized.toLowerCase())) {
    return {
      email: normalized.toLowerCase(),
      name: normalized
    };
  }
  if (!isValidUsername(normalized)) return null;
  const slug = slugifyUsername(normalized);
  if (!slug) return null;
  return {
    email: `${slug}@habigoal.local`,
    name: normalized
  };
}

function normalizePersona(input: unknown): LoginPersona | null {
  return input === "athlete" || input === "trainer" ? input : null;
}

function personaRedirect(locale: string, persona: LoginPersona) {
  return persona === "athlete" ? `/${locale}/habigoal` : `/${locale}/athlete-iq`;
}

function shouldUsePersonaRedirect(next: string, locale: string) {
  return next === `/${locale}` || next === `/${locale}/login` || next === `/${locale}/dashboard`;
}

function safeProductRedirect(next: string, locale: string, persona: LoginPersona) {
  const expected = personaRedirect(locale, persona);
  if (shouldUsePersonaRedirect(next, locale)) return expected;
  if (next.includes("/athlete-iq") && persona !== "trainer") return expected;
  if (next.includes("/habigoal") && persona !== "athlete") return expected;
  return next;
}

function loginPageUrl(request: NextRequest, locale: string, next: string, error?: string) {
  const url = new URL(`/${locale}/login`, request.url);
  url.searchParams.set("next", next);
  if (error) url.searchParams.set("error", error);
  return url;
}

export async function GET(request: NextRequest) {
  const referer = request.headers.get("referer");
  const requestedNext = request.nextUrl.searchParams.get("next");
  const locale = getLocaleFromRequest(request, requestedNext || referer);
  const next = sanitizeReturnTo(request.nextUrl.searchParams.get("next"), locale);

  if (request.nextUrl.searchParams.get("sso") !== "1") {
    return NextResponse.redirect(loginPageUrl(request, locale, next));
  }

  if (!env.habigoalEnforceAuth) {
    return NextResponse.redirect(new URL(next, request.url));
  }

  const state = Math.random().toString(36).substring(7);
  const authUrl = getAuthorizationUrl(state, request);

  const cookieStore = await cookies();
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10, // 10 minutes
    sameSite: "lax",
    path: "/"
  });
  cookieStore.set("oauth_return_to", next, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    sameSite: "lax",
    path: "/"
  });

  return NextResponse.redirect(authUrl);
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  const acceptsJson = request.headers.get("accept")?.includes("application/json") || contentType.includes("application/json");
  const body = contentType.includes("application/json")
    ? await request.json().catch(() => ({}))
    : Object.fromEntries((await request.formData()).entries());

  const rawNext = typeof body.next === "string" ? body.next : request.nextUrl.searchParams.get("next");
  const locale = getLocaleFromRequest(request, rawNext);
  const next = sanitizeReturnTo(rawNext, locale);
  const identifier = normalizeIdentifier(body.identifier || body.email);
  const identity = resolveLoginIdentity(identifier);
  const persona = normalizePersona(body.persona);

  if (!identity || !persona) {
    if (acceptsJson) {
      return NextResponse.json({ error: "Invalid login input" }, { status: 400 });
    }
    return NextResponse.redirect(loginPageUrl(request, locale, next, !identity ? "invalid_identifier" : "missing_persona"), 303);
  }

  const localUser = await upsertPersonaLoginUser({
    email: identity.email,
    name: identity.name,
    roles: [persona]
  });

  if (!localUser) {
    if (acceptsJson) {
      return NextResponse.json({ error: "User provisioning failed" }, { status: 500 });
    }
    return NextResponse.redirect(loginPageUrl(request, locale, next, "provisioning_failed"), 303);
  }

  const name = localUser.name || identity.name;

  await createSession({
    id: localUser.id || identity.email,
    email: identity.email,
    name,
    role: persona
  });

  const redirectTarget = safeProductRedirect(next, locale, persona);

  if (acceptsJson) {
    return NextResponse.json({
      user: {
        email: identity.email,
        name,
        roles: localUser.roles,
        activeRole: persona,
        primaryRole: persona
      },
      redirectTo: redirectTarget
    });
  }

  return NextResponse.redirect(new URL(redirectTarget, request.url), 303);
}
