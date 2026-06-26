import { ObjectId } from "mongodb";
import { buildCognitiveLiteJourney, buildCogLeagueBoundary, withCognitiveTimeout } from "@/lib/athleteiq-cognitive";
import { getChildById } from "@/repositories/child.repository";

export async function getCognitiveLiteResults(input: { athleteId: string }) {
  const athlete = ObjectId.isValid(input.athleteId)
    ? await withCognitiveTimeout(getChildById(new ObjectId(input.athleteId)))
    : null;
  return buildCognitiveLiteJourney({ athleteId: input.athleteId, athlete });
}

export async function getCogLeagueFutureBoundary() {
  return buildCogLeagueBoundary();
}
