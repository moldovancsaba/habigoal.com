import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api";
import { getAuthUser, resolveAccessibleAthleteIds } from "@/lib/access";
import { listAssessmentSummaries } from "@/repositories/assessment.repository";
import { getGlobalSettings } from "@/repositories/settings.repository";
import { evaluateCheckInConcerns } from "@/lib/concern-flags";

export async function GET(request: Request) {
  const authError = await requireRole(request, ["admin", "trainer", "performance_coach", "physio"]);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];

  const authUser = await getAuthUser({ productSurface: "athlete-iq" });
  const allowedIds = authUser ? await resolveAccessibleAthleteIds(authUser) : null;
  const [assessments, settings] = await Promise.all([
    listAssessmentSummaries(),
    getGlobalSettings(),
  ]);

  const dayAssessments = assessments.filter((a) => {
    if (a.session?.date !== date) return false;
    if (allowedIds !== null && a.childId && !allowedIds.includes(String(a.childId))) return false;
    return true;
  });
  const concerns = dayAssessments.flatMap((assessment) => {
    const flags = evaluateCheckInConcerns(assessment, settings);
    return flags.map((flag) => ({
      athleteId: assessment.childId,
      athleteName: assessment.child?.name,
      date,
      ...flag,
    }));
  });

  return NextResponse.json({ date, concerns, count: concerns.length });
}
