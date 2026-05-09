export const APP_LAYOUT = {
  drawerWidth: 292
} as const;

export const SEMANTIC_TONES = [
  "ingress",
  "synthesis",
  "knowmore",
  "strategy",
  "checklist",
  "tactical",
  "review",
  "neutral"
] as const;

export type SemanticTone = (typeof SEMANTIC_TONES)[number];

export const DOMAIN_TONES = {
  movement: "ingress",
  social: "tactical",
  mental: "strategy"
} as const;
