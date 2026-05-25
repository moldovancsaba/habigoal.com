import type { AthleteProfile } from "@/types/athlete";
import type { CheckInRecord } from "@/types/check-in";
import type { DailyOperatingMetrics } from "@/types/operating-score";

export interface AthleteHistoryPayload {
  child: AthleteProfile;
  assessments: CheckInRecord[];
  dailyOperatingMetrics: DailyOperatingMetrics[];
}
