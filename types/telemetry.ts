// Privacy-safe product telemetry (#88). Events carry only non-PII scalar props.
export type TelemetryProps = Record<string, string | number | boolean>;

export interface TelemetryEvent {
  /** Dotted event name, e.g. "jobs.drain", "checkin.saved". */
  event: string;
  /** Correlates with structured logs; not PII. */
  correlationId?: string;
  /** ISO timestamp. */
  occurredAt: string;
  /** Sanitised, non-PII scalar properties only. */
  props: TelemetryProps;
}
