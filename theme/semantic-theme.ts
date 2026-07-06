import type { SemanticTone } from "@/theme/tokens";

type SemanticToneScale = {
  color: string;
  surface: string;
  hoverSurface: string;
  glow: string;
  border: string;
  rgb: string;
  palette: [string, string, string, string, string, string, string, string, string, string];
};

type ThemeFoundation = {
  appBg: string;
  sidebarBg: string;
  surfaceBase: string;
  surfaceElevated: string;
  borderPrimary: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  overlayColor: string;
  surfaceGradientTop: string;
  surfaceGradientBottom: string;
  surfaceHoverTop: string;
  surfaceHoverBottom: string;
  surfaceShadowElevated: string;
  surfaceShadowFlat: string;
  surfaceIconBorder: string;
  surfaceIconShadow: string;
  surfaceSectionBorder: string;
  navCompanyLabel: string;
  navCompanyDescription: string;
  navLinkActive: string;
  navLinkInactive: string;
};

// Habigoal is dark-only. This is the single theme foundation; there is no
// light variant and no mode axis anywhere in the app.
const FOUNDATION: ThemeFoundation = {
  appBg: "#03080F",
  sidebarBg: "rgba(5, 11, 20, 0.92)",
  surfaceBase: "rgba(21, 24, 31, 0.88)",
  surfaceElevated: "rgba(5, 11, 20, 0.92)",
  borderPrimary: "rgba(240, 182, 66, 0.38)",
  textPrimary: "#FFF9E8",
  textSecondary: "#D8C8A8",
  textMuted: "rgba(216, 200, 168, 0.68)",
  overlayColor: "rgba(3, 8, 15, 0.88)",
  surfaceGradientTop: "rgba(255, 215, 106, 0.06)",
  surfaceGradientBottom: "transparent",
  surfaceHoverTop: "rgba(255, 215, 106, 0.1)",
  surfaceHoverBottom: "transparent",
  surfaceShadowElevated: "0 24px 64px rgba(0, 0, 0, 0.52), inset 0 1px 0 rgba(255, 215, 106, 0.06)",
  surfaceShadowFlat: "0 1px 0 rgba(255, 215, 106, 0.06) inset",
  surfaceIconBorder: "rgba(240, 182, 66, 0.38)",
  surfaceIconShadow: "inset 0 1px 0 rgba(255, 215, 106, 0.06)",
  surfaceSectionBorder: "rgba(240, 182, 66, 0.28)",
  navCompanyLabel: "#FFF9E8",
  navCompanyDescription: "#D8C8A8",
  navLinkActive: "#FFF9E8",
  navLinkInactive: "#D8C8A8"
};

export const ATHLETE_GOLD_GDS_VIBE_VARIABLES: Record<string, string> = {
  "--gds-vibe-primary": "#e4a623",
  "--gds-vibe-accent": "#ffd76a",
  "--gds-vibe-glow": "rgba(228, 166, 35, 0.34)",
  "--gds-vibe-canvas": "#03080f",
  "--gds-vibe-shell": "rgba(5, 11, 20, 0.92)",
  "--gds-vibe-surface": "rgba(21, 24, 31, 0.88)",
  "--gds-vibe-border": "rgba(240, 182, 66, 0.38)",
  "--gds-vibe-text": "#fff9e8",
  "--gds-vibe-muted": "#d8c8a8",
  "--gds-vibe-focus": "#fff9e8",
  "--gds-vibe-gradient": "radial-gradient(circle at 12% 8%, rgba(255, 215, 106, 0.28), transparent 24%), radial-gradient(circle at 86% 18%, rgba(240, 182, 66, 0.18), transparent 30%), linear-gradient(135deg, #03080f 0%, #070d17 48%, #0b101a 100%)",
  "--gds-vibe-hero": "linear-gradient(135deg, rgba(255, 215, 106, 0.34), rgba(240, 182, 66, 0.24), rgba(5, 11, 20, 0.92))"
};

const ATHLETE_GOLD_TONE: SemanticToneScale = {
  color: "#FFD76A",
  surface: "rgba(77, 58, 12, 0.84)",
  hoverSurface: "rgba(104, 78, 18, 0.94)",
  glow: "rgba(228, 166, 35, 0.34)",
  border: "rgba(240, 182, 66, 0.38)",
  rgb: "255, 215, 106",
  palette: ["#fff9e8", "#fff3c5", "#ffe89a", "#ffdc6d", "#ffd76a", "#e4a623", "#c88b17", "#9d6b0d", "#6d4708", "#3a2504"]
};

const ATHLETE_GOLD_NEUTRAL_TONE: SemanticToneScale = {
  color: "#D8C8A8",
  surface: "rgba(21, 24, 31, 0.88)",
  hoverSurface: "rgba(30, 32, 39, 0.94)",
  glow: "rgba(216, 200, 168, 0.1)",
  border: "rgba(240, 182, 66, 0.2)",
  rgb: "216, 200, 168",
  palette: ["#fff9e8", "#efe2c4", "#d8c8a8", "#b9a780", "#8f7e5d", "#6d6047", "#4b4334", "#332d23", "#211d17", "#11100d"]
};

const TONES: Record<SemanticTone, SemanticToneScale> = {
  checklist: ATHLETE_GOLD_TONE,
  ingress: ATHLETE_GOLD_TONE,
  knowmore: ATHLETE_GOLD_TONE,
  neutral: ATHLETE_GOLD_NEUTRAL_TONE,
  review: ATHLETE_GOLD_TONE,
  strategy: ATHLETE_GOLD_TONE,
  synthesis: ATHLETE_GOLD_TONE,
  tactical: ATHLETE_GOLD_TONE
};

export function getThemeFoundation() {
  return FOUNDATION;
}

export function getSemanticTone(tone: SemanticTone) {
  return TONES[tone];
}
