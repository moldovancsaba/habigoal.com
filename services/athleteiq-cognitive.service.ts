import { ObjectId } from "mongodb";
import { buildCognitiveLiteJourney, buildCogLeagueBoundary, validateCognitiveTraitEntry, withCognitiveTimeout } from "@/lib/athleteiq-cognitive";
import { getChildById } from "@/repositories/child.repository";
import { listLatestCognitiveEntries, upsertCognitiveTraitEntry } from "@/repositories/athleteiq-cognitive.repository";
import type { CognitiveTrait } from "@/types/athleteiq-cognitive";

export async function getCognitiveLiteResults(input: { athleteId: string }) {
  const [athlete, entries] = await Promise.all([
    ObjectId.isValid(input.athleteId)
      ? withCognitiveTimeout(getChildById(new ObjectId(input.athleteId)))
      : Promise.resolve(null),
    withCognitiveTimeout(listLatestCognitiveEntries(input.athleteId))
  ]);
  return buildCognitiveLiteJourney({ athleteId: input.athleteId, athlete, entries });
}

export async function submitCognitiveLiteResult(input: {
  athleteId: string;
  trait: unknown;
  score: unknown;
  localDate: string;
  actorEmail?: string;
  now?: Date;
}) {
  const errors = validateCognitiveTraitEntry({ trait: input.trait, score: input.score });
  if (errors.length) return { errors, journey: null };

  const enteredAt = (input.now ?? new Date()).toISOString();
  await withCognitiveTimeout(
    upsertCognitiveTraitEntry({
      athleteId: input.athleteId,
      trait: input.trait as CognitiveTrait,
      localDate: input.localDate,
      score: input.score as number,
      source: "manual_entry",
      enteredAt,
      actorEmail: input.actorEmail
    })
  );

  const journey = await getCognitiveLiteResults({ athleteId: input.athleteId });
  return { errors: [], journey };
}

export async function getCogLeagueFutureBoundary() {
  return buildCogLeagueBoundary();
}
