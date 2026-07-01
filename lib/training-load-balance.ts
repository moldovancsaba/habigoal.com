// Weekly training-load balance + overload conflict detection (#527 P2).
// Pure aggregation over planned sessions so a coach can see load distribution
// across the week and get flagged when a day is overloaded or two hard days
// land back-to-back. Honest: only planned load points are summed; nothing is
// inferred beyond the given sessions.

export interface PlannedSessionLike {
  date: string; // YYYY-MM-DD
  plannedLoadPoints?: number;
}

export interface DayLoad {
  date: string;
  totalLoad: number;
  sessionCount: number;
  overloaded: boolean;
}

export type LoadConflict =
  | { date: string; type: "overload"; load: number }
  | { date: string; type: "consecutive_high"; load: number; previousDate: string };

export interface WeeklyLoadBalance {
  byDay: DayLoad[];
  weekTotal: number;
  peakDayLoad: number;
  conflicts: LoadConflict[];
}

// Default per-day overload ceiling (planned load points). Coaches can override.
export const DEFAULT_OVERLOAD_THRESHOLD = 700;

function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);
}

export function analyzeWeeklyLoad(
  sessions: PlannedSessionLike[],
  overloadThreshold: number = DEFAULT_OVERLOAD_THRESHOLD
): WeeklyLoadBalance {
  const byDate = new Map<string, { total: number; count: number }>();
  for (const session of sessions) {
    if (!session.date) continue;
    const entry = byDate.get(session.date) ?? { total: 0, count: 0 };
    entry.total += typeof session.plannedLoadPoints === "number" ? session.plannedLoadPoints : 0;
    entry.count += 1;
    byDate.set(session.date, entry);
  }

  const byDay: DayLoad[] = [...byDate.entries()]
    .map(([date, { total, count }]) => ({
      date,
      totalLoad: total,
      sessionCount: count,
      overloaded: total > overloadThreshold,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const conflicts: LoadConflict[] = [];
  for (let i = 0; i < byDay.length; i++) {
    const day = byDay[i];
    if (day.overloaded) conflicts.push({ date: day.date, type: "overload", load: day.totalLoad });
    if (i > 0) {
      const prev = byDay[i - 1];
      if (day.overloaded && prev.overloaded && dayDiff(day.date, prev.date) === 1) {
        conflicts.push({ date: day.date, type: "consecutive_high", load: day.totalLoad, previousDate: prev.date });
      }
    }
  }

  return {
    byDay,
    weekTotal: byDay.reduce((sum, d) => sum + d.totalLoad, 0),
    peakDayLoad: byDay.reduce((max, d) => Math.max(max, d.totalLoad), 0),
    conflicts,
  };
}
