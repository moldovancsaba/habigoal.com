import { buildFmsScreen, validateFmsScores } from "@/lib/athleteiq-fms";
import { getLatestFmsScreen, listFmsScreens, upsertFmsScreen } from "@/repositories/athleteiq-fms.repository";
import { FMS_SUBTESTS, type FmsPainFlags, type FmsScores, type FmsScreen } from "@/types/athleteiq-fms";

function coercePainFlags(input: unknown): FmsPainFlags {
  const painFlags: FmsPainFlags = {};
  if (input && typeof input === "object") {
    const record = input as Record<string, unknown>;
    for (const subtest of FMS_SUBTESTS) {
      if (record[subtest] === true) painFlags[subtest] = true;
    }
  }
  return painFlags;
}

export async function submitFmsScreen(input: {
  athleteId: string;
  date: string;
  scores: unknown;
  painFlags: unknown;
  notes?: unknown;
  recordedBy: string;
  now?: Date;
}): Promise<{ errors: string[]; screen: FmsScreen | null }> {
  const errors = validateFmsScores(input.scores);
  if (errors.length) return { errors, screen: null };

  const screen = buildFmsScreen({
    athleteId: input.athleteId,
    date: input.date,
    scores: input.scores as FmsScores,
    painFlags: coercePainFlags(input.painFlags),
    notes: typeof input.notes === "string" ? input.notes : undefined,
    recordedBy: input.recordedBy,
    now: input.now
  });

  const saved = await upsertFmsScreen(screen);
  return { errors: [], screen: saved };
}

export async function getFmsHistory(input: { athleteId: string; from?: string; to?: string }): Promise<FmsScreen[]> {
  return listFmsScreens(input.athleteId, { from: input.from, to: input.to });
}

export async function getLatestFms(athleteId: string): Promise<FmsScreen | null> {
  return getLatestFmsScreen(athleteId);
}
