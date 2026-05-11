import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, getUserInfo } from "@/services/auth-service";
import { createSession } from "@/lib/session";
import { cookies } from "next/headers";
import { findUserByEmail, listAllUsers, markUserLogin, upsertUser } from "@/repositories/user.repository";
import { getDatabase } from "@/lib/mongodb";
import { getPrimaryRole } from "@/lib/access";

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

    // Check if the user's email is in our local approved list
    let localUser = await findUserByEmail(ssoUser.email);
    
    // Migration Fallback: If not found by email, try to find by name (for existing users)
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

    // Bootstrap: If no users exist AT ALL in the system, make the first one an admin
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
      // Redirect to landing page with an error parameter
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

    // Create session using SSO info but merging local roles
    await createSession({
      id: ssoUser.id,
      email: ssoUser.email,
      name: ssoUser.name,
      role: localUser.roles.join(",") || "athlete",
      accessToken: tokens.access_token
    });

    // Clean up state cookie
    cookieStore.delete("oauth_state");
    cookieStore.delete("oauth_return_to");

    // Redirect back to the requested in-app path.
    const locale = returnTo?.match(/^\/(hu|en|ar|es|de|he)(\/|$)/)?.[1] || "en";
    const primaryRole = getPrimaryRole(localUser.roles);
    const redirectPath = primaryRole === "athlete"
      ? `/${locale}/athletes/${localUser.athleteId || ""}`.replace(/\/$/, "")
      : primaryRole === "admin"
        ? `/${locale}/dashboard/settings`
        : `/${locale}/dashboard`;

    return NextResponse.redirect(new URL(returnTo?.includes("/dashboard/assessment") ? returnTo : (returnTo?.includes("/news") || returnTo?.includes("/legal") ? returnTo : redirectPath), request.url));
  } catch (error) {
    console.error("Auth callback error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
