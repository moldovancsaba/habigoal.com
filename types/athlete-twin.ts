export interface TwinDimensionSnapshot {
  updatedAt: string;
  sources: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface RecoveryDimension extends TwinDimensionSnapshot {
  sleepQualityScore7d?: number;
  sleepDurationMin7d?: number;
  moodScore7d?: number;
  stressScore7d?: number;
  sorenessScore7d?: number;
  energyScore7d?: number;
  recoveryReadinessScore?: number;
}

export interface PerformanceDimension extends TwinDimensionSnapshot {
  internalLoadPoints7d?: number;
  externalLoadPoints7d?: number;
  acuteLoad7d?: number;
  chronicLoad28d?: number;
  acwr?: number;
  sprint5mMs?: number;
  sprint10mMs?: number;
  sprint20mMs?: number;
}

export interface PhysicalDimension extends TwinDimensionSnapshot {
  restingHeartRateBpm?: number;
  hrvRmssdMs?: number;
  peakForceNewtons?: number;
  jumpHeightCm?: number;
  leftRightAsymmetryPct?: number;
}

export interface TechnicalDimension extends TwinDimensionSnapshot {
  sprintMechanicsScore?: number;
  runningFormScore?: number;
  jumpTechniqueScore?: number;
  kickingMechanicsScore?: number;
  movementSymmetryIndex?: number;
  coachTechRating?: number;
}

export interface CognitiveDimension extends TwinDimensionSnapshot {
  moodTrend7d?: number;
  stressTrend7d?: number;
  reactionTimeMs?: number;
  decisionSpeedScore?: number;
}

export interface TwinHistoryEntry {
  date: string;
  dimension: 'physical' | 'performance' | 'technical' | 'recovery' | 'cognitive';
  snapshot: Record<string, number | undefined>;
}

export interface AthleteTwin {
  _id?: string;
  athleteId: string;
  organisationId: string;
  twinVersion: number;
  schemaVersion: string;
  lastUpdatedAt: string;
  physical: PhysicalDimension;
  performance: PerformanceDimension;
  technical: TechnicalDimension;
  recovery: RecoveryDimension;
  cognitive: CognitiveDimension;
  history: TwinHistoryEntry[];   // capped at 90 entries
  createdAt: string;
  updatedAt: string;
}
