import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { readJson } from "@/lib/api";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_DAILY_REPORT_CAPABILITY_KEY, validateDailyReportRequest } from "@/lib/athleteiq-daily-report";
import { canViewTeamProjection } from "@/lib/athleteiq-stakeholder";
import { getTeamById } from "@/repositories/team.repository";
import { generateDailyReport } from "@/services/athleteiq-daily-report.service";
import type { DailyReportType } from "@/types/athleteiq-daily-report";

export async function POST(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const body = (await readJson(request)) as { reportType?: string; athleteId?: string; teamId?: string; localDate?: string; timezone?: string } | null;
    const input = normalizeInput(body);
    const errors = validateDailyReportRequest(input);
    if (errors.length) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: errors });
    const authError = await authorizeReportRequest(user, input);
    if (authError) return athleteIqJsonError(authError.code, authError.status, correlationId, { details: authError.details });

    const report = await generateDailyReport({
      reportType: input.reportType as DailyReportType,
      athleteId: input.athleteId,
      teamId: input.teamId,
      localDate: input.localDate!,
      timezone: input.timezone
    });
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_DAILY_REPORT_CAPABILITY_KEY, event: "athleteiq.daily_report.generated", correlationId, reportId: report.id, reportType: report.reportType, sectionCount: report.sections.length, latencyMs: Date.now() - startedAt }));
    return NextResponse.json({ report, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}

function normalizeInput(body: { reportType?: string; athleteId?: string; teamId?: string; localDate?: string; timezone?: string } | null) {
  return {
    reportType: typeof body?.reportType === "string" ? body.reportType.trim() : "",
    athleteId: typeof body?.athleteId === "string" ? body.athleteId.trim() : undefined,
    teamId: typeof body?.teamId === "string" ? body.teamId.trim() : undefined,
    localDate: typeof body?.localDate === "string" ? body.localDate.trim() : "",
    timezone: typeof body?.timezone === "string" ? body.timezone.trim() : undefined
  };
}

async function authorizeReportRequest(user: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>, input: ReturnType<typeof normalizeInput>) {
  if ((input.reportType === "athlete" || input.reportType === "parent") && input.athleteId && !(await canAccessAthlete(user, input.athleteId))) {
    return { code: "FORBIDDEN" as const, status: 403, details: ["athlete access denied"] };
  }
  if ((input.reportType === "coach" || input.reportType === "team") && input.teamId) {
    const team = await getTeamById(input.teamId);
    if (!team) return { code: "VALIDATION_ERROR" as const, status: 404, details: ["team not found"] };
    if (!canViewTeamProjection(user, input.teamId, team.trainerEmails)) return { code: "FORBIDDEN" as const, status: 403, details: ["team access denied"] };
  }
  return null;
}
