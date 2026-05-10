import type { SemanticTone } from "@/theme/tokens";

export type ThemeMode = "light" | "dark";

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

const FOUNDATIONS: Record<ThemeMode, ThemeFoundation> = {
  light: {
    appBg: "#E7EEF8",
    sidebarBg: "#F2F6FC",
    surfaceBase: "rgba(255, 255, 255, 0.84)",
    surfaceElevated: "rgba(244, 248, 253, 0.94)",
    borderPrimary: "rgba(44, 59, 87, 0.16)",
    textPrimary: "#10203A",
    textSecondary: "#4C5F81",
    textMuted: "#667085",
    overlayColor: "rgba(231, 238, 248, 0.86)",
    surfaceGradientTop: "rgba(255, 255, 255, 0.76)",
    surfaceGradientBottom: "rgba(255, 255, 255, 0.36)",
    surfaceHoverTop: "rgba(255, 255, 255, 0.92)",
    surfaceHoverBottom: "rgba(255, 255, 255, 0.52)",
    surfaceShadowElevated: "0 18px 50px rgba(0, 63, 206, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.88)",
    surfaceShadowFlat: "0 1px 0 rgba(255, 255, 255, 0.92) inset",
    surfaceIconBorder: "rgba(44, 59, 87, 0.14)",
    surfaceIconShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.82)",
    surfaceSectionBorder: "rgba(44, 59, 87, 0.1)",
    navCompanyLabel: "#003FCE",
    navCompanyDescription: "#4C5F81",
    navLinkActive: "#10203A",
    navLinkInactive: "#526585"
  },
  dark: {
    appBg: "#0A0F1C",
    sidebarBg: "#111827",
    surfaceBase: "rgba(24, 34, 53, 0.84)",
    surfaceElevated: "rgba(31, 43, 66, 0.94)",
    borderPrimary: "rgba(44, 59, 87, 0.96)",
    textPrimary: "#F4F7FB",
    textSecondary: "#A7B4CC",
    textMuted: "#667085",
    overlayColor: "rgba(10, 15, 28, 0.86)",
    surfaceGradientTop: "rgba(255, 255, 255, 0.08)",
    surfaceGradientBottom: "rgba(255, 255, 255, 0.02)",
    surfaceHoverTop: "rgba(255, 255, 255, 0.12)",
    surfaceHoverBottom: "rgba(255, 255, 255, 0.04)",
    surfaceShadowElevated: "0 24px 64px rgba(0, 0, 0, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
    surfaceShadowFlat: "0 1px 0 rgba(255, 255, 255, 0.06) inset",
    surfaceIconBorder: "rgba(44, 59, 87, 0.92)",
    surfaceIconShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
    surfaceSectionBorder: "rgba(44, 59, 87, 0.88)",
    navCompanyLabel: "#F4F7FB",
    navCompanyDescription: "#A7B4CC",
    navLinkActive: "#F4F7FB",
    navLinkInactive: "#A7B4CC"
  }
};

const TONES: Record<ThemeMode, Record<SemanticTone, SemanticToneScale>> = {
  light: {
    ingress: {
      color: "#003FCE",
      surface: "rgba(221, 234, 255, 0.82)",
      hoverSurface: "rgba(209, 227, 255, 0.92)",
      glow: "rgba(0, 63, 206, 0.16)",
      border: "rgba(0, 63, 206, 0.18)",
      rgb: "0, 63, 206",
      palette: ["#eef3ff", "#dfe9ff", "#c3d7ff", "#a0c0ff", "#79a7ff", "#528dff", "#2a6eff", "#003fce", "#0033a7", "#002573"]
    },
    synthesis: {
      color: "#00AEEF",
      surface: "rgba(228, 248, 255, 0.84)",
      hoverSurface: "rgba(213, 242, 255, 0.94)",
      glow: "rgba(0, 174, 239, 0.18)",
      border: "rgba(0, 174, 239, 0.18)",
      rgb: "0, 174, 239",
      palette: ["#edfbff", "#d6f6ff", "#b1edff", "#82e1ff", "#52d2ff", "#28c0fb", "#00aeef", "#0086c0", "#006592", "#004466"]
    },
    knowmore: {
      color: "#00B894",
      surface: "rgba(228, 250, 244, 0.84)",
      hoverSurface: "rgba(212, 246, 237, 0.94)",
      glow: "rgba(0, 184, 148, 0.16)",
      border: "rgba(0, 184, 148, 0.18)",
      rgb: "0, 184, 148",
      palette: ["#effcf8", "#daf8ef", "#b7f0de", "#82e5c7", "#4fd8ae", "#20c89f", "#00b894", "#009073", "#006b56", "#00483a"]
    },
    strategy: {
      color: "#C7F036",
      surface: "rgba(248, 253, 223, 0.88)",
      hoverSurface: "rgba(243, 250, 202, 0.96)",
      glow: "rgba(199, 240, 54, 0.18)",
      border: "rgba(199, 240, 54, 0.22)",
      rgb: "199, 240, 54",
      palette: ["#fdffe9", "#f7ffd2", "#eefcab", "#e1f87a", "#d4f44f", "#c7f036", "#a2c728", "#7c9a1d", "#586c14", "#37440b"]
    },
    checklist: {
      color: "#38BDF8",
      surface: "rgba(231, 248, 255, 0.84)",
      hoverSurface: "rgba(216, 243, 255, 0.94)",
      glow: "rgba(56, 189, 248, 0.18)",
      border: "rgba(56, 189, 248, 0.18)",
      rgb: "56, 189, 248",
      palette: ["#f0fbff", "#daf6ff", "#b7edff", "#8ce1ff", "#60d3ff", "#44c7fb", "#38bdf8", "#1596c9", "#0f7298", "#0a4d66"]
    },
    tactical: {
      color: "#22C55E",
      surface: "rgba(232, 251, 238, 0.84)",
      hoverSurface: "rgba(217, 247, 226, 0.94)",
      glow: "rgba(34, 197, 94, 0.16)",
      border: "rgba(34, 197, 94, 0.18)",
      rgb: "34, 197, 94",
      palette: ["#effdf4", "#dafae5", "#b9f3cb", "#8ceba9", "#5de282", "#36d267", "#22c55e", "#18994a", "#116f37", "#0b4924"]
    },
    review: {
      color: "#FFB000",
      surface: "rgba(255, 246, 223, 0.88)",
      hoverSurface: "rgba(255, 239, 201, 0.96)",
      glow: "rgba(255, 176, 0, 0.2)",
      border: "rgba(255, 176, 0, 0.22)",
      rgb: "255, 176, 0",
      palette: ["#fff9e8", "#fff0c9", "#ffe39c", "#ffd46b", "#ffc444", "#ffb820", "#ffb000", "#d98d00", "#a86a00", "#704500"]
    },
    neutral: {
      color: "#667085",
      surface: "rgba(244, 247, 251, 0.8)",
      hoverSurface: "rgba(235, 240, 246, 0.92)",
      glow: "rgba(102, 112, 133, 0.1)",
      border: "rgba(102, 112, 133, 0.14)",
      rgb: "102, 112, 133",
      palette: ["#fafbfc", "#f1f4f8", "#dde3ea", "#c7d0db", "#afb9c8", "#909cae", "#667085", "#4f596d", "#384152", "#232a38"]
    }
  },
  dark: {
    ingress: {
      color: "#00AEEF",
      surface: "rgba(6, 47, 86, 0.78)",
      hoverSurface: "rgba(9, 61, 108, 0.9)",
      glow: "rgba(0, 174, 239, 0.22)",
      border: "rgba(0, 174, 239, 0.24)",
      rgb: "0, 174, 239",
      palette: ["#ecfbff", "#d5f5ff", "#acecff", "#7fe0ff", "#55d2ff", "#2cc0fb", "#00aeef", "#008bc6", "#006997", "#004566"]
    },
    synthesis: {
      color: "#003FCE",
      surface: "rgba(9, 24, 73, 0.82)",
      hoverSurface: "rgba(12, 33, 96, 0.92)",
      glow: "rgba(0, 63, 206, 0.22)",
      border: "rgba(0, 63, 206, 0.24)",
      rgb: "0, 63, 206",
      palette: ["#eef3ff", "#dae4ff", "#b9ceff", "#95b6ff", "#6d9aff", "#4880ff", "#1d63f6", "#003fce", "#0032a2", "#00216d"]
    },
    knowmore: {
      color: "#00B894",
      surface: "rgba(7, 57, 50, 0.82)",
      hoverSurface: "rgba(10, 76, 67, 0.92)",
      glow: "rgba(0, 184, 148, 0.2)",
      border: "rgba(0, 184, 148, 0.24)",
      rgb: "0, 184, 148",
      palette: ["#ebfff9", "#cffcee", "#a6f6dc", "#72ebc5", "#44dfb0", "#19cf9f", "#00b894", "#009073", "#006958", "#004539"]
    },
    strategy: {
      color: "#C7F036",
      surface: "rgba(70, 84, 18, 0.84)",
      hoverSurface: "rgba(92, 111, 24, 0.94)",
      glow: "rgba(199, 240, 54, 0.22)",
      border: "rgba(199, 240, 54, 0.26)",
      rgb: "199, 240, 54",
      palette: ["#fdffe9", "#f4fdc3", "#e9f991", "#ddf563", "#d0f145", "#c7f036", "#a3c929", "#7f9c1f", "#586d15", "#35440b"]
    },
    checklist: {
      color: "#38BDF8",
      surface: "rgba(11, 58, 82, 0.82)",
      hoverSurface: "rgba(15, 77, 108, 0.92)",
      glow: "rgba(56, 189, 248, 0.22)",
      border: "rgba(56, 189, 248, 0.24)",
      rgb: "56, 189, 248",
      palette: ["#ecfbff", "#d3f5ff", "#a8ecff", "#7bdeff", "#53d0ff", "#40c7fb", "#38bdf8", "#1797c9", "#106f96", "#0a4961"]
    },
    tactical: {
      color: "#22C55E",
      surface: "rgba(13, 58, 31, 0.82)",
      hoverSurface: "rgba(18, 78, 41, 0.92)",
      glow: "rgba(34, 197, 94, 0.2)",
      border: "rgba(34, 197, 94, 0.24)",
      rgb: "34, 197, 94",
      palette: ["#effdf4", "#d4f9e1", "#abf0c0", "#7be59a", "#4fdc78", "#31d063", "#22c55e", "#179649", "#106c35", "#0a4621"]
    },
    review: {
      color: "#FFD54A",
      surface: "rgba(77, 58, 12, 0.84)",
      hoverSurface: "rgba(104, 78, 18, 0.94)",
      glow: "rgba(255, 213, 74, 0.22)",
      border: "rgba(255, 213, 74, 0.26)",
      rgb: "255, 213, 74",
      palette: ["#fffbea", "#fff3c5", "#ffe89a", "#ffdc6d", "#ffd24f", "#ffd54a", "#ffb000", "#d88f00", "#a86a00", "#6d4300"]
    },
    neutral: {
      color: "#A7B4CC",
      surface: "rgba(24, 34, 53, 0.82)",
      hoverSurface: "rgba(31, 43, 66, 0.94)",
      glow: "rgba(167, 180, 204, 0.1)",
      border: "rgba(167, 180, 204, 0.16)",
      rgb: "167, 180, 204",
      palette: ["#f4f7fb", "#e1e8f1", "#c9d3e1", "#aebbd0", "#95a5c0", "#7f90ae", "#667792", "#526177", "#3c4759", "#252d3a"]
    }
  }
};

export function getThemeFoundation(mode: ThemeMode) {
  return FOUNDATIONS[mode];
}

export function getSemanticTone(mode: ThemeMode, tone: SemanticTone) {
  return TONES[mode][tone];
}

export function getSemanticSurfaceCss(mode: ThemeMode, tone: SemanticTone, state: "base" | "hover" = "base") {
  const foundation = getThemeFoundation(mode);
  const semanticTone = getSemanticTone(mode, tone);

  if (state === "hover") {
    return {
      background: `linear-gradient(180deg, ${foundation.surfaceHoverTop}, ${foundation.surfaceHoverBottom}), ${semanticTone.hoverSurface}`,
      boxShadow: `0 0 0 1px rgba(${semanticTone.rgb}, 0.24), 0 18px 38px ${semanticTone.glow}`
    };
  }

  return {
    background: `linear-gradient(180deg, ${foundation.surfaceGradientTop}, ${foundation.surfaceGradientBottom}), ${semanticTone.surface}`,
    boxShadow: foundation.surfaceShadowElevated
  };
}

export function getNavStateCss(mode: ThemeMode, tone: SemanticTone, active: boolean) {
  const semanticTone = getSemanticTone(mode, tone);
  if (active) {
    return {
      background: `linear-gradient(90deg, rgba(${semanticTone.rgb}, 0.26), rgba(${semanticTone.rgb}, 0.08))`,
      borderLeft: `2px solid rgb(${semanticTone.rgb})`
    };
  }

  return {
    background: `linear-gradient(90deg, rgba(${semanticTone.rgb}, 0.12), rgba(${semanticTone.rgb}, 0.03))`,
    borderLeft: "2px solid transparent"
  };
}

export function resolveLegacyTone(input?: string | null): SemanticTone {
  const normalized = (input ?? "").trim().toLowerCase();
  const aliases: Record<string, SemanticTone> = {
    brand: "ingress",
    blue: "ingress",
    indigo: "synthesis",
    teal: "knowmore",
    green: "tactical",
    knowledge: "knowmore",
    purple: "synthesis",
    violet: "synthesis",
    cyan: "checklist",
    execution: "checklist",
    orange: "review",
    amber: "review",
    lime: "strategy",
    yellow: "review",
    gray: "neutral",
    grey: "neutral",
    dark: "neutral",
    red: "neutral"
  };

  return (aliases[normalized] ?? normalized) as SemanticTone;
}
