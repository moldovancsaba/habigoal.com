import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_DAILY_REPORT_CAPABILITY_KEY, validateDailyReportRequest } from "@/lib/athleteiq-daily-report";
import { canViewTeamProjection } from "@/lib/athleteiq-stakeholder";
import { getTeamById } from "@/repositories/team.repository";
import { getLatestReport } from "@/services/athleteiq-daily-report.service";
import type { DailyReportType } from "@/types/athleteiq-daily-report";

export async function GET(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { searchParams } = new URL(request.url);
    const input = {
      reportType: searchParams.get("view")?.trim() || "",
      athleteId: searchParams.get("athleteId")?.trim() || undefined,
      teamId: searchParams.get("teamId")?.trim() || undefined,
      localDate: searchParams.get("date")?.trim() || ""
    };
    const errors = validateDailyReportRequest(input);
    if (errors.length) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: errors });
    if ((input.reportType === "athlete" || input.reportType === "parent") && input.athleteId && !(await canAccessAthlete(user, input.athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);
    if ((input.reportType === "coach" || input.reportType === "team") && input.teamId) {
      const team = await getTeamById(input.teamId);
      if (!team) return athleteIqJsonError("VALIDATION_ERROR", 404, correlationId, { details: ["team not found"] });
      if (!canViewTeamProjection(user, input.teamId, team.trainerEmails)) return athleteIqJsonError("FORBIDDEN", 403, correlationId);
    }

    const report = await getLatestReport({
      reportType: input.reportType as DailyReportType,
      athleteId: input.athleteId,
      teamId: input.teamId,
      localDate: input.localDate
    });
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_DAILY_REPORT_CAPABILITY_KEY, event: "athleteiq.daily_report.viewed", correlationId, reportType: input.reportType, found: Boolean(report), latencyMs: Date.now() - startedAt }));
    return NextResponse.json({ report, empty: !report, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
