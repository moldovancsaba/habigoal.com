import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_DAILY_REPORT_CAPABILITY_KEY } from "@/lib/athleteiq-daily-report";
import { canViewTeamProjection } from "@/lib/athleteiq-stakeholder";
import { getTeamById } from "@/repositories/team.repository";
import { getReportExport } from "@/services/athleteiq-daily-report.service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { id } = await context.params;
    const report = await getReportExport(id);
    if (!report) return athleteIqJsonError("VALIDATION_ERROR", 404, correlationId, { details: ["daily report not found"] });
    if (report.athleteId && !(await canAccessAthlete(user, report.athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);
    if (report.teamId) {
      const team = await getTeamById(report.teamId);
      if (!team || !canViewTeamProjection(user, report.teamId, team.trainerEmails)) return athleteIqJsonError("FORBIDDEN", 403, correlationId);
    }
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_DAILY_REPORT_CAPABILITY_KEY, event: "athleteiq.daily_report.exported_json", correlationId, reportId: report.id, reportType: report.reportType, latencyMs: Date.now() - startedAt }));
    return NextResponse.json({ report, exportFormat: "json", correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
