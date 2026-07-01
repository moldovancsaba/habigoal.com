// Team readiness trend (#526 P1). Aggregates each athlete's Daily IQ history
// across a team into a per-day team average, for the coach trends chart.
// Honest: days with no data are simply absent; nulls are excluded from averages.

import { listLatestDailyIqSnapshots } from "@/repositories/athleteiq-daily-iq.repository";

export type TrendPoint = { date: string; avgDailyIq: number; count: number };

type DatedScore = { localDate: string; dailyIqScore: number | null };

// Pure aggregator — exported for unit testing without a database.
export function aggregateTeamTrend(snapshots: DatedScore[]): TrendPoint[] {
  const byDate = new Map<string, number[]>();
  for (const snapshot of snapshots) {
    if (typeof snapshot.dailyIqScore !== "number") continue;
    const list = byDate.get(snapshot.localDate) ?? [];
    list.push(snapshot.dailyIqScore);
    byDate.set(snapshot.localDate, list);
  }
  return [...byDate.entries()]
    .map(([date, scores]) => ({
      date,
      avgDailyIq: Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10) / 10,
      count: scores.length,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getTeamReadinessTrend(input: {
  athleteIds: string[];
  from: string;
  to: string;
}): Promise<{ points: TrendPoint[]; athleteCount: number }> {
  const all: DatedScore[] = [];
  for (const athleteId of input.athleteIds) {
    const snapshots = await listLatestDailyIqSnapshots({ athleteId, from: input.from, to: input.to, mode: "performance" });
    for (const snapshot of snapshots) {
      all.push({ localDate: snapshot.localDate, dailyIqScore: snapshot.dailyIqScore });
    }
  }
  return { points: aggregateTeamTrend(all), athleteCount: input.athleteIds.length };
}
