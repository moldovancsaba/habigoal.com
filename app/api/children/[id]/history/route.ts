import { NextResponse } from "next/server";
import { getChildById } from "@/repositories/child.repository";
import { listAssessmentsByChildId } from "@/repositories/assessment.repository";
import { listHabitRecordsByAthleteId } from "@/repositories/habit-records.repository";
import { ObjectId } from "mongodb";
import { jsonError, requireRole } from "@/lib/api";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { buildDailyOperatingMetrics } from "@/lib/operating-score";
import { findTwinByAthleteId } from "@/repositories/athlete-twin.repository";
import { computeReadiness } from "@/lib/engines/readiness.engine";
import { computeRecovery } from "@/lib/engines/recovery.engine";
import { computeInjuryRisk } from "@/lib/engines/injury-risk.engine";
import { getLatestFms } from "@/services/athleteiq-fms.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireRole(request, ["admin", "trainer", "athlete"]);
    if (authError) {
      return authError;
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return jsonError("Invalid ID", 400, "VALIDATION_ERROR");
    }
    const childId = new ObjectId(id);
    const authUser = await getAuthUser({ productSurface: "athlete-iq" });
    if (!authUser) return jsonError("Athlete IQ access required", 403, "PRODUCT_ACCESS_DENIED");
    if (!(await canAccessAthlete(authUser, id))) {
      return jsonError("Insufficient permissions", 403, "FORBIDDEN");
    }
    const child = await getChildById(childId);
    if (!child) {
      return jsonError("Child not found", 404, "NOT_FOUND");
    }
    
    const [assessments, habits] = await Promise.all([
      listAssessmentsByChildId(id),
      listHabitRecordsByAthleteId(id)
    ]);
    const athleteIdStr = childId.toString();
    const dailyOperatingMetrics = buildDailyOperatingMetrics({
      athleteId: athleteIdStr,
      assessments,
      habitRecords: habits
    });

    let aiIntelligence = null;
    try {
      const twin = await findTwinByAthleteId(athleteIdStr);
      if (twin) {
        const latestFms = await getLatestFms(athleteIdStr);
        const context = { athleteId: athleteIdStr, twin, organisationId: "default", latestFms };
        const [readiness, recovery, injuryRisk] = await Promise.all([
          computeReadiness(context),
          computeRecovery(context),
          computeInjuryRisk(context)
        ]);
        aiIntelligence = { readiness, recovery, injuryRisk };
      }
    } catch (err) {
      console.warn("Failed to compute AI intelligence:", err);
    }

    return NextResponse.json({
      success: true,
      data: {
        child,
        dailyOperatingMetrics,
        aiIntelligence,
        assessments: assessments.sort((a, b) => b.session.date.localeCompare(a.session.date))
      }
    });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
