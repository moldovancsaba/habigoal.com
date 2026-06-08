import { AthleteTwin } from "../../types/athlete-twin";

export function computeDevelopmentProgression(twin: AthleteTwin): { trait: string, trend: 'improving' | 'stable' | 'declining' }[] {
  console.log(`Analyzing longitudinal development for athlete ${twin.athleteId}`);

  const trends: { trait: string, trend: 'improving' | 'stable' | 'declining' }[] = [];

  // Mock linear regression analysis on rolling 90-day history
  const recentAcwr = twin.performance.acwr ?? 1.0;
  trends.push({
    trait: 'Training Tolerance',
    trend: recentAcwr > 1.2 ? 'declining' : (recentAcwr < 0.8 ? 'stable' : 'improving')
  });

  const sleepQuality = twin.recovery.sleepQualityScore7d ?? 70;
  trends.push({
    trait: 'Recovery Efficiency',
    trend: sleepQuality > 80 ? 'improving' : (sleepQuality < 60 ? 'declining' : 'stable')
  });

  return trends;
}
