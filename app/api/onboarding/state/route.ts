import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/access";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { applyOnboardingStatePatch } from "@/lib/onboarding/engine";
import { createDefaultOnboardingState } from "@/lib/onboarding/default-state";
import { getLatestUnseenNewsPost } from "@/lib/news";
import {
  getOnboardingStateByEmail,
  upsertOnboardingState
} from "@/repositories/onboarding-state.repository";
import type { OnboardingReleasePrompt, OnboardingStatePatch } from "@/types/onboarding";

function isOnboardingStatePatch(value: unknown): value is OnboardingStatePatch {
  if (!value || typeof value !== "object") return false;
  const patch = value as Record<string, unknown>;
  return typeof patch.action === "string";
}

export async function GET(request: Request) {
  const authError = await requireRole(request, ["admin", "trainer", "athlete"]);
  if (authError) return authError;

  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return jsonError("Authentication required", 401, "AUTH_REQUIRED");
    }

    const state = (await getOnboardingStateByEmail(authUser.email)) ?? createDefaultOnboardingState(authUser.email);
    const locale = new URL(request.url).searchParams.get("locale") || "en";
    const latestNews = getLatestUnseenNewsPost(locale, state.seenReleaseVersions);
    const releasePrompt: OnboardingReleasePrompt | null = latestNews ? {
      version: latestNews.slug,
      slug: latestNews.slug,
      title: latestNews.title,
      summary: latestNews.summary,
      publishedAt: latestNews.publishedAt,
      publishedLabel: latestNews.publishedLabel,
      href: `/${locale}/news/${latestNews.slug}`
    } : null;

    return NextResponse.json({ state, releasePrompt });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function POST(request: Request) {
  const authError = await requireRole(request, ["admin", "trainer", "athlete"]);
  if (authError) return authError;

  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return jsonError("Authentication required", 401, "AUTH_REQUIRED");
    }

    const body = await readJson(request);
    if (!isOnboardingStatePatch(body)) {
      return jsonError("Invalid onboarding state patch", 400, "VALIDATION_ERROR");
    }

    const current = await getOnboardingStateByEmail(authUser.email);
    const next = applyOnboardingStatePatch(current, authUser.email, body);
    const saved = await upsertOnboardingState(next);
    return NextResponse.json({ state: saved });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
