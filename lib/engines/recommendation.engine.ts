import { AthleteTwin } from "../../types/athlete-twin";
import { ReadinessResult } from "../../types/ai-engine";

export function generateCoachingRecommendation(twin: AthleteTwin, readiness: ReadinessResult): string {
  console.log(`Generating LLM-driven action plan for athlete ${twin.athleteId}`);

  if (readiness.zone === 'peak') {
    return "Athlete is showing exceptional recovery and optimal load. Green light for high-intensity skill work and maximal sprint exposure.";
  } else if (readiness.zone === 'good') {
    return "Athlete is in a good readiness state. Proceed with the planned session, but monitor RPE closely towards the end of the block.";
  } else if (readiness.zone === 'moderate') {
    return "Athlete is carrying moderate fatigue. Consider reducing volume by 15-20% and avoiding maximal eccentric loads today.";
  } else if (readiness.zone === 'fatigued') {
    return "Athlete is showing elevated stress and declining sleep quality. Prioritize active recovery and tactical walkthroughs over physical exertion.";
  } else {
    return "Athlete is in a compromised state. Mandatory rest day recommended to allow central nervous system recovery.";
  }
}
