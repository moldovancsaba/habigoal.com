import { getSemanticTone } from "@/theme/semantic-theme";
import { DOMAIN_TONES } from "@/theme/tokens";

export type AssessmentDomain = "movement" | "social" | "mental";

const DOMAIN_COLORS: Record<AssessmentDomain, string> = {
  movement: getSemanticTone(DOMAIN_TONES.movement).color,
  social: getSemanticTone(DOMAIN_TONES.social).color,
  mental: getSemanticTone(DOMAIN_TONES.mental).color
};

function withAlpha(hex: string, alpha: number) {
  const cleaned = hex.replace("#", "");
  const parsed = cleaned.length === 3
    ? cleaned.split("").map((v) => `${v}${v}`).join("")
    : cleaned;
  const r = Number.parseInt(parsed.slice(0, 2), 16);
  const g = Number.parseInt(parsed.slice(2, 4), 16);
  const b = Number.parseInt(parsed.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getDomainMainColor(domain: AssessmentDomain) {
  return DOMAIN_COLORS[domain];
}

export function getDomainChipStyles(domain: AssessmentDomain) {
  const baseColor = getDomainMainColor(domain);
  return {
    color: baseColor,
    borderColor: withAlpha(baseColor, 0.5),
    backgroundColor: withAlpha(baseColor, 0.12),
    label: {
      fontWeight: 600
    }
  };
}
