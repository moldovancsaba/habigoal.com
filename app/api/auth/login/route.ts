import { NextRequest, NextResponse } from "next/server";
import { getAuthorizationUrl } from "@/services/auth-service";
import { cookies } from "next/headers";
import { env } from "@/config/env";
import { createSession } from "@/lib/session";
import { canOpenProductSurface } from "@/lib/access";
import type { ProductSurfaceId } from "@/lib/product-entitlements";
import { findUserByEmail, upsertPersonaLoginUser } from "@/repositories/user.repository";

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

function resolveLoginIdentity(identifier: string) {
  const normalized = identifier.trim();
  if (isValidEmail(normalized.toLowerCase())) {
    return {
      email: normalized.toLowerCase(),
      name: normalized
    };
  }
  return null;
}

function normalizePersona(input: unknown): LoginPersona | null {
  return input === "athlete" || input === "trainer" ? input : null;
}

function normalizeProductSurface(input: unknown, next: string, persona: LoginPersona | null): ProductSurfaceId {
  if (input === "habigoal" || input === "athlete-iq") return input;
  if (next.includes("/athlete-iq")) return "athlete-iq";
  if (next.includes("/habigoal")) return "habigoal";
  return persona === "trainer" ? "athlete-iq" : "habigoal";
}

function shouldUsePersonaRedirect(next: string, locale: string) {
  return next === `/${locale}` || next === `/${locale}/login` || next === `/${locale}/dashboard`;
}

function surfaceRedirect(locale: string, surface: ProductSurfaceId) {
  return surface === "athlete-iq" ? `/${locale}/athlete-iq` : `/${locale}/habigoal`;
}

function safeProductRedirect(next: string, locale: string, persona: LoginPersona, surface: ProductSurfaceId) {
  const expected = surfaceRedirect(locale, surface);
  if (shouldUsePersonaRedirect(next, locale)) return expected;
  if (next.includes("/athlete-iq") && surface !== "athlete-iq") return expected;
  if (next.includes("/habigoal") && surface !== "habigoal") return expected;
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
  const productSurface = normalizeProductSurface(body.productSurface, next, persona);

  if (!identity || !persona) {
    if (acceptsJson) {
      return NextResponse.json({ error: "Invalid login input" }, { status: 400 });
    }
    return NextResponse.redirect(loginPageUrl(request, locale, next, !identity ? "invalid_identifier" : "missing_persona"), 303);
  }

  const existingUser = await findUserByEmail(identity.email);
  if (productSurface === "habigoal" && !existingUser) {
    const code = "athlete_iq_registration_required";
    if (acceptsJson) {
      return NextResponse.json({
        error: "Athlete IQ registration required",
        code
      }, { status: 403 });
    }
    return NextResponse.redirect(loginPageUrl(request, locale, next, code), 303);
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

  if (!canOpenProductSurface(localUser as Parameters<typeof canOpenProductSurface>[0], productSurface)) {
    const code = productSurface === "athlete-iq" ? "athlete_iq_access_required" : "habigoal_access_required";
    if (acceptsJson) {
      return NextResponse.json({
        error: "Product access denied",
        code,
        productEntitlements: localUser.productEntitlements
      }, { status: 403 });
    }
    return NextResponse.redirect(loginPageUrl(request, locale, next, code), 303);
  }

  await createSession({
    id: localUser.id || identity.email,
    email: identity.email,
    name,
    role: persona,
    productSurface
  });

  const redirectTarget = safeProductRedirect(next, locale, persona, productSurface);

  if (acceptsJson) {
    return NextResponse.json({
      user: {
        email: identity.email,
        name,
        roles: localUser.roles,
        activeRole: persona,
        primaryRole: persona,
        productEntitlements: localUser.productEntitlements,
        productSurface
      },
      redirectTo: redirectTarget
    });
  }

  return NextResponse.redirect(new URL(redirectTarget, request.url), 303);
}
