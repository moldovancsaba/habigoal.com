import { alpha, type Theme } from "@mui/material/styles";

export type AssessmentDomain = "movement" | "social" | "mental";

type DomainPaletteKey = "info" | "primary" | "warning";

const DOMAIN_PALETTE_KEY: Record<AssessmentDomain, DomainPaletteKey> = {
  movement: "info",
  social: "primary",
  mental: "warning"
};

export function getDomainMainColor(theme: Theme, domain: AssessmentDomain) {
  return theme.palette[DOMAIN_PALETTE_KEY[domain]].main;
}

export function getDomainChipSx(theme: Theme, domain: AssessmentDomain) {
  const baseColor = getDomainMainColor(theme, domain);
  return {
    color: baseColor,
    borderColor: alpha(baseColor, 0.5),
    backgroundColor: alpha(baseColor, 0.12),
    "& .MuiChip-label": {
      fontWeight: 600
    }
  };
}
