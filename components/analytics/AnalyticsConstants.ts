export const ANALYTICS_CONFIG = {
  chartHeight: 240,
  gaugeHeight: 180,
  tickFontSize: 12,
  lineStrokeWidth: 2.5,
  dotRadius: 4,
  activeDotRadius: 6,
  tooltipRadius: 8,
  radarOuterRadius: 75,
  fontFamily: 'var(--font-noto-sans), "Noto Sans", Helvetica, Arial, sans-serif',
  margins: { top: 10, right: 10, left: -20, bottom: 5 },
  colors: {
    primary: "var(--gds-vibe-accent, var(--accent-gold))",
    secondary: "var(--gds-vibe-primary, var(--accent-gold))",
    grid: "var(--border-primary)",
    text: "var(--text-primary)",
    dimmed: "var(--text-secondary)",
    success: "var(--status-success)",
    warning: "var(--status-warning)",
    error: "var(--status-error)"
  }
} as const;
