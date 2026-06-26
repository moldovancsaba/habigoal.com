import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { readJson } from "@/lib/api";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_CALENDAR_CAPABILITY_KEY, validateDayEntryInput } from "@/lib/athleteiq-calendar";
import { createCalendarEntry } from "@/services/athleteiq-calendar.service";
import type { AthleteIqDayEntryType, AthleteIqDayEntryVisibility } from "@/types/athleteiq-calendar";

type EntryBody = {
  athleteId?: string;
  localDate?: string;
  type?: string;
  titleKeyOrText?: string;
  visibility?: string;
  startAt?: string;
  endAt?: string;
};

export async function POST(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser();
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const body = (await readJson(request)) as EntryBody | null;
    const input = normalizeBody(body);
    const errors = validateDayEntryInput(input);
    if (errors.length) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: errors });
    if (!(await canAccessAthlete(user, input.athleteId!))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    const entry = await createCalendarEntry({
      athleteId: input.athleteId!,
      localDate: input.localDate!,
      type: input.type as AthleteIqDayEntryType,
      titleKeyOrText: input.titleKeyOrText!,
      visibility: input.visibility as AthleteIqDayEntryVisibility | undefined,
      startAt: input.startAt,
      endAt: input.endAt
    });
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_CALENDAR_CAPABILITY_KEY, event: "athleteiq.calendar.entry_created", correlationId, athleteId: entry.athleteId, entryId: entry.id, latencyMs: Date.now() - startedAt }));
    return NextResponse.json({ entry, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}

function normalizeBody(body: EntryBody | null) {
  return {
    athleteId: typeof body?.athleteId === "string" ? body.athleteId.trim() : "",
    localDate: typeof body?.localDate === "string" ? body.localDate.trim() : "",
    type: typeof body?.type === "string" ? body.type.trim() : "",
    titleKeyOrText: typeof body?.titleKeyOrText === "string" ? body.titleKeyOrText.trim() : "",
    visibility: typeof body?.visibility === "string" ? body.visibility.trim() : undefined,
    startAt: typeof body?.startAt === "string" ? body.startAt.trim() : undefined,
    endAt: typeof body?.endAt === "string" ? body.endAt.trim() : undefined
  };
}
