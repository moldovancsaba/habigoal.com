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
    primary: "var(--mantine-color-kidex-6)",
    grid: "var(--mantine-color-gray-4)",
    text: "var(--mantine-color-text)",
    dimmed: "var(--mantine-color-gray-6)",
    success: "#40C057",
    warning: "#FAB005",
    error: "#FA5252"
  }
} as const;
