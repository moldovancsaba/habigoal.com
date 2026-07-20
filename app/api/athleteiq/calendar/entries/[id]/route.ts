import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { readJson } from "@/lib/api";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_CALENDAR_CAPABILITY_KEY, validateDayEntryInput } from "@/lib/athleteiq-calendar";
import { getCalendarEntry, patchCalendarEntry, removeCalendarEntry } from "@/services/athleteiq-calendar.service";
import type { AthleteIqDayEntryType, AthleteIqDayEntryVisibility } from "@/types/athleteiq-calendar";

type PatchBody = {
  type?: string;
  titleKeyOrText?: string;
  visibility?: string;
  startAt?: string | null;
  endAt?: string | null;
};

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { id } = await context.params;
    const existing = await getCalendarEntry(id);
    if (!existing) return athleteIqJsonError("VALIDATION_ERROR", 404, correlationId, { details: ["calendar entry not found"] });
    if (!(await canAccessAthlete(user, existing.athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    const body = (await readJson(request)) as PatchBody | null;
    const patch = normalizePatch(body);
    const merged = { ...existing, ...patch };
    const errors = validateDayEntryInput(merged);
    if (errors.length) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: errors });

    const entry = await patchCalendarEntry({
      entry: existing,
      patch: {
        ...patch,
        type: patch.type as AthleteIqDayEntryType | undefined,
        visibility: patch.visibility as AthleteIqDayEntryVisibility | undefined
      },
      actorEmail: user.email
    });
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_CALENDAR_CAPABILITY_KEY, event: "athleteiq.calendar.entry_updated", correlationId, athleteId: entry.athleteId, entryId: entry.id, latencyMs: Date.now() - startedAt }));
    return NextResponse.json({ entry, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { id } = await context.params;
    const existing = await getCalendarEntry(id);
    if (!existing) return athleteIqJsonError("VALIDATION_ERROR", 404, correlationId, { details: ["calendar entry not found"] });
    if (!(await canAccessAthlete(user, existing.athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    const entry = await removeCalendarEntry({ entry: existing, actorEmail: user.email });
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_CALENDAR_CAPABILITY_KEY, event: "athleteiq.calendar.entry_deleted", correlationId, athleteId: entry.athleteId, entryId: entry.id, latencyMs: Date.now() - startedAt }));
    return NextResponse.json({ entry, deleted: true, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}

function normalizePatch(body: PatchBody | null) {
  return {
    ...(typeof body?.type === "string" ? { type: body.type.trim() } : {}),
    ...(typeof body?.titleKeyOrText === "string" ? { titleKeyOrText: body.titleKeyOrText.trim() } : {}),
    ...(typeof body?.visibility === "string" ? { visibility: body.visibility.trim() } : {}),
    ...(body?.startAt === null ? { startAt: undefined } : typeof body?.startAt === "string" ? { startAt: body.startAt.trim() } : {}),
    ...(body?.endAt === null ? { endAt: undefined } : typeof body?.endAt === "string" ? { endAt: body.endAt.trim() } : {})
  };
}
