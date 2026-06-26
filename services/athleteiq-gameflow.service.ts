import { buildGameFlowFutureTimeline } from "@/lib/athleteiq-gameflow";

export async function getGameFlowFutureTimeline(input: { matchId: string }) {
  return buildGameFlowFutureTimeline(input);
}
