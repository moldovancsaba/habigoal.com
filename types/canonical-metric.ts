export type MetricUnit =
  | 'score_0_100'
  | 'score_1_5'
  | 'score_1_10'
  | 'bpm'
  | 'ms'
  | 'minutes'
  | 'meters'
  | 'centimeters'
  | 'km_per_hour'
  | 'watts'
  | 'newtons'
  | 'percentage'
  | 'boolean'
  | 'count'
  | 'rpe_1_10';

export type MetricSource =
  | 'check_in'
  | 'oura'
  | 'whoop'
  | 'garmin'
  | 'polar'
  | 'fitbit'
  | 'apple_health'
  | 'google_health'
  | 'catapult'
  | 'statsports'
  | 'blazepod'
  | 'fitlight'
  | 'vald'
  | 'hawkin'
  | 'manual_coach'
  | 'ai_inference';

export type CanonicalMetricKey =
  | 'sleep_quality_score'
  | 'sleep_duration_minutes'
  | 'sleep_efficiency_percentage'
  | 'hrv_rmssd_ms'
  | 'resting_heart_rate_bpm'
  | 'mood_score'
  | 'energy_score'
  | 'stress_score'
  | 'soreness_score'
  | 'training_completion_percentage'
  | 'session_rpe'
  | 'session_duration_minutes'
  | 'internal_load_points'
  | 'external_load_points'
  | 'high_speed_distance_meters'
  | 'total_distance_meters'
  | 'sprint_count'
  | 'acceleration_count'
  | 'jump_height_cm'
  | 'peak_force_newtons'
  | 'left_right_asymmetry_percentage'
  | 'reaction_time_ms'
  | 'sprint_5m_ms'
  | 'sprint_10m_ms'
  | 'sprint_20m_ms'
  | 'sprint_30m_ms';

export type ProcessingState = 'raw' | 'normalised' | 'scored' | 'failed';

export interface CanonicalMetric {
  _id?: string;
  metricId: string;               // deterministic: athleteId+date+source+key
  athleteId: string;
  organisationId: string;
  source: MetricSource;
  sourceMetric: string;
  canonicalKey: CanonicalMetricKey;
  value: number;
  unit: MetricUnit;
  confidence: 'high' | 'medium' | 'low' | 'unknown';
  periodStart: string;
  periodEnd: string;
  date: string;
  rawPayloadId?: string;
  normalisedAt: string;
  normalisationVersion: string;
  processingState: ProcessingState;
  processingError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RawPayload {
  _id?: string;
  payloadId: string;
  athleteId: string;
  source: MetricSource;
  receivedAt: string;
  payload: Record<string, unknown>;
  normalised: boolean;
  normalisedAt?: string;
}
