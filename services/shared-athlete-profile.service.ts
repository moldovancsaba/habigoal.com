import type { AuthUser } from "@/lib/access";
import {
  createEmptyAthleteProfileForUser,
  findChildrenByUserIdentity,
  markChildProfileNeedsReview,
  type ChildProfile
} from "@/repositories/child.repository";
import { setUserAthleteId } from "@/repositories/user.repository";

export type CanonicalAthleteProfileResult = {
  athlete: ChildProfile;
  created: boolean;
  linked: boolean;
  profileState: "empty" | "active" | "needs_review";
};

export async function ensureCanonicalAthleteProfileForUser(input: {
  locale?: string;
  user: AuthUser;
}): Promise<CanonicalAthleteProfileResult> {
  const matches = await findChildrenByUserIdentity({
    email: input.user.email,
    userId: input.user.id
  });

  if (matches.length > 1) {
    const reviewProfile = await markChildProfileNeedsReview(matches[0]._id ?? "");
    const athlete = reviewProfile ?? matches[0];
    if (athlete._id) await setUserAthleteId(input.user.email, athlete._id);
    return {
      athlete,
      created: false,
      linked: Boolean(athlete._id),
      profileState: "needs_review"
    };
  }

  if (matches[0]?._id) {
    await setUserAthleteId(input.user.email, matches[0]._id);
    return {
      athlete: matches[0],
      created: false,
      linked: true,
      profileState: matches[0].profileState === "needs_review" ? "needs_review" : "active"
    };
  }

  const created = await createEmptyAthleteProfileForUser({
    email: input.user.email,
    locale: input.locale,
    name: input.user.name || input.user.email,
    userId: input.user.id
  });
  if (created._id) await setUserAthleteId(input.user.email, created._id);

  return {
    athlete: created,
    created: true,
    linked: Boolean(created._id),
    profileState: "empty"
  };
}
