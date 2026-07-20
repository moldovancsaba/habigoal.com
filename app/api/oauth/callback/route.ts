import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, getUserInfo } from "@/services/auth-service";
import { createSession } from "@/lib/session";
import { cookies } from "next/headers";
import { findUserByEmail, listAllUsers, markUserLogin, upsertUser } from "@/repositories/user.repository";
import { getDatabase } from "@/lib/mongodb";
import { getPrimaryRole } from "@/lib/access";

function isLocalReturnTo(value: string | undefined) {
  return Boolean(value && /^\/(hu|en|ar|es|de|he)(\/|$)/.test(value));
}

function resolvePostLoginRedirect(input: {
  athleteId?: string;
  locale: string;
  primaryRole: string;
  returnTo?: string;
}) {
  const { athleteId, locale, primaryRole, returnTo } = input;
  const athleteIq = `/${locale}/athlete-iq?persona=athlete`;
  const trainerIq = `/${locale}/athlete-iq?persona=trainer`;
  const defaultPath =
    primaryRole === "athlete"
      ? athleteIq
      : primaryRole === "admin"
        ? `/${locale}/dashboard/settings`
        : primaryRole === "trainer"
          ? trainerIq
          : `/${locale}/habigoal`;

  if (!isLocalReturnTo(returnTo)) return defaultPath;

  const publicReturn =
    returnTo!.startsWith(`/${locale}/news`) ||
    returnTo!.startsWith(`/${locale}/legal`) ||
    returnTo!.startsWith(`/${locale}/contracts`);
  if (publicReturn) return returnTo!;

  if (returnTo!.startsWith(`/${locale}/habigoal`) || returnTo!.startsWith(`/${locale}/athlete-iq`)) {
    return returnTo!;
  }

  if (primaryRole === "athlete") {
    if (returnTo!.startsWith(`/${locale}/dashboard/assessment`)) return `/${locale}/habigoal`;
    if (returnTo!.startsWith(`/${locale}/dashboard`) || returnTo!.startsWith(`/${locale}/athletes`)) return athleteIq;
  }

  if (primaryRole === "admin") return returnTo!.startsWith(`/${locale}/dashboard`) ? returnTo! : `/${locale}/dashboard/settings`;
  if (primaryRole === "trainer") return returnTo!.startsWith(`/${locale}/dashboard`) ? returnTo! : trainerIq;

  return athleteId ? athleteIq : defaultPath;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("oauth_state")?.value;
  const returnTo = cookieStore.get("oauth_return_to")?.value;

  if (!code || !state || state !== savedState) {
    return NextResponse.json({ error: "Invalid state or code" }, { status: 400 });
  }

  try {
    const tokens = await exchangeCodeForToken(code, request);
    const ssoUser = await getUserInfo(tokens.access_token);

    // Authorize SSO identities through the local Habigoal user allow-list.
    let localUser = await findUserByEmail(ssoUser.email);
    
    // Migration fallback: attach pre-email local users to their SSO email.
    if (!localUser && ssoUser.name) {
      const db = await getDatabase();
      const doc = await db.collection("users").findOne({ name: ssoUser.name, email: { $exists: false } });
      if (doc) {
        console.info(`Migrating existing user ${ssoUser.name} to email ${ssoUser.email}`);
        await upsertUser({
          email: ssoUser.email,
          name: ssoUser.name,
          roles: doc.roles || ["athlete"],
          athleteId: typeof doc.athleteId === "string" ? doc.athleteId : undefined,
          teamIds: Array.isArray(doc.teamIds) ? doc.teamIds : []
        });
        localUser = await findUserByEmail(ssoUser.email);
      }
    }

    // Bootstrap the first approved SSO user as the initial admin.
    const allUsers = await listAllUsers();
    if (allUsers.length === 0) {
      console.info(`Bootstrapping first user as admin: ${ssoUser.email}`);
      await upsertUser({
        email: ssoUser.email,
        name: ssoUser.name,
        roles: ["admin"]
      });
      localUser = await findUserByEmail(ssoUser.email);
    }
    
    if (!localUser) {
      console.warn(`Login denied for non-whitelisted email: ${ssoUser.email}`);
      // Return denied users to a public page with an error marker.
      const fallbackPath = returnTo?.match(/^\/(hu|en|ar|es|de|he)(\/|$)/)?.[0] || "/";
      const loginUrl = new URL(fallbackPath, request.url);
      loginUrl.searchParams.set("error", "access_denied");
      cookieStore.delete("oauth_state");
      cookieStore.delete("oauth_return_to");
      return NextResponse.redirect(loginUrl);
    }

    await markUserLogin(ssoUser.email, ssoUser.name);
    localUser = await findUserByEmail(ssoUser.email);
    if (!localUser) {
      return NextResponse.json({ error: "Local user provisioning failed" }, { status: 500 });
    }

    // Create the local session from SSO identity plus local Habigoal roles.
    await createSession({
      id: ssoUser.id,
      email: ssoUser.email,
      name: ssoUser.name,
      role: localUser.roles.join(",") || "athlete"
    });

    // Remove one-time OAuth state cookies after session creation.
    cookieStore.delete("oauth_state");
    cookieStore.delete("oauth_return_to");

    // Redirect back to the requested in-app path.
    const locale = returnTo?.match(/^\/(hu|en|ar|es|de|he)(\/|$)/)?.[1] || "en";
    const primaryRole = getPrimaryRole(localUser.roles);
    const redirectPath = resolvePostLoginRedirect({
      athleteId: localUser.athleteId,
      locale,
      primaryRole,
      returnTo
    });

    return NextResponse.redirect(new URL(redirectPath, request.url));
  } catch (error) {
    console.error("Auth callback error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
